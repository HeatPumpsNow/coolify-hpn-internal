import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/supabase/server';
import { query, transaction } from '@/lib/database';
import { ProjectCreateRequest, ApiResponse, Project } from '@/types';
import { z } from 'zod';

// Validation schemas
const ProjectCreateSchema = z.object({
  contract_id: z.string().uuid().optional(),
  template_selection: z.enum(['auto', 'manual']),
  template_id: z.string().uuid().optional(),
  project_parameters: z.object({
    planned_start_date: z.string().date(),
    customer_preferences: z.record(z.any()).optional(),
    site_conditions: z.record(z.any()).optional(),
    team_preferences: z.record(z.any()).optional(),
  }),
  template_customizations: z.array(z.any()).optional(),
});

const ProjectFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  project_manager_id: z.string().uuid().optional(),
  lead_technician_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional(),
  per_page: z.string().transform(Number).optional(),
});

/**
 * GET /api/projects - List projects with filtering and pagination
 */
async function handleGet(request: NextRequest, user: any): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const filters = ProjectFiltersSchema.parse(Object.fromEntries(searchParams));

    // Build query with filters
    let queryText = `
      SELECT p.*, 
             c.first_name || ' ' || c.last_name as customer_name,
             c.email as customer_email,
             c.phone as customer_phone
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      queryText += ` AND p.status = ANY($${++paramCount})`;
      params.push(filters.status);
    }

    // Commenting out filters for non-existent columns
    // if (filters.project_manager_id) {
    //   queryText += ` AND p.project_manager_id = $${++paramCount}`;
    //   params.push(filters.project_manager_id);
    // }

    // if (filters.lead_technician_id) {
    //   queryText += ` AND p.lead_technician_id = $${++paramCount}`;
    //   params.push(filters.lead_technician_id);
    // }

    // if (filters.template_id) {
    //   queryText += ` AND p.template_id = $${++paramCount}`;
    //   params.push(filters.template_id);
    // }

    if (filters.customer_id) {
      queryText += ` AND p.customer_id = $${++paramCount}`;
      params.push(filters.customer_id);
    }

    if (filters.start_date) {
      queryText += ` AND p.planned_start_date >= $${++paramCount}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      queryText += ` AND p.planned_end_date <= $${++paramCount}`;
      params.push(filters.end_date);
    }

    if (filters.search) {
      queryText += ` AND (p.project_name ILIKE $${++paramCount} OR p.project_number ILIKE $${++paramCount} OR c.first_name || ' ' || c.last_name ILIKE $${++paramCount})`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramCount += 2; // We added 3 params but only incremented once
    }

    // User access control - simplified for now
    // if (user.type === 'employee') {
    //   queryText += ` AND (p.project_manager_id = $${++paramCount} OR p.lead_technician_id = $${++paramCount})`;
    //   params.push(user.id, user.id);
    //   paramCount++; // We added 2 params but only incremented once
    // }

    queryText += ` GROUP BY p.id, c.first_name, c.last_name, c.email, c.phone`;
    queryText += ` ORDER BY p.created_at DESC`;

    // Pagination
    const page = filters.page || 1;
    const perPage = Math.min(filters.per_page || 20, 100);
    const offset = (page - 1) * perPage;

    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(perPage, offset);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id)
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;
    
    // Rebuild filters for count query
    const countParams: any[] = [];
    let countParamCount = 0;
    
    if (filters.status && filters.status.length > 0) {
      countQuery += ` AND p.status = ANY($${++countParamCount})`;
      countParams.push(filters.status);
    }
    
    if (filters.customer_id) {
      countQuery += ` AND p.customer_id = $${++countParamCount}`;
      countParams.push(filters.customer_id);
    }
    
    if (filters.start_date) {
      countQuery += ` AND p.planned_start_date >= $${++countParamCount}`;
      countParams.push(filters.start_date);
    }
    
    if (filters.end_date) {
      countQuery += ` AND p.planned_end_date <= $${++countParamCount}`;
      countParams.push(filters.end_date);
    }
    
    if (filters.search) {
      countQuery += ` AND (p.project_name ILIKE $${++countParamCount} OR p.project_number ILIKE $${++countParamCount} OR c.first_name || ' ' || c.last_name ILIKE $${++countParamCount})`;
      const searchTerm = `%${filters.search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
      countParamCount += 2;
    }
    
    const [projectsResult, countResult] = await Promise.all([
      query(queryText, params),
      query(countQuery, countParams), // Use separate countParams
    ]);

    const projects = projectsResult.rows;
    const total = parseInt(countResult.rows[0].count);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        projects,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid filter parameters' : 'Failed to fetch projects',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * POST /api/projects - Create new project from contract or manual setup
 */
async function handlePost(request: NextRequest, user: any): Promise<Response> {
  try {
    const body = await request.json();
    const validatedData = ProjectCreateSchema.parse(body);

    const result = await transaction(async (client) => {
      // 1. Get contract details if provided
      let contractData = null;
      if (validatedData.contract_id) {
        const contractResult = await client.query(
          `SELECT c.*, sl.customer_info, sl.assessment_data, sl.technical_notes,
                  p.line_items, p.total_price
           FROM contracts c
           LEFT JOIN sales_leads sl ON c.lead_id = sl.id
           LEFT JOIN proposals p ON c.proposal_id = p.id
           WHERE c.id = $1`,
          [validatedData.contract_id]
        );
        
        if (contractResult.rows.length === 0) {
          throw new Error('Contract not found');
        }
        
        contractData = contractResult.rows[0];
      }

      // 2. Select or get template
      let templateId = validatedData.template_id;
      if (validatedData.template_selection === 'auto' && contractData) {
        // AI template selection logic
        const templateResult = await client.query(
          `SELECT id FROM project_templates 
           WHERE is_active = true 
             AND equipment_category = $1
           ORDER BY success_rate DESC, usage_count DESC
           LIMIT 1`,
          ['heat_pump'] // This would be determined from contract data
        );
        
        if (templateResult.rows.length > 0) {
          templateId = templateResult.rows[0].id;
        }
      }

      // 3. Get template data
      let templateData = null;
      if (templateId) {
        const templateResult = await client.query(
          'SELECT * FROM project_templates WHERE id = $1',
          [templateId]
        );
        templateData = templateResult.rows[0];
      }

      // 4. Extract customer information
      const customerId = contractData?.customer_info?.customer_id || 
                        (await createCustomerFromContract(client, contractData));

      // 5. Generate project number
      const projectNumber = `P${new Date().getFullYear().toString().slice(-2)}-${String(
        await getNextProjectNumber(client)
      ).padStart(4, '0')}`;

      // 6. Create project
      const projectResult = await client.query(
        `INSERT INTO projects (
          project_number, contract_id, customer_id, project_name, project_type,
          template_id, template_version, project_scope, special_requirements,
          customer_preferences, site_conditions, planned_start_date,
          budgeted_hours, budgeted_labor_cost, materials_cost, overhead_cost,
          status, project_manager_id, property_address, equipment_specs,
          template_customizations
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21
        ) RETURNING *`,
        [
          projectNumber,
          validatedData.contract_id,
          customerId,
          contractData?.work_scope || `Project for ${contractData?.customer_info?.first_name} ${contractData?.customer_info?.last_name}`,
          'installation',
          templateId,
          templateData?.template_version,
          contractData?.work_scope,
          contractData?.technical_notes ? { technical_notes: contractData.technical_notes } : {},
          validatedData.project_parameters.customer_preferences || {},
          validatedData.project_parameters.site_conditions || {},
          validatedData.project_parameters.planned_start_date,
          templateData?.estimated_total_hours || 24,
          templateData?.estimated_total_hours ? templateData.estimated_total_hours * 85 : 2040, // $85/hour default
          contractData?.total_price ? contractData.total_price * 0.6 : 12000, // Estimate 60% materials
          contractData?.total_price ? contractData.total_price * 0.1 : 2000, // Estimate 10% overhead
          'planned',
          user.id, // Set creating user as project manager
          contractData?.customer_info || {},
          contractData?.line_items ? { equipment: contractData.line_items } : {},
          validatedData.template_customizations || []
        ]
      );

      const project = projectResult.rows[0];

      // 7. Apply template and create task hierarchy
      if (templateData) {
        await applyTemplateToProject(client, project.id, templateData, validatedData.template_customizations);
      }

      // 8. Update template usage count
      if (templateId) {
        await client.query(
          'UPDATE project_templates SET usage_count = usage_count + 1 WHERE id = $1',
          [templateId]
        );
      }

      // 9. Create initial performance metrics record
      await client.query(
        `INSERT INTO project_performance_metrics (
          project_id, calculation_date, calculation_type,
          estimated_hours_to_date, actual_hours_to_date,
          budgeted_cost_to_date, actual_cost_to_date,
          planned_completion_percentage, actual_completion_percentage,
          budget_risk_level, schedule_risk_level, quality_risk_level
        ) VALUES ($1, CURRENT_DATE, 'daily', 0, 0, 0, 0, 0, 0, 'low', 'low', 'low')`,
        [project.id]
      );

      return project;
    });

    const response: ApiResponse<Project> = {
      success: true,
      data: result,
      message: 'Project created successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid project data' : 'Failed to create project',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// Helper functions
async function getNextProjectNumber(client: any): Promise<number> {
  const result = await client.query('SELECT nextval(\'project_number_seq\') as next_number');
  return result.rows[0].next_number;
}

async function createCustomerFromContract(client: any, contractData: any): Promise<string> {
  if (!contractData?.customer_info) {
    throw new Error('Customer information required');
  }

  const customerInfo = contractData.customer_info;
  const result = await client.query(
    `INSERT INTO customers (first_name, last_name, email, phone, address)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address
     RETURNING id`,
    [
      customerInfo.first_name,
      customerInfo.last_name,
      customerInfo.email,
      customerInfo.phone,
      customerInfo.address || ''
    ]
  );

  return result.rows[0].id;
}

async function applyTemplateToProject(
  client: any,
  projectId: string,
  templateData: any,
  customizations: any[] = []
) {
  const phases = templateData.template_data.phases || [];

  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
    const phase = phases[phaseIndex];
    
    // Create phase
    const phaseResult = await client.query(
      `INSERT INTO project_phases (
        project_id, phase_name, phase_description, phase_order,
        estimated_hours, status, can_parallel, critical_path
      ) VALUES ($1, $2, $3, $4, $5, 'not_started', $6, $7)
      RETURNING *`,
      [
        projectId,
        phase.name || phase.phase_name,
        phase.description,
        phaseIndex + 1,
        phase.hours || phase.estimated_hours || 8,
        phase.can_parallel || false,
        phase.critical_path || (phaseIndex === 0) // First phase is usually critical
      ]
    );

    const phaseId = phaseResult.rows[0].id;

    // Create high-level tasks for this phase
    const highLevelTasks = phase.high_level_tasks || [];
    for (let taskIndex = 0; taskIndex < highLevelTasks.length; taskIndex++) {
      const hlTask = highLevelTasks[taskIndex];
      
      const hlTaskResult = await client.query(
        `INSERT INTO project_high_level_tasks (
          project_id, phase_id, task_name, task_description, task_order,
          estimated_hours, status, required_skills, can_parallel
        ) VALUES ($1, $2, $3, $4, $5, $6, 'not_started', $7, $8)
        RETURNING *`,
        [
          projectId,
          phaseId,
          hlTask.task_name || hlTask.name,
          hlTask.task_description || hlTask.description,
          taskIndex + 1,
          hlTask.estimated_hours || hlTask.hours || 2,
          hlTask.required_skills || [],
          hlTask.can_parallel || true
        ]
      );

      const hlTaskId = hlTaskResult.rows[0].id;

      // Create detailed tasks
      const detailedTasks = hlTask.detailed_tasks || [];
      for (let detailIndex = 0; detailIndex < detailedTasks.length; detailIndex++) {
        const detailTask = detailedTasks[detailIndex];
        
        await client.query(
          `INSERT INTO project_detailed_tasks (
            project_id, high_level_task_id, task_name, task_description,
            task_order, estimated_duration_hours, status, required_skill_level,
            tools_required, materials_needed, deliverables
          ) VALUES ($1, $2, $3, $4, $5, $6, 'not_started', $7, $8, $9, $10)`,
          [
            projectId,
            hlTaskId,
            detailTask.task_name || detailTask.name,
            detailTask.description,
            detailIndex + 1,
            detailTask.duration_hours || detailTask.hours || 1,
            detailTask.required_skill_level || 'technician',
            detailTask.tools_required || [],
            detailTask.materials_needed || [],
            detailTask.deliverables || []
          ]
        );
      }
    }
  }
}

// Export route handlers with authentication
export const GET = withAuthHandler(handleGet, { allowedUserTypes: ['owner', 'employee'] });
export const POST = withAuthHandler(handlePost, { allowedUserTypes: ['owner', 'employee'] });