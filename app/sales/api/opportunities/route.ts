import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Query real database for opportunities with customer info
    const result = await query(`
      SELECT 
        o.id,
        o.lead_number,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        CONCAT(c.address, ', ', c.city, ', ', c.state) as address,
        o.status,
        o.stage,
        o.value,
        o.probability,
        o.created_at,
        o.updated_at,
        o.assigned_to,
        o.last_contact,
        o.next_follow_up,
        o.source,
        c.customer_type,
        c.email as customer_email,
        c.phone as customer_phone
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
    `);

    // Format the opportunities with tags based on data
    const opportunities = result.rows.map(opp => ({
      ...opp,
      value: parseFloat(opp.value),
      tags: [
        'heat-pump',
        opp.customer_type === 'commercial' ? 'commercial' : 'residential',
        opp.probability >= 75 ? 'hot-lead' : opp.probability >= 50 ? 'warm-lead' : 'cold-lead'
      ]
    }));

    return NextResponse.json({
      success: true,
      data: {
        opportunities,
        total: opportunities.length,
        page: 1,
        pageSize: 20
      }
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Failed to fetch opportunities' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate new opportunity ID and lead number
    const opportunityId = `opp-${Date.now()}`;
    const leadNumber = `LEAD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    // Insert into database
    const result = await query(
      `INSERT INTO opportunities (
        id, customer_id, lead_number, status, stage, source, value, 
        probability, expected_close_date, assigned_to, last_contact, 
        next_follow_up, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        opportunityId,
        body.customer_id,
        leadNumber,
        body.status || 'new',
        body.stage || 'discovery',
        body.source || 'Website',
        body.value || 0,
        body.probability || 50,
        body.expected_close_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        body.assigned_to || 'Sarah Johnson',
        new Date(),
        body.next_follow_up || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        body.notes || ''
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'CREATE_ERROR', 
          message: 'Failed to create opportunity' 
        } 
      },
      { status: 500 }
    );
  }
}