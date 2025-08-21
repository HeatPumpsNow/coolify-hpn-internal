import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupBy = searchParams.get('groupBy');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    let query;
    
    if (groupBy === 'hierarchy') {
      // Return hierarchical structure
      query = `
        SELECT 
          cg.id as cost_group_id,
          cg.code as cost_group_code,
          cg.name as cost_group_name,
          cg.description as cost_group_description,
          cg.display_order as cost_group_order,
          cg.default_labor_percentage,
          cg.default_material_percentage,
          json_agg(
            json_build_object(
              'id', li.id,
              'item_code', li.item_code,
              'name', li.name,
              'description', li.description,
              'unit_of_measure', li.unit_of_measure,
              'default_quantity', li.default_quantity,
              'default_hours', li.default_hours,
              'default_labor_rate', li.default_labor_rate,
              'default_material_cost', li.default_material_cost,
              'is_required', li.is_required,
              'display_order', li.display_order
            ) ORDER BY li.display_order
          ) FILTER (WHERE li.id IS NOT NULL) as line_items
        FROM cost_groups cg
        LEFT JOIN line_items li ON li.cost_group_id = cg.id ${includeInactive ? '' : 'AND li.is_active = true'}
        WHERE ${includeInactive ? 'true' : 'cg.is_active = true'}
        GROUP BY cg.id, cg.code, cg.name, cg.description, cg.display_order, 
                 cg.default_labor_percentage, cg.default_material_percentage
        ORDER BY cg.display_order
      `;
    } else {
      // Return flat list
      query = `
        SELECT 
          li.*,
          cg.name as cost_group_name,
          cg.code as cost_group_code,
          COALESCE(li.labor_percentage, cg.default_labor_percentage) as effective_labor_percentage,
          COALESCE(li.material_percentage, cg.default_material_percentage) as effective_material_percentage
        FROM line_items li
        JOIN cost_groups cg ON li.cost_group_id = cg.id
        WHERE ${includeInactive ? 'true' : 'li.is_active = true AND cg.is_active = true'}
        ORDER BY cg.display_order, li.display_order
      `;
    }
    
    const result = await pool.query(query);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Line items fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch line items',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

// POST endpoint to add line items to an estimate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      estimate_id, 
      line_items = [],
      add_defaults = false 
    } = body;
    
    if (!estimate_id) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Estimate ID is required' }
        },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      if (add_defaults) {
        // Add all required line items
        const addDefaultsQuery = `
          SELECT add_default_line_items_to_estimate($1::VARCHAR(50), 'standard')
        `;
        const defaultResult = await client.query(addDefaultsQuery, [estimate_id]);
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          data: {
            items_added: defaultResult.rows[0].add_default_line_items_to_estimate,
            message: 'Default line items added successfully'
          }
        });
      } else {
        // Add specific line items
        let itemsAdded = 0;
        
        for (const item of line_items) {
          const insertQuery = `
            INSERT INTO estimate_line_items (
              estimate_id,
              cost_group_id,
              line_item_id,
              quantity,
              hours,
              labor_rate,
              material_cost,
              total_labor_cost,
              total_material_cost,
              notes,
              is_optional,
              display_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `;
          
          const values = [
            estimate_id,
            item.cost_group_id || null,
            item.line_item_id,
            item.quantity || 1,
            item.hours || null,
            item.labor_rate || null,
            item.material_cost || null,
            (item.hours || 0) * (item.labor_rate || 0),
            item.material_cost || 0,
            item.notes || null,
            item.is_optional || false,
            item.display_order || itemsAdded + 1
          ];
          
          await client.query(insertQuery, values);
          itemsAdded++;
        }
        
        // Update estimate totals
        const updateTotalsQuery = `
          UPDATE estimates
          SET 
            total_equipment_cost = COALESCE((
              SELECT SUM(total_cost) 
              FROM estimate_line_items eli
              JOIN cost_codes cc ON eli.cost_code_id = cc.id
              WHERE eli.estimate_id = $1 
                AND cc.type = 'EQUIPMENT'
                AND eli.is_included = true
            ), 0),
            total_labor_cost = COALESCE((
              SELECT SUM(total_labor_cost)
              FROM estimate_line_items
              WHERE estimate_id = $1
                AND is_included = true
            ), 0),
            total_material_cost = COALESCE((
              SELECT SUM(total_material_cost)
              FROM estimate_line_items
              WHERE estimate_id = $1
                AND is_included = true
            ), 0),
            total_cost = COALESCE((
              SELECT SUM(total_cost)
              FROM estimate_line_items
              WHERE estimate_id = $1
                AND is_included = true
            ), 0),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        
        await client.query(updateTotalsQuery, [estimate_id]);
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          data: {
            items_added: itemsAdded,
            message: 'Line items added successfully'
          }
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Line items POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to add line items',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}