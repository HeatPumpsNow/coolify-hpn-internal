import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Query estimate with customer info
    const estimateResult = await query(
      `SELECT 
        e.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.zip_code as customer_zip,
        o.lead_number,
        o.stage as opportunity_stage,
        o.assigned_to
      FROM estimates e
      LEFT JOIN customers c ON e.customer_id = c.id
      LEFT JOIN opportunities o ON e.opportunity_id = o.id
      WHERE e.id = $1`,
      [id]
    );

    if (estimateResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Estimate not found' 
          } 
        },
        { status: 404 }
      );
    }

    const estimate = estimateResult.rows[0];
    
    // Format estimate with proper types
    const formattedEstimate = {
      ...estimate,
      total_equipment_cost: parseFloat(estimate.total_equipment_cost),
      total_labor_cost: parseFloat(estimate.total_labor_cost),
      total_material_cost: parseFloat(estimate.total_material_cost),
      total_cost: parseFloat(estimate.total_cost),
      margin_percentage: parseFloat(estimate.margin_percentage),
      final_price: parseFloat(estimate.final_price)
    };

    return NextResponse.json({
      success: true,
      data: formattedEstimate
    });
  } catch (error) {
    console.error('Error fetching estimate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Failed to fetch estimate' 
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
    
    // Recalculate final price if margin changed
    if (body.margin_percentage !== undefined && body.total_cost !== undefined) {
      body.final_price = body.total_cost / (1 - body.margin_percentage / 100);
    }
    
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
      UPDATE estimates 
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
            message: 'Estimate not found' 
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
    console.error('Error updating estimate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Failed to update estimate' 
        } 
      },
      { status: 500 }
    );
  }
}