import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const flatRateJobsQuerySchema = z.object({
  job_type: z.enum(['emergency_repair', 'basic_replacement', 'maintenance']).optional(),
  active: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { job_type, active, page, limit } = flatRateJobsQuerySchema.parse(queryParams);

    // Build query conditions
    const conditions = ['1=1'];
    const values = [];
    let paramCount = 0;

    if (job_type) {
      paramCount++;
      conditions.push(`job_type = $${paramCount}`);
      values.push(job_type);
    }

    if (active !== undefined) {
      paramCount++;
      conditions.push(`active = $${paramCount}`);
      values.push(active);
    }

    // Get flat rate jobs
    const flatRateJobsQuery = `
      SELECT 
        id,
        job_name,
        job_description,
        job_type,
        typical_duration_hours,
        flat_rate_price,
        includes_materials,
        includes_permit,
        included_services,
        common_parts,
        labor_included_hours,
        use_conditions,
        not_suitable_when,
        maximum_job_scope,
        safety_margin_percentage,
        active,
        created_at
      FROM flat_rate_jobs
      WHERE ${conditions.join(' AND ')}
      ORDER BY job_type, flat_rate_price
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, (page - 1) * limit);
    const flatRateJobsResult = await query(flatRateJobsQuery, values);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM flat_rate_jobs
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await query(countQuery, values.slice(0, paramCount));
    const totalJobs = parseInt(countResult.rows[0].total);

    // Process jobs by type
    const jobsByType: Record<string, any[]> = {
      emergency_repair: [],
      basic_replacement: [],
      maintenance: []
    };

    flatRateJobsResult.rows.forEach(job => {
      jobsByType[job.job_type as keyof typeof jobsByType].push({
        id: job.id,
        name: job.job_name,
        description: job.job_description,
        duration_hours: job.typical_duration_hours,
        flat_rate_price: job.flat_rate_price,
        includes_materials: job.includes_materials,
        includes_permit: job.includes_permit,
        included_services: job.included_services,
        common_parts: job.common_parts,
        labor_hours: job.labor_included_hours,
        use_conditions: job.use_conditions,
        not_suitable_when: job.not_suitable_when,
        scope_limitations: job.maximum_job_scope,
        safety_margin: job.safety_margin_percentage,
        active: job.active,
        created_at: job.created_at
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        jobs_by_type: jobsByType,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalJobs / limit),
          total_jobs: totalJobs,
          jobs_per_page: limit
        },
        filters_applied: {
          job_type: job_type || 'all',
          active_only: active !== false
        },
        usage_guidelines: {
          emergency_repair: "Use for system failures requiring immediate attention. Fixed scope, no customization.",
          basic_replacement: "Use for simple like-for-like equipment replacement. No system modifications.",
          maintenance: "Use for routine maintenance and tune-ups. Preventive care only."
        }
      }
    });

  } catch (error) {
    console.error('Flat rate jobs fetch error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid query parameters',
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

// POST endpoint for creating flat rate job estimation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { flat_rate_job_id, customer_info, notes } = body;

    if (!flat_rate_job_id) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_JOB_ID', message: 'Flat rate job ID required' } },
        { status: 400 }
      );
    }

    // Get flat rate job details
    const jobQuery = `
      SELECT * FROM flat_rate_jobs WHERE id = $1 AND active = TRUE
    `;
    const jobResult = await query(jobQuery, [flat_rate_job_id]);

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'JOB_NOT_FOUND', message: 'Flat rate job not found' } },
        { status: 404 }
      );
    }

    const job = jobResult.rows[0];

    // Create estimation project for flat rate job
    const createEstimationQuery = `
      INSERT INTO estimation_projects (
        sales_rep_id, project_name, quote_type, status,
        customer_name, customer_email, customer_phone, customer_address,
        notes, is_flat_rate_job
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const estimationResult = await query(createEstimationQuery, [
      user.id,
      `${job.job_name} - ${customer_info?.name || 'Customer'}`,
      job.job_type,
      'draft',
      customer_info?.name || null,
      customer_info?.email || null,
      customer_info?.phone || null,
      customer_info?.address || null,
      notes || `Flat rate job: ${job.job_name}`,
      true
    ]);

    const estimationId = estimationResult.rows[0].id;

    // Create single phase for flat rate job
    const createPhaseQuery = `
      INSERT INTO estimation_phases (
        estimation_project_id, phase_name, phase_type, display_order,
        complexity_multiplier, risk_factor_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const phaseResult = await query(createPhaseQuery, [
      estimationId,
      job.job_name,
      'flat_rate',
      1,
      1.0,
      0
    ]);

    const phaseId = phaseResult.rows[0].id;

    // Add flat rate job as single line item
    const addLineItemQuery = `
      INSERT INTO estimation_line_items (
        estimation_phase_id, estimation_project_id, custom_item_name,
        description, quantity, unit_cost, unit_price, 
        labor_hours_per_unit, labor_rate, labor_complexity_factor,
        source_type, flat_rate_applied, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const lineItemResult = await query(addLineItemQuery, [
      phaseId,
      estimationId,
      job.job_name,
      job.job_description,
      1,
      job.flat_rate_price * 0.7, // Assume cost basis
      job.flat_rate_price,
      job.labor_included_hours,
      85, // Standard rate
      1.0,
      'flat_rate_template',
      true,
      `Includes: ${job.included_services.join(', ')}. Scope: ${job.maximum_job_scope}`
    ]);

    // Recalculate totals
    await query(`SELECT recalculate_estimation_totals($1)`, [estimationId]);

    return NextResponse.json({
      success: true,
      data: {
        estimation_id: estimationId,
        job_name: job.job_name,
        flat_rate_price: job.flat_rate_price,
        includes: {
          materials: job.includes_materials,
          permit: job.includes_permit,
          services: job.included_services
        },
        scope_limitations: job.maximum_job_scope,
        estimated_duration: job.typical_duration_hours,
        message: 'Flat rate job estimation created successfully'
      }
    });

  } catch (error) {
    console.error('Flat rate job creation error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}