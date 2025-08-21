import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

// POST /api/handoffs - Create service handoff from completed sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      quote_id, 
      customer_info, 
      project_details, 
      scheduled_date, 
      special_instructions 
    } = body;

    if (!quote_id || !customer_info) {
      return NextResponse.json(
        { success: false, error: 'Quote ID and customer info required' },
        { status: 400 }
      );
    }

    const db = getPool();

    // Start transaction for atomic handoff
    await db.query('BEGIN');

    try {
      // 1. Get quote details
      const quoteQuery = `
        SELECT q.*, qi.* 
        FROM quotes q
        LEFT JOIN quote_items qi ON q.id = qi.quote_id
        WHERE q.id = $1 AND q.status = 'accepted'
      `;
      const quoteResult = await db.query(quoteQuery, [quote_id]);
      
      if (quoteResult.rows.length === 0) {
        throw new Error('Quote not found or not accepted');
      }

      const quote = quoteResult.rows[0];
      const quoteItems = quoteResult.rows;

      // 2. Create service request for post-installation support
      const serviceRequestQuery = `
        INSERT INTO service_requests (
          customer_id,
          request_type,
          urgency_level,
          title,
          description,
          status,
          source,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const serviceRequestId = await db.query(serviceRequestQuery, [
        customer_info.customer_id || null,
        'installation',
        'medium',
        `Installation Service - ${quote.title || 'Heat Pump System'}`,
        `Service support for installation project. Quote #${quote_id}\n\nProject Details:\n${project_details || 'Standard installation'}\n\nSpecial Instructions:\n${special_instructions || 'None'}`,
        'scheduled',
        'sales_handoff',
        JSON.stringify({
          quote_id,
          handoff_date: new Date().toISOString(),
          original_sale_amount: quote.total_amount,
          equipment_list: quoteItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            model: item.model_number
          }))
        })
      ]);

      // 3. Convert to job using existing function
      const jobQuery = `
        SELECT convert_service_request_to_job(
          $1::UUID, 
          $2::DATE, 
          $3::INTEGER, 
          'medium'
        ) as job_id
      `;
      
      const estimatedDuration = calculateInstallationDuration(quoteItems);
      const jobResult = await db.query(jobQuery, [
        serviceRequestId.rows[0].id,
        scheduled_date || null,
        estimatedDuration
      ]);

      const jobId = jobResult.rows[0].job_id;

      // 4. Create sales handoff record
      const handoffQuery = `
        INSERT INTO sales_handoffs (
          quote_id,
          service_request_id,
          job_id,
          sales_rep_id,
          customer_data,
          project_specifications,
          handoff_status,
          scheduled_date,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `;

      const handoffResult = await db.query(handoffQuery, [
        quote_id,
        serviceRequestId.rows[0].id,
        jobId,
        quote.sales_rep_id,
        JSON.stringify(customer_info),
        JSON.stringify({
          items: quoteItems,
          special_instructions,
          estimated_duration: estimatedDuration,
          complexity_score: calculateComplexityScore(quoteItems)
        }),
        'pending_assignment',
        scheduled_date || null
      ]);

      // 5. Update quote status
      await db.query(
        'UPDATE quotes SET status = $1, handoff_date = NOW() WHERE id = $2',
        ['handed_off', quote_id]
      );

      // 6. Log business activity
      await db.query(`
        INSERT INTO business_activities (type, description, related_id, related_type, data)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'sales_handoff_created',
        `Quote ${quote_id} handed off to operations team`,
        jobId,
        'job',
        JSON.stringify({
          handoff_id: handoffResult.rows[0].id,
          customer: customer_info.name,
          total_value: quote.total_amount
        })
      ]);

      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          handoff_id: handoffResult.rows[0].id,
          service_request_id: serviceRequestId.rows[0].id,
          job_id: jobId,
          message: 'Sales handoff created successfully',
          next_steps: [
            'Job has been created and is pending technician assignment',
            'Customer will receive installation scheduling notification',
            'Service request is available for tracking in service portal'
          ]
        }
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      // Pool connections are managed automatically
    }

  } catch (error) {
    console.error('Sales handoff error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create sales handoff' 
      },
      { status: 500 }
    );
  }
}

// GET /api/handoffs - List sales handoffs with status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getPool();

    let query = `
      SELECT 
        sh.*,
        q.title as quote_title,
        q.total_amount,
        j.status as job_status,
        j.scheduled_date,
        sr.status as service_status,
        u.first_name || ' ' || u.last_name as sales_rep_name
      FROM sales_handoffs sh
      LEFT JOIN quotes q ON sh.quote_id = q.id
      LEFT JOIN jobs j ON sh.job_id = j.id
      LEFT JOIN service_requests sr ON sh.service_request_id = sr.id
      LEFT JOIN users u ON sh.sales_rep_id = u.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push(`sh.handoff_status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY sh.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    // Pool connections are managed automatically

    return NextResponse.json({
      success: true,
      data: {
        handoffs: result.rows,
        pagination: {
          limit,
          offset,
          total: result.rows.length
        }
      }
    });

  } catch (error) {
    console.error('Get handoffs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales handoffs' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateInstallationDuration(quoteItems: any[]): number {
  let baseDuration = 4; // 4 hours minimum
  
  for (const item of quoteItems) {
    if (item.category === 'heat_pump') {
      baseDuration += 6; // 6 hours per heat pump unit
    } else if (item.category === 'ductwork') {
      baseDuration += 4; // 4 hours for ductwork modifications
    } else if (item.category === 'electrical') {
      baseDuration += 2; // 2 hours for electrical work
    }
  }
  
  return Math.min(baseDuration, 16); // Cap at 16 hours (2 days)
}

function calculateComplexityScore(quoteItems: any[]): number {
  let score = 1.0;
  
  for (const item of quoteItems) {
    if (item.complexity_factor) {
      score *= parseFloat(item.complexity_factor);
    }
  }
  
  return Math.round(score * 10) / 10; // Round to 1 decimal place
}