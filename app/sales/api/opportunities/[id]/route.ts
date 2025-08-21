import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Query opportunity with customer and estimate info
    const opportunityResult = await query(
      `SELECT 
        o.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        CONCAT(c.address, ', ', c.city, ', ', c.state, ' ', c.zip_code) as customer_address,
        c.customer_type,
        c.notes as customer_notes
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1`,
      [id]
    );

    if (opportunityResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Opportunity not found' 
          } 
        },
        { status: 404 }
      );
    }

    const opportunity = opportunityResult.rows[0];
    
    // Get related estimates
    const estimatesResult = await query(
      `SELECT * FROM estimates WHERE opportunity_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    
    // Get related quotes
    const quotesResult = await query(
      `SELECT id, quote_number, quote_name, status, total_selling_price, 
              total_margin, margin_percentage, valid_until, created_at 
       FROM quotes WHERE opportunity_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    
    // Format opportunity with estimates and quote
    const formattedOpportunity = {
      ...opportunity,
      value: parseFloat(opportunity.value),
      estimates: estimatesResult.rows.map(est => ({
        ...est,
        total_equipment_cost: parseFloat(est.total_equipment_cost),
        total_labor_cost: parseFloat(est.total_labor_cost),
        total_material_cost: parseFloat(est.total_material_cost),
        total_cost: parseFloat(est.total_cost),
        margin_percentage: parseFloat(est.margin_percentage),
        final_price: parseFloat(est.final_price)
      })),
      quote_id: quotesResult.rows.length > 0 ? quotesResult.rows[0].id : null,
      tags: [
        'heat-pump',
        opportunity.customer_type === 'commercial' ? 'commercial' : 'residential',
        opportunity.probability >= 75 ? 'hot-lead' : opportunity.probability >= 50 ? 'warm-lead' : 'cold-lead'
      ]
    };

    return NextResponse.json({
      success: true,
      data: formattedOpportunity
    });
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Failed to fetch opportunity' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    Object.entries(body).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });
    
    // Add updated_at
    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date());
    paramIndex++;
    
    // Add ID for WHERE clause
    updateValues.push(id);
    
    const queryText = `
      UPDATE opportunities 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await query(queryText, updateValues);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Opportunity not found' 
          } 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Failed to update opportunity' 
        } 
      },
      { status: 500 }
    );
  }
}