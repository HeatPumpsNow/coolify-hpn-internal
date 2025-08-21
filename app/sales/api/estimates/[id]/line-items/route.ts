import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const query = `
      SELECT 
        eli.*,
        cg.name as cost_group_name,
        cg.code as cost_group_code,
        cg.display_order as cost_group_order,
        li.name as line_item_name,
        li.item_code,
        li.unit_of_measure,
        li.description as line_item_description,
        cc.cost_code,
        cc.name as cost_code_name,
        cc.type as cost_code_type
      FROM estimate_line_items eli
      LEFT JOIN cost_groups cg ON eli.cost_group_id = cg.id
      LEFT JOIN line_items li ON eli.line_item_id = li.id
      LEFT JOIN cost_codes cc ON eli.cost_code_id = cc.id
      WHERE eli.estimate_id = $1
      ORDER BY COALESCE(eli.display_order, cg.display_order, 999), li.display_order
    `;
    
    const result = await pool.query(query, [id]);
    
    // Group by cost groups for hierarchical display
    const grouped = result.rows.reduce((acc, item) => {
      const groupKey = item.cost_group_code || 'OTHER';
      const groupName = item.cost_group_name || 'Other Items';
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          code: groupKey,
          name: groupName,
          display_order: item.cost_group_order || 999,
          items: [],
          total_labor: 0,
          total_material: 0,
          total_cost: 0
        };
      }
      
      acc[groupKey].items.push(item);
      acc[groupKey].total_labor += parseFloat(item.total_labor_cost || 0);
      acc[groupKey].total_material += parseFloat(item.total_material_cost || 0);
      acc[groupKey].total_cost += parseFloat(item.total_cost || 0);
      
      return acc;
    }, {} as Record<string, any>);
    
    // Convert to array and sort by display order
    const groupedArray = Object.values(grouped).sort((a: any, b: any) => 
      a.display_order - b.display_order
    );
    
    // Calculate totals
    const totals = {
      total_labor: groupedArray.reduce((sum, group: any) => sum + group.total_labor, 0),
      total_material: groupedArray.reduce((sum, group: any) => sum + group.total_material, 0),
      total_cost: groupedArray.reduce((sum, group: any) => sum + group.total_cost, 0)
    };
    
    return NextResponse.json({
      success: true,
      data: {
        estimate_id: id,
        groups: groupedArray,
        totals: totals,
        line_items: result.rows
      }
    });
  } catch (error) {
    console.error('Estimate line items fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch estimate line items',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a line item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimate_id } = await params;
    const body = await request.json();
    const { line_item_id, updates } = body;
    
    if (!line_item_id) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Line item ID is required' }
        },
        { status: 400 }
      );
    }
    
    const updateFields = [];
    const values = [];
    let valueIndex = 1;
    
    // Build dynamic update query
    if (updates.quantity !== undefined) {
      updateFields.push(`quantity = $${valueIndex++}`);
      values.push(updates.quantity);
    }
    if (updates.hours !== undefined) {
      updateFields.push(`hours = $${valueIndex++}`);
      values.push(updates.hours);
    }
    if (updates.labor_rate !== undefined) {
      updateFields.push(`labor_rate = $${valueIndex++}`);
      values.push(updates.labor_rate);
    }
    if (updates.material_cost !== undefined) {
      updateFields.push(`material_cost = $${valueIndex++}`);
      values.push(updates.material_cost);
    }
    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${valueIndex++}`);
      values.push(updates.notes);
    }
    if (updates.is_optional !== undefined) {
      updateFields.push(`is_optional = $${valueIndex++}`);
      values.push(updates.is_optional);
    }
    if (updates.is_included !== undefined) {
      updateFields.push(`is_included = $${valueIndex++}`);
      values.push(updates.is_included);
    }
    
    // Always recalculate totals if provided
    if (updates.total_labor_cost !== undefined) {
      updateFields.push(`total_labor_cost = $${valueIndex++}`);
      values.push(updates.total_labor_cost);
    } else if (updates.hours !== undefined || updates.labor_rate !== undefined) {
      // Auto-calculate if not provided but components changed
      updateFields.push(`total_labor_cost = COALESCE($${valueIndex}, hours) * COALESCE($${valueIndex + 1}, labor_rate)`);
      values.push(updates.hours !== undefined ? updates.hours : null);
      values.push(updates.labor_rate !== undefined ? updates.labor_rate : null);
      valueIndex += 2;
    }
    
    if (updates.total_material_cost !== undefined) {
      updateFields.push(`total_material_cost = $${valueIndex++}`);
      values.push(updates.total_material_cost);
    } else if (updates.material_cost !== undefined) {
      updateFields.push(`total_material_cost = $${valueIndex++}`);
      values.push(updates.material_cost);
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(line_item_id);
    values.push(estimate_id);
    
    const updateQuery = `
      UPDATE estimate_line_items
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex++}
        AND estimate_id = $${valueIndex++}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Line item not found' }
        },
        { status: 404 }
      );
    }
    
    // Update estimate totals
    const updateTotalsQuery = `
      UPDATE estimates
      SET 
        total_labor_cost = (
          SELECT COALESCE(SUM(total_labor_cost), 0)
          FROM estimate_line_items
          WHERE estimate_id = $1 AND is_included = true
        ),
        total_material_cost = (
          SELECT COALESCE(SUM(total_material_cost), 0)
          FROM estimate_line_items
          WHERE estimate_id = $1 AND is_included = true
        ),
        total_cost = (
          SELECT COALESCE(SUM(total_cost), 0)
          FROM estimate_line_items
          WHERE estimate_id = $1 AND is_included = true
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(updateTotalsQuery, [estimate_id]);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Line item update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to update line item',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a line item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimate_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const line_item_id = searchParams.get('line_item_id');
    
    if (!line_item_id) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Line item ID is required' }
        },
        { status: 400 }
      );
    }
    
    const deleteQuery = `
      DELETE FROM estimate_line_items
      WHERE id = $1 AND estimate_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [line_item_id, estimate_id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Line item not found' }
        },
        { status: 404 }
      );
    }
    
    // Update estimate totals
    const updateTotalsQuery = `
      UPDATE estimates
      SET 
        total_labor_cost = (
          SELECT COALESCE(SUM(total_labor_cost), 0)
          FROM estimate_line_items
          WHERE estimate_id = $1 AND is_included = true
        ),
        total_material_cost = (
          SELECT COALESCE(SUM(total_material_cost), 0)
          FROM estimate_line_items
          WHERE estimate_id = $1 AND is_included = true
        ),
        total_cost = (
          SELECT COALESCE(SUM(total_cost), 0)
          FROM estimate_line_items
          WHERE estimate_id = $1 AND is_included = true
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(updateTotalsQuery, [estimate_id]);
    
    return NextResponse.json({
      success: true,
      data: {
        deleted: result.rows[0],
        message: 'Line item deleted successfully'
      }
    });
  } catch (error) {
    console.error('Line item delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to delete line item',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}