import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';

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

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT 
        id, sales_rep_id, project_name, overhead_percentage, 
        target_margin_percentage, risk_buffer_percentage,
        total_project_cost as previous_total_cost,
        calculated_margin_percentage as previous_margin
      FROM estimation_projects 
      WHERE id = $1
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

    // Perform recalculation
    const startTime = Date.now();
    await query('SELECT recalculate_estimation_totals($1)', [id]);
    const calculationTime = Date.now() - startTime;

    // Get updated totals
    const updatedQuery = `
      SELECT 
        total_equipment_cost, total_labor_cost, total_material_cost,
        total_project_cost, calculated_margin_amount, calculated_margin_percentage,
        overhead_percentage, target_margin_percentage, risk_buffer_percentage,
        last_calculated_at
      FROM estimation_projects 
      WHERE id = $1
    `;
    const updatedResult = await query(updatedQuery, [id]);
    const updated = updatedResult.rows[0];

    // Get phase breakdown
    const phasesQuery = `
      SELECT 
        phase_name, phase_type,
        phase_equipment_cost, phase_labor_cost, 
        phase_material_cost, phase_total_cost
      FROM estimation_phases 
      WHERE estimation_project_id = $1 AND active = TRUE
      ORDER BY display_order
    `;
    const phasesResult = await query(phasesQuery, [id]);

    // Calculate derived metrics
    const subtotalCost = updated.total_equipment_cost + updated.total_labor_cost + updated.total_material_cost;
    const overheadAmount = subtotalCost * (updated.overhead_percentage / 100);
    const riskBufferAmount = subtotalCost * (updated.risk_buffer_percentage / 100);
    const totalWithOverhead = subtotalCost + overheadAmount + riskBufferAmount;
    
    // Calculate break-even and pricing metrics
    const breakEvenPrice = totalWithOverhead;
    const targetSellingPrice = totalWithOverhead / (1 - (updated.target_margin_percentage / 100));
    const minimumAcceptablePrice = totalWithOverhead * 1.15; // 15% minimum margin
    const competitivePriceFloor = totalWithOverhead * 1.10; // 10% absolute minimum

    // Determine margin status
    const marginStatus = updated.calculated_margin_percentage >= 35 ? 'good' : 
                        updated.calculated_margin_percentage >= 25 ? 'acceptable' : 
                        updated.calculated_margin_percentage >= 15 ? 'low' : 'critical';

    // Create calculation record
    const calculationData = {
      estimation_project_id: id,
      total_equipment_cost: updated.total_equipment_cost,
      total_labor_cost: updated.total_labor_cost,
      total_material_cost: updated.total_material_cost,
      subtotal_cost: subtotalCost,
      overhead_amount: overheadAmount,
      risk_buffer_amount: riskBufferAmount,
      total_project_cost: updated.total_project_cost,
      target_selling_price: targetSellingPrice,
      margin_amount: updated.calculated_margin_amount,
      margin_percentage: updated.calculated_margin_percentage,
      break_even_price: breakEvenPrice,
      minimum_acceptable_price: minimumAcceptablePrice,
      competitive_price_floor: competitivePriceFloor,
      phase_costs: JSON.stringify(phasesResult.rows),
      settings_snapshot: JSON.stringify({
        overhead_percentage: updated.overhead_percentage,
        target_margin_percentage: updated.target_margin_percentage,
        risk_buffer_percentage: updated.risk_buffer_percentage
      })
    };

    // Store calculation result
    await query(`
      UPDATE estimation_calculations 
      SET is_current = FALSE 
      WHERE estimation_project_id = $1
    `, [id]);

    await query(`
      INSERT INTO estimation_calculations (
        estimation_project_id, total_equipment_cost, total_labor_cost, 
        total_material_cost, subtotal_cost, overhead_amount, risk_buffer_amount,
        total_project_cost, target_selling_price, margin_amount, margin_percentage,
        break_even_price, minimum_acceptable_price, competitive_price_floor,
        phase_costs, settings_snapshot, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE)
    `, [
      id,
      calculationData.total_equipment_cost,
      calculationData.total_labor_cost, 
      calculationData.total_material_cost,
      calculationData.subtotal_cost,
      calculationData.overhead_amount,
      calculationData.risk_buffer_amount,
      calculationData.total_project_cost,
      calculationData.target_selling_price,
      calculationData.margin_amount,
      calculationData.margin_percentage,
      calculationData.break_even_price,
      calculationData.minimum_acceptable_price,
      calculationData.competitive_price_floor,
      calculationData.phase_costs,
      calculationData.settings_snapshot
    ]);

    // Record in history if significant change
    const costDelta = updated.total_project_cost - estimation.previous_total_cost;
    const marginDelta = updated.calculated_margin_percentage - estimation.previous_margin;

    if (Math.abs(costDelta) > 10 || Math.abs(marginDelta) > 0.5) { // Only record significant changes
      await query(`
        INSERT INTO estimation_calculation_history (
          estimation_project_id, user_id, change_type, change_description,
          calculation_snapshot, margin_at_time, total_cost_at_time,
          cost_delta, margin_delta
        ) VALUES ($1, $2, 'calculation_updated', $3, $4, $5, $6, $7, $8)
      `, [
        id,
        user.id,
        `Calculation updated - Cost: ${costDelta >= 0 ? '+' : ''}$${costDelta.toFixed(2)}, Margin: ${marginDelta >= 0 ? '+' : ''}${marginDelta.toFixed(1)}%`,
        JSON.stringify({
          calculation_time_ms: calculationTime,
          cost_delta: costDelta,
          margin_delta: marginDelta,
          margin_status: marginStatus
        }),
        updated.calculated_margin_percentage,
        updated.total_project_cost,
        costDelta,
        marginDelta
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        calculation: {
          // Cost breakdown
          total_equipment_cost: updated.total_equipment_cost,
          total_labor_cost: updated.total_labor_cost,
          total_material_cost: updated.total_material_cost,
          subtotal_cost: subtotalCost,
          
          // Overhead and adjustments
          overhead_percentage: updated.overhead_percentage,
          overhead_amount: overheadAmount,
          risk_buffer_percentage: updated.risk_buffer_percentage,
          risk_buffer_amount: riskBufferAmount,
          
          // Final costs
          total_project_cost: updated.total_project_cost,
          
          // Margin analysis
          target_margin_percentage: updated.target_margin_percentage,
          calculated_margin_amount: updated.calculated_margin_amount,
          calculated_margin_percentage: updated.calculated_margin_percentage,
          margin_status: marginStatus,
          
          // Pricing guidance
          break_even_price: breakEvenPrice,
          target_selling_price: targetSellingPrice,
          minimum_acceptable_price: minimumAcceptablePrice,
          competitive_price_floor: competitivePriceFloor,
          
          // Phase breakdown
          phases: phasesResult.rows,
          
          // Metadata
          last_calculated_at: updated.last_calculated_at,
          calculation_time_ms: calculationTime,
          cost_delta: costDelta,
          margin_delta: marginDelta
        },
        performance: {
          calculation_time_ms: calculationTime,
          meets_performance_requirement: calculationTime < 100
        },
        message: 'Calculation completed successfully'
      },
    });

  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}