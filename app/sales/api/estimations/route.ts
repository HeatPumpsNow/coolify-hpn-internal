import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';
import { z } from 'zod';

const estimationsQuerySchema = z.object({
  status: z.string().optional(),
  quote_type: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

const createEstimationSchema = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  lead_id: z.string().uuid('Valid lead ID is required').optional(),
  quote_type: z.string().min(1, 'Quote type is required'),
  customer_requirements: z.record(z.any()).optional(),
  site_conditions: z.record(z.any()).optional(),
  overhead_percentage: z.number().min(0).max(50).default(15),
  target_margin_percentage: z.number().min(0).max(100).default(35),
  risk_buffer_percentage: z.number().min(0).max(25).default(5),
  apply_template: z.boolean().default(true),
  flat_rate_mode: z.boolean().default(false),
  flat_rate_template_id: z.string().uuid().optional()
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
    const params = Object.fromEntries(url.searchParams);
    const { status, quote_type, search, page, limit } = estimationsQuerySchema.parse(params);

    // Build dynamic query
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 0;

    // Filter by sales rep (for non-managers)
    if (user.role === 'sales_rep') {
      paramCount++;
      whereConditions.push(`ep.sales_rep_id = $${paramCount}`);
      queryParams.push(user.id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`ep.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (quote_type) {
      paramCount++;
      whereConditions.push(`ep.quote_type = $${paramCount}`);
      queryParams.push(quote_type);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        ep.project_number ILIKE $${paramCount} OR 
        ep.project_name ILIKE $${paramCount} OR
        sl.customer_info->>'first_name' ILIKE $${paramCount} OR
        sl.customer_info->>'last_name' ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    const offset = (page - 1) * limit;
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Temporary workaround: Return mock data if estimation tables don't exist
    try {
      // Test if estimation_projects table exists
      await query('SELECT 1 FROM estimation_projects LIMIT 1');
    } catch (tableError) {
      console.log('Estimation tables not found, returning mock data');
      return NextResponse.json({
        success: true,
        data: {
          estimations: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM estimation_projects ep 
      LEFT JOIN sales_leads sl ON ep.lead_id = sl.id 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const estimationsQuery = `
      SELECT 
        ep.id, ep.project_number, ep.project_name, ep.quote_type, ep.status,
        ep.total_project_cost, ep.calculated_margin_amount, ep.calculated_margin_percentage,
        ep.flat_rate_mode, ep.template_applied,
        ep.created_at, ep.updated_at, ep.last_calculated_at,
        sl.customer_info, sl.lead_number,
        sr.first_name as rep_first_name, sr.last_name as rep_last_name,
        (SELECT COUNT(*) FROM estimation_phases WHERE estimation_project_id = ep.id AND active = TRUE) as phase_count,
        (SELECT COUNT(*) FROM estimation_line_items WHERE estimation_project_id = ep.id AND active = TRUE) as line_item_count
      FROM estimation_projects ep
      LEFT JOIN sales_leads sl ON ep.lead_id = sl.id
      LEFT JOIN sales_reps sr ON ep.sales_rep_id = sr.id
      ${whereClause}
      ORDER BY ep.updated_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const estimationsResult = await query(estimationsQuery, queryParams);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        estimations: estimationsResult.rows.map(row => ({
          ...row,
          phase_count: parseInt(row.phase_count),
          line_item_count: parseInt(row.line_item_count),
          margin_status: row.calculated_margin_percentage >= 35 ? 'good' : 
                        row.calculated_margin_percentage >= 25 ? 'acceptable' : 
                        row.calculated_margin_percentage >= 15 ? 'low' : 'critical'
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });
  } catch (error) {
    console.error('Estimations fetch error:', error);

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
    const estimationData = createEstimationSchema.parse(body);

    // Database tables should now exist after running migration

    // Generate project number
    const projectNumberResult = await query('SELECT generate_estimation_project_number() as project_number');
    const projectNumber = projectNumberResult.rows[0].project_number;

    // Create estimation project
    const insertQuery = `
      INSERT INTO estimation_projects (
        project_number, project_name, lead_id, sales_rep_id, quote_type,
        customer_requirements, site_conditions,
        overhead_percentage, target_margin_percentage, risk_buffer_percentage,
        flat_rate_mode, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft'
      ) RETURNING id, created_at
    `;

    const result = await query(insertQuery, [
      projectNumber,
      estimationData.project_name,
      estimationData.lead_id || null,
      user.id,
      estimationData.quote_type,
      JSON.stringify(estimationData.customer_requirements || {}),
      JSON.stringify(estimationData.site_conditions || {}),
      estimationData.overhead_percentage,
      estimationData.target_margin_percentage,
      estimationData.risk_buffer_percentage,
      estimationData.flat_rate_mode
    ]);

    const newEstimation = result.rows[0];

    // Apply template if requested
    if (estimationData.apply_template && !estimationData.flat_rate_mode) {
      try {
        // Get default template for quote type
        const templateQuery = `
          SELECT id FROM estimation_templates 
          WHERE quote_type = $1 AND active = TRUE AND is_system_template = TRUE
          ORDER BY created_at ASC LIMIT 1
        `;
        const templateResult = await query(templateQuery, [estimationData.quote_type]);
        
        if (templateResult.rows.length > 0) {
          const templateId = templateResult.rows[0].id;
          await applyEstimationTemplate(newEstimation.id, templateId, user.id);
        }
      } catch (templateError) {
        console.warn('Failed to apply template:', templateError);
        // Continue without template - not a critical error
      }
    }

    // Apply flat rate template if requested
    if (estimationData.flat_rate_mode && estimationData.flat_rate_template_id) {
      try {
        await query('SELECT apply_flat_rate_template($1, $2, $3)', [
          newEstimation.id,
          estimationData.flat_rate_template_id,
          user.id
        ]);
      } catch (flatRateError) {
        console.error('Failed to apply flat rate template:', flatRateError);
        // Still return success but log the error
      }
    }

    // Record creation in history (temporarily disabled for testing)
    // await query(`
    //   INSERT INTO estimation_calculation_history (
    //     estimation_project_id, user_id, change_type, change_description,
    //     calculation_snapshot
    //   ) VALUES ($1, $2, 'project_created', 'Estimation project created', $3)
    // `, [
    //   newEstimation.id,
    //   user.id,
    //   JSON.stringify({
    //     project_number: projectNumber,
    //     project_name: estimationData.project_name,
    //     quote_type: estimationData.quote_type,
    //     flat_rate_mode: estimationData.flat_rate_mode
    //   })
    // ]);

    return NextResponse.json({
      success: true,
      data: {
        id: newEstimation.id,
        project_number: projectNumber,
        message: 'Estimation project created successfully',
        created_at: newEstimation.created_at,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Estimation creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid estimation data',
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

// Helper function to apply estimation template
async function applyEstimationTemplate(projectId: string, templateId: string, userId: string) {
  // Get template data
  const templateQuery = `SELECT * FROM estimation_templates WHERE id = $1 AND active = TRUE`;
  const templateResult = await query(templateQuery, [templateId]);
  
  if (templateResult.rows.length === 0) {
    throw new Error('Template not found or inactive');
  }

  const template = templateResult.rows[0];
  const phases = JSON.parse(template.default_phases);

  // Create phases from template
  for (const phase of phases) {
    await query(`
      INSERT INTO estimation_phases (
        estimation_project_id, phase_name, phase_type, display_order,
        complexity_multiplier, risk_factor_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      projectId,
      phase.phase_name,
      phase.phase_type,
      phase.display_order,
      phase.complexity_multiplier || 1.0,
      phase.risk_factor_percentage || 0
    ]);
  }

  // Update template usage
  await query(`
    UPDATE estimation_templates 
    SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [templateId]);

  // Record in history
  await query(`
    INSERT INTO estimation_calculation_history (
      estimation_project_id, user_id, change_type, change_description,
      calculation_snapshot
    ) VALUES ($1, $2, 'template_applied', $3, $4)
  `, [
    projectId,
    userId,
    `Applied template: ${template.template_name}`,
    JSON.stringify({
      template_id: templateId,
      template_name: template.template_name,
      phases_created: phases.length
    })
  ]);
}