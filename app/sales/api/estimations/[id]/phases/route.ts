import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const createPhaseSchema = z.object({
  phase_name: z.string().min(1, 'Phase name is required'),
  phase_type: z.enum(['equipment', 'electrical', 'ductwork', 'refrigerant', 'testing', 'permits', 'materials', 'labor', 'custom']),
  display_order: z.number().int().min(1).optional(),
  complexity_multiplier: z.number().min(0.5).max(3.0).default(1.0),
  risk_factor_percentage: z.number().min(0).max(25).default(0),
  notes: z.string().optional()
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

    // Get phases with line item counts
    const phasesQuery = `
      SELECT 
        ep.*,
        (SELECT COUNT(*) FROM estimation_line_items WHERE estimation_phase_id = ep.id AND active = TRUE) as line_item_count
      FROM estimation_phases ep
      WHERE ep.estimation_project_id = $1 AND ep.active = TRUE
      ORDER BY ep.display_order, ep.created_at
    `;

    const phasesResult = await query(phasesQuery, [id]);

    return NextResponse.json({
      success: true,
      data: {
        phases: phasesResult.rows.map(phase => ({
          ...phase,
          line_item_count: parseInt(phase.line_item_count)
        }))
      },
    });

  } catch (error) {
    console.error('Phases fetch error:', error);
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
    const phaseData = createPhaseSchema.parse(body);

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT id, sales_rep_id, project_name FROM estimation_projects WHERE id = $1
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

    // Check for duplicate phase name
    const duplicateQuery = `
      SELECT id FROM estimation_phases 
      WHERE estimation_project_id = $1 AND phase_name = $2 AND active = TRUE
    `;
    const duplicateResult = await query(duplicateQuery, [id, phaseData.phase_name]);

    if (duplicateResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_PHASE', message: 'Phase name already exists' } },
        { status: 400 }
      );
    }

    // Get next display order if not provided
    let displayOrder = phaseData.display_order;
    if (!displayOrder) {
      const maxOrderQuery = `
        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
        FROM estimation_phases 
        WHERE estimation_project_id = $1 AND active = TRUE
      `;
      const maxOrderResult = await query(maxOrderQuery, [id]);
      displayOrder = maxOrderResult.rows[0].next_order;
    }

    // Create phase
    const insertQuery = `
      INSERT INTO estimation_phases (
        estimation_project_id, phase_name, phase_type, display_order,
        complexity_multiplier, risk_factor_percentage, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      id,
      phaseData.phase_name,
      phaseData.phase_type,
      displayOrder,
      phaseData.complexity_multiplier,
      phaseData.risk_factor_percentage,
      phaseData.notes || null
    ]);

    const newPhase = result.rows[0];

    // Record in history
    await query(`
      INSERT INTO estimation_calculation_history (
        estimation_project_id, user_id, change_type, change_description,
        calculation_snapshot
      ) VALUES ($1, $2, 'phase_added', $3, $4)
    `, [
      id,
      user.id,
      `Added phase: ${phaseData.phase_name}`,
      JSON.stringify({
        phase_id: newPhase.id,
        phase_name: phaseData.phase_name,
        phase_type: phaseData.phase_type,
        display_order: displayOrder
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        phase: {
          ...newPhase,
          line_item_count: 0
        },
        message: 'Phase created successfully'
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Phase creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid phase data',
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