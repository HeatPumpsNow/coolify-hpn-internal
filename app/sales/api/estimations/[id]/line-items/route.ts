import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';
import { z } from 'zod';

const createLineItemSchema = z.object({
  estimation_phase_id: z.string().uuid('Valid phase ID is required'),
  price_book_item_id: z.string().uuid().optional(),
  custom_item_name: z.string().min(1).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().min(0.001, 'Quantity must be positive'),
  unit_cost: z.number().min(0, 'Unit cost must be non-negative'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  custom_unit_price: z.number().min(0).optional(),
  labor_hours_per_unit: z.number().min(0).default(0),
  labor_rate: z.number().min(0).default(85),
  labor_complexity_factor: z.number().min(0.5).max(3.0).default(1.0),
  source_type: z.enum(['price_book', 'custom', 'template', 'flat_rate']).default('custom'),
  notes: z.string().optional()
}).refine(
  (data) => data.price_book_item_id || data.custom_item_name,
  {
    message: "Either price_book_item_id or custom_item_name is required",
    path: ["custom_item_name"]
  }
);

const updateLineItemSchema = z.object({
  quantity: z.number().min(0.001).optional(),
  unit_cost: z.number().min(0).optional(),
  unit_price: z.number().min(0).optional(),
  custom_unit_price: z.number().min(0).optional(),
  labor_hours_per_unit: z.number().min(0).optional(),
  labor_rate: z.number().min(0).optional(),
  labor_complexity_factor: z.number().min(0.5).max(3.0).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid estimation ID' } },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const phaseId = url.searchParams.get('phase_id');

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT id, sales_rep_id FROM estimation_projects WHERE id = $1
    `;
    const estimationResult = await query(estimationQuery, [id]);

    if (estimationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Estimation not found' } },
        { status: 404 }
      );
    }

    const estimation = estimationResult.rows[0];

    if (user.role === 'sales_rep' && estimation.sales_rep_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Build query based on whether phase_id is specified
    let lineItemsQuery;
    let queryParams;

    if (phaseId) {
      lineItemsQuery = `
        SELECT 
          eli.*,
          ep.phase_name, ep.phase_type,
          pbi.manufacturer, pbi.model, pbi.category as price_book_category
        FROM estimation_line_items eli
        JOIN estimation_phases ep ON eli.estimation_phase_id = ep.id
        LEFT JOIN price_book_items pbi ON eli.price_book_item_id = pbi.id
        WHERE eli.estimation_project_id = $1 AND eli.estimation_phase_id = $2
        ORDER BY eli.created_at
      `;
      queryParams = [id, phaseId];
    } else {
      lineItemsQuery = `
        SELECT 
          eli.*,
          ep.phase_name, ep.phase_type,
          pbi.manufacturer, pbi.model, pbi.category as price_book_category
        FROM estimation_line_items eli
        JOIN estimation_phases ep ON eli.estimation_phase_id = ep.id
        LEFT JOIN price_book_items pbi ON eli.price_book_item_id = pbi.id
        WHERE eli.estimation_project_id = $1
        ORDER BY ep.display_order, eli.created_at
      `;
      queryParams = [id];
    }

    const lineItemsResult = await query(lineItemsQuery, queryParams);

    return NextResponse.json({
      success: true,
      data: {
        line_items: lineItemsResult.rows
      },
    });

  } catch (error) {
    console.error('Line items fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid estimation ID' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const lineItemData = createLineItemSchema.parse(body);

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT id, sales_rep_id FROM estimation_projects WHERE id = $1
    `;
    const estimationResult = await query(estimationQuery, [id]);

    if (estimationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Estimation not found' } },
        { status: 404 }
      );
    }

    const estimation = estimationResult.rows[0];

    if (user.role === 'sales_rep' && estimation.sales_rep_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Verify phase belongs to this estimation
    const phaseQuery = `
      SELECT id, phase_name FROM estimation_phases 
      WHERE id = $1 AND estimation_project_id = $2 AND active = TRUE
    `;
    const phaseResult = await query(phaseQuery, [lineItemData.estimation_phase_id, id]);

    if (phaseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PHASE', message: 'Phase not found or inactive' } },
        { status: 400 }
      );
    }

    const phase = phaseResult.rows[0];

    // If using price book item, get its details
    let priceBookData = null;
    if (lineItemData.price_book_item_id) {
      const priceBookQuery = `
        SELECT * FROM price_book_items WHERE id = $1 AND 
        active_from <= CURRENT_TIMESTAMP AND 
        (active_to IS NULL OR active_to > CURRENT_TIMESTAMP)
      `;
      const priceBookResult = await query(priceBookQuery, [lineItemData.price_book_item_id]);
      
      if (priceBookResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_PRICE_BOOK_ITEM', message: 'Price book item not found or inactive' } },
          { status: 400 }
        );
      }

      priceBookData = priceBookResult.rows[0];
    }

    // Set defaults from price book item if available
    const finalData = {
      ...lineItemData,
      custom_item_name: lineItemData.custom_item_name || priceBookData?.description,
      sku: lineItemData.sku || priceBookData?.sku,
      description: lineItemData.description || priceBookData?.description,
      unit_cost: lineItemData.unit_cost !== undefined ? lineItemData.unit_cost : priceBookData?.cost || 0,
      unit_price: lineItemData.unit_price !== undefined ? lineItemData.unit_price : priceBookData?.current_price || 0,
      labor_hours_per_unit: lineItemData.labor_hours_per_unit !== undefined ? lineItemData.labor_hours_per_unit : priceBookData?.labor_hours_standard || 0
    };

    // Create line item
    const insertQuery = `
      INSERT INTO estimation_line_items (
        estimation_phase_id, estimation_project_id, price_book_item_id,
        custom_item_name, sku, description, quantity,
        unit_cost, unit_price, custom_unit_price,
        labor_hours_per_unit, labor_rate, labor_complexity_factor,
        source_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      finalData.estimation_phase_id,
      id,
      finalData.price_book_item_id || null,
      finalData.custom_item_name,
      finalData.sku,
      finalData.description,
      finalData.quantity,
      finalData.unit_cost,
      finalData.unit_price,
      finalData.custom_unit_price || null,
      finalData.labor_hours_per_unit,
      finalData.labor_rate,
      finalData.labor_complexity_factor,
      finalData.source_type,
      finalData.notes || null
    ]);

    const newLineItem = result.rows[0];

    // Record in history
    await query(`
      INSERT INTO estimation_calculation_history (
        estimation_project_id, user_id, change_type, change_description,
        calculation_snapshot, cost_delta
      ) VALUES ($1, $2, 'line_item_added', $3, $4, $5)
    `, [
      id,
      user.id,
      `Added line item: ${finalData.custom_item_name} to phase ${phase.phase_name}`,
      JSON.stringify({
        line_item_id: newLineItem.id,
        phase_name: phase.phase_name,
        item_name: finalData.custom_item_name,
        quantity: finalData.quantity,
        total_cost: newLineItem.line_total_cost
      }),
      newLineItem.line_total_cost
    ]);

    return NextResponse.json({
      success: true,
      data: {
        line_item: newLineItem,
        message: 'Line item created successfully'
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Line item creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid line item data',
            details: error.errors 
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid estimation ID' } },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const lineItemId = url.searchParams.get('line_item_id');

    if (!lineItemId || !/^[0-9a-f-]{36}$/i.test(lineItemId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_LINE_ITEM_ID', message: 'Valid line item ID is required' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = updateLineItemSchema.parse(body);

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT ep.id, ep.sales_rep_id, eli.id as line_item_id, eli.custom_item_name,
             eli.line_total_cost as current_cost, eph.phase_name
      FROM estimation_projects ep
      JOIN estimation_line_items eli ON ep.id = eli.estimation_project_id
      JOIN estimation_phases eph ON eli.estimation_phase_id = eph.id
      WHERE ep.id = $1 AND eli.id = $2
    `;
    const estimationResult = await query(estimationQuery, [id, lineItemId]);

    if (estimationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Estimation or line item not found' } },
        { status: 404 }
      );
    }

    const existing = estimationResult.rows[0];

    if (user.role === 'sales_rep' && existing.sales_rep_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    const allowedFields = [
      'quantity', 'unit_cost', 'unit_price', 'custom_unit_price',
      'labor_hours_per_unit', 'labor_rate', 'labor_complexity_factor',
      'notes', 'active'
    ];

    for (const field of allowedFields) {
      if ((updateData as any)[field] !== undefined) {
        paramCount++;
        updateFields.push(`${field} = $${paramCount}`);
        updateValues.push((updateData as any)[field]);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_CHANGES', message: 'No fields to update' } },
        { status: 400 }
      );
    }

    // Add updated_at
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date().toISOString());

    // Add ID for WHERE clause
    paramCount++;
    updateValues.push(lineItemId);

    const updateQuery = `
      UPDATE estimation_line_items 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedLineItem = result.rows[0];

    // Calculate cost delta
    const costDelta = updatedLineItem.line_total_cost - existing.current_cost;

    // Record change in history
    const changeDescription = [];
    for (const field of allowedFields) {
      if ((updateData as any)[field] !== undefined) {
        changeDescription.push(`${field}: ${(updateData as any)[field]}`);
      }
    }

    await query(`
      INSERT INTO estimation_calculation_history (
        estimation_project_id, user_id, change_type, change_description,
        calculation_snapshot, cost_delta
      ) VALUES ($1, $2, 'line_item_modified', $3, $4, $5)
    `, [
      id,
      user.id,
      `Modified line item: ${existing.custom_item_name} in phase ${existing.phase_name} (${changeDescription.join(', ')})`,
      JSON.stringify({
        line_item_id: lineItemId,
        changes: updateData,
        new_total_cost: updatedLineItem.line_total_cost
      }),
      costDelta
    ]);

    return NextResponse.json({
      success: true,
      data: {
        line_item: updatedLineItem,
        cost_delta: costDelta,
        message: 'Line item updated successfully'
      },
    });

  } catch (error) {
    console.error('Line item update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid update data',
            details: error.errors 
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}