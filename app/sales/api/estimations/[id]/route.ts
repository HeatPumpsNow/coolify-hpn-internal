import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const updateEstimationSchema = z.object({
  project_name: z.string().min(1).optional(),
  customer_requirements: z.record(z.any()).optional(),
  site_conditions: z.record(z.any()).optional(),
  overhead_percentage: z.number().min(0).max(50).optional(),
  target_margin_percentage: z.number().min(0).max(100).optional(),
  risk_buffer_percentage: z.number().min(0).max(25).optional(),
  status: z.enum(['draft', 'in_progress', 'under_review', 'approved', 'converted_to_quote', 'archived']).optional()
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

    // Get estimation project with related data
    const estimationQuery = `
      SELECT 
        ep.*,
        sl.customer_info, sl.lead_number,
        sr.first_name as rep_first_name, sr.last_name as rep_last_name,
        sr.email as rep_email
      FROM estimation_projects ep
      LEFT JOIN sales_leads sl ON ep.lead_id = sl.id
      LEFT JOIN sales_reps sr ON ep.sales_rep_id = sr.id
      WHERE ep.id = $1
    `;

    const estimationResult = await query(estimationQuery, [id]);

    if (estimationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Estimation not found' } },
        { status: 404 }
      );
    }

    const estimation = estimationResult.rows[0];

    // Check access permissions
    if (user.role === 'sales_rep' && estimation.sales_rep_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Get phases with line items
    const phasesQuery = `
      SELECT 
        ep.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', eli.id,
              'price_book_item_id', eli.price_book_item_id,
              'custom_item_name', eli.custom_item_name,
              'sku', eli.sku,
              'description', eli.description,
              'quantity', eli.quantity,
              'unit_cost', eli.unit_cost,
              'unit_price', eli.unit_price,
              'custom_unit_price', eli.custom_unit_price,
              'labor_hours_per_unit', eli.labor_hours_per_unit,
              'labor_rate', eli.labor_rate,
              'labor_complexity_factor', eli.labor_complexity_factor,
              'line_equipment_cost', eli.line_equipment_cost,
              'line_labor_cost', eli.line_labor_cost,
              'line_total_cost', eli.line_total_cost,
              'source_type', eli.source_type,
              'template_source', eli.template_source,
              'flat_rate_applied', eli.flat_rate_applied,
              'notes', eli.notes,
              'active', eli.active,
              'created_at', eli.created_at,
              'updated_at', eli.updated_at
            ) ORDER BY eli.created_at
          ) FILTER (WHERE eli.id IS NOT NULL), 
          '[]'
        ) as line_items
      FROM estimation_phases ep
      LEFT JOIN estimation_line_items eli ON ep.id = eli.estimation_phase_id AND eli.active = TRUE
      WHERE ep.estimation_project_id = $1 AND ep.active = TRUE
      GROUP BY ep.id
      ORDER BY ep.display_order, ep.created_at
    `;

    const phasesResult = await query(phasesQuery, [id]);

    // Get recent calculation history
    const historyQuery = `
      SELECT 
        ech.id, ech.change_timestamp, ech.user_id, ech.change_type, ech.change_description,
        ech.margin_at_time, ech.total_cost_at_time, ech.cost_delta, ech.margin_delta,
        sr.first_name as user_first_name, sr.last_name as user_last_name
      FROM estimation_calculation_history ech
      LEFT JOIN sales_reps sr ON ech.user_id = sr.id
      WHERE ech.estimation_project_id = $1
      ORDER BY ech.change_timestamp DESC
      LIMIT 10
    `;

    const historyResult = await query(historyQuery, [id]);

    // Calculate margin status
    const marginStatus = estimation.calculated_margin_percentage >= 35 ? 'good' : 
                        estimation.calculated_margin_percentage >= 25 ? 'acceptable' : 
                        estimation.calculated_margin_percentage >= 15 ? 'low' : 'critical';

    return NextResponse.json({
      success: true,
      data: {
        estimation: {
          ...estimation,
          margin_status: marginStatus,
          customer_requirements: typeof estimation.customer_requirements === 'string' ? 
            JSON.parse(estimation.customer_requirements || '{}') : estimation.customer_requirements || {},
          site_conditions: typeof estimation.site_conditions === 'string' ? 
            JSON.parse(estimation.site_conditions || '{}') : estimation.site_conditions || {}
        },
        phases: phasesResult.rows,
        recent_history: historyResult.rows
      },
    });

  } catch (error) {
    console.error('Estimation fetch error:', error);
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

    const body = await request.json();
    const updateData = updateEstimationSchema.parse(body);

    // Check if estimation exists and user has access
    const existingQuery = `
      SELECT id, sales_rep_id, project_name, status, calculated_margin_percentage, total_project_cost
      FROM estimation_projects 
      WHERE id = $1
    `;
    const existingResult = await query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Estimation not found' } },
        { status: 404 }
      );
    }

    const existing = existingResult.rows[0];

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

    if (updateData.project_name !== undefined) {
      paramCount++;
      updateFields.push(`project_name = $${paramCount}`);
      updateValues.push(updateData.project_name);
    }

    if (updateData.customer_requirements !== undefined) {
      paramCount++;
      updateFields.push(`customer_requirements = $${paramCount}`);
      updateValues.push(JSON.stringify(updateData.customer_requirements));
    }

    if (updateData.site_conditions !== undefined) {
      paramCount++;
      updateFields.push(`site_conditions = $${paramCount}`);
      updateValues.push(JSON.stringify(updateData.site_conditions));
    }

    if (updateData.overhead_percentage !== undefined) {
      paramCount++;
      updateFields.push(`overhead_percentage = $${paramCount}`);
      updateValues.push(updateData.overhead_percentage);
    }

    if (updateData.target_margin_percentage !== undefined) {
      paramCount++;
      updateFields.push(`target_margin_percentage = $${paramCount}`);
      updateValues.push(updateData.target_margin_percentage);
    }

    if (updateData.risk_buffer_percentage !== undefined) {
      paramCount++;
      updateFields.push(`risk_buffer_percentage = $${paramCount}`);
      updateValues.push(updateData.risk_buffer_percentage);
    }

    if (updateData.status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(updateData.status);
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
    updateValues.push(id);

    const updateQuery = `
      UPDATE estimation_projects 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedEstimation = result.rows[0];

    // Recalculate if settings changed
    if (updateData.overhead_percentage !== undefined || 
        updateData.target_margin_percentage !== undefined || 
        updateData.risk_buffer_percentage !== undefined) {
      await query('SELECT recalculate_estimation_totals($1)', [id]);
    }

    // Record change in history
    const changeDescription = [];
    if (updateData.project_name !== undefined && updateData.project_name !== existing.project_name) {
      changeDescription.push(`Project name changed to "${updateData.project_name}"`);
    }
    if (updateData.status !== undefined && updateData.status !== existing.status) {
      changeDescription.push(`Status changed to "${updateData.status}"`);
    }
    if (updateData.overhead_percentage !== undefined) {
      changeDescription.push(`Overhead percentage changed to ${updateData.overhead_percentage}%`);
    }
    if (updateData.target_margin_percentage !== undefined) {
      changeDescription.push(`Target margin changed to ${updateData.target_margin_percentage}%`);
    }

    if (changeDescription.length > 0) {
      await query(`
        INSERT INTO estimation_calculation_history (
          estimation_project_id, user_id, change_type, change_description,
          calculation_snapshot, margin_at_time, total_cost_at_time
        ) VALUES ($1, $2, 'settings_changed', $3, $4, $5, $6)
      `, [
        id,
        user.id,
        changeDescription.join('; '),
        JSON.stringify(updateData),
        existing.calculated_margin_percentage,
        existing.total_project_cost
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        estimation: {
          ...updatedEstimation,
          customer_requirements: JSON.parse(updatedEstimation.customer_requirements || '{}'),
          site_conditions: JSON.parse(updatedEstimation.site_conditions || '{}')
        },
        message: 'Estimation updated successfully'
      },
    });

  } catch (error) {
    console.error('Estimation update error:', error);

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

export async function DELETE(
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

    // Check if estimation exists and user has access
    const existingQuery = `
      SELECT id, sales_rep_id, project_name, status
      FROM estimation_projects 
      WHERE id = $1
    `;
    const existingResult = await query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Estimation not found' } },
        { status: 404 }
      );
    }

    const existing = existingResult.rows[0];

    // Only allow deletion by owner or manager
    if (user.role === 'sales_rep' && existing.sales_rep_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Prevent deletion of converted estimations
    if (existing.status === 'converted_to_quote') {
      return NextResponse.json(
        { success: false, error: { code: 'CANNOT_DELETE', message: 'Cannot delete estimation that has been converted to quote' } },
        { status: 400 }
      );
    }

    // Soft delete by archiving
    await query(`
      UPDATE estimation_projects 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Record deletion in history
    await query(`
      INSERT INTO estimation_calculation_history (
        estimation_project_id, user_id, change_type, change_description,
        calculation_snapshot
      ) VALUES ($1, $2, 'project_archived', $3, $4)
    `, [
      id,
      user.id,
      `Estimation project "${existing.project_name}" archived`,
      JSON.stringify({ archived_by: user.id, reason: 'user_requested' })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Estimation archived successfully'
      },
    });

  } catch (error) {
    console.error('Estimation deletion error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}