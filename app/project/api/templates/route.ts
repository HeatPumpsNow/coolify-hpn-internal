import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/supabase/server';
import { query, transaction } from '@/lib/database';
import { selectOptimalTemplate, applyConditionalModifications, suggestTeamAssignment } from '@/lib/templates';
import { ApiResponse, ProjectTemplate } from '@/types';
import { z } from 'zod';

// Validation schemas
const TemplateSelectionSchema = z.object({
  equipment_category: z.string(),
  property_type: z.string().optional(),
  home_age: z.number().optional(),
  square_footage: z.number().optional(),
  electrical_adequate: z.boolean().optional(),
  ductwork_condition: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  complexity_factors: z.array(z.string()).optional(),
  special_requirements: z.array(z.string()).optional(),
  customer_preferences: z.record(z.any()).optional(),
  budget_range: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
});

const TemplateCreateSchema = z.object({
  template_name: z.string().min(1),
  template_description: z.string().optional(),
  equipment_category: z.enum(['heat_pump', 'mini_split', 'water_heater', 'ductwork', 'service', 'maintenance']),
  property_types: z.array(z.string()).optional(),
  complexity_level: z.number().min(1).max(10),
  estimated_total_hours: z.number().min(0),
  typical_crew_size: z.number().min(1).max(5),
  template_data: z.object({
    phases: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      hours: z.number(),
      high_level_tasks: z.array(z.object({
        task_name: z.string(),
        estimated_hours: z.number(),
        required_skills: z.array(z.string()).optional(),
        detailed_tasks: z.array(z.object({
          task_name: z.string(),
          duration_hours: z.number(),
          description: z.string().optional(),
          materials_needed: z.array(z.string()).optional(),
          tools_required: z.array(z.string()).optional(),
        })).optional(),
      })),
    })),
  }),
  application_criteria: z.record(z.any()).optional(),
  conditional_modifications: z.array(z.object({
    condition: z.string(),
    description: z.string().optional(),
    modifications: z.record(z.any()),
  })).optional(),
});

const TemplateFiltersSchema = z.object({
  category: z.enum(['heat_pump', 'mini_split', 'water_heater', 'ductwork', 'service', 'maintenance']).optional(),
  complexity: z.string().transform(Number).optional(),
  crew_size: z.string().transform(Number).optional(),
  search: z.string().optional(),
  active_only: z.enum(['true', 'false']).optional(),
  page: z.string().transform(Number).optional(),
  per_page: z.string().transform(Number).optional(),
});

/**
 * GET /api/templates - List available project templates
 */
async function handleGet(request: NextRequest, user: any): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const filters = TemplateFiltersSchema.parse(Object.fromEntries(searchParams));

    // Build query with filters
    let queryText = `
      SELECT pt.*,
             COUNT(p.id) as usage_count_actual,
             AVG(CASE WHEN p.status = 'completed' THEN 
               ABS((p.actual_hours - p.budgeted_hours) / NULLIF(p.budgeted_hours, 0))
             END) as actual_time_variance,
             COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects
      FROM project_templates pt
      LEFT JOIN projects p ON pt.id = p.template_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Apply filters
    if (filters.category) {
      queryText += ` AND pt.equipment_category = $${++paramCount}`;
      params.push(filters.category);
    }

    if (filters.complexity) {
      queryText += ` AND pt.complexity_level = $${++paramCount}`;
      params.push(filters.complexity);
    }

    if (filters.crew_size) {
      queryText += ` AND pt.typical_crew_size = $${++paramCount}`;
      params.push(filters.crew_size);
    }

    if (filters.search) {
      queryText += ` AND (pt.template_name ILIKE $${++paramCount} OR pt.template_description ILIKE $${++paramCount})`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
      paramCount++; // We added 2 params but only incremented once
    }

    if (filters.active_only === 'true') {
      queryText += ` AND pt.is_active = true`;
    }

    queryText += ` GROUP BY pt.id ORDER BY pt.success_rate DESC, pt.usage_count DESC`;

    // Pagination
    const page = filters.page || 1;
    const perPage = Math.min(filters.per_page || 20, 100);
    const offset = (page - 1) * perPage;

    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(perPage, offset);

    // Get total count
    let countQuery = queryText.replace(/SELECT pt\.\*.*?GROUP BY pt\.id/, 'SELECT COUNT(DISTINCT pt.id)');
    countQuery = countQuery.replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, '');

    const [templatesResult, countResult] = await Promise.all([
      query(queryText, params),
      query(countQuery, params.slice(0, -2)),
    ]);

    const templates = templatesResult.rows;
    const total = parseInt(countResult.rows[0].count);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        templates,
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
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid filter parameters' : 'Failed to fetch templates',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * POST /api/templates - Create new template or select optimal template
 */
async function handlePost(request: NextRequest, user: any): Promise<Response> {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'select_optimal') {
      // Template selection logic
      const criteria = TemplateSelectionSchema.parse(body.criteria);
      
      const result = await selectOptimalTemplate(criteria);
      
      if (!result) {
        return NextResponse.json(
          {
            success: false,
            message: 'No suitable template found for the given criteria',
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );
      }

      // Apply conditional modifications
      const modificationResult = await applyConditionalModifications(
        result.template,
        criteria,
        body.customizations || []
      );

      // Suggest team assignment
      const teamSuggestion = await suggestTeamAssignment(result.template, criteria);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          selected_template: {
            ...result.template,
            confidence_score: result.confidence,
          },
          template_modifications: modificationResult,
          team_suggestion: teamSuggestion,
          criteria_used: criteria,
        },
        message: 'Optimal template selected successfully',
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);

    } else {
      // Template creation logic
      if (user.type !== 'owner') {
        return NextResponse.json(
          {
            success: false,
            message: 'Only owners can create templates',
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      const validatedData = TemplateCreateSchema.parse(body);

      const result = await transaction(async (client) => {
        // Create new template
        const templateResult = await client.query(
          `INSERT INTO project_templates (
            template_name, template_description, equipment_category,
            property_types, complexity_level, estimated_total_hours,
            typical_crew_size, template_data, application_criteria,
            conditional_modifications, created_by, template_version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '1.0')
          RETURNING *`,
          [
            validatedData.template_name,
            validatedData.template_description,
            validatedData.equipment_category,
            validatedData.property_types || [],
            validatedData.complexity_level,
            validatedData.estimated_total_hours,
            validatedData.typical_crew_size,
            JSON.stringify(validatedData.template_data),
            JSON.stringify(validatedData.application_criteria || {}),
            JSON.stringify(validatedData.conditional_modifications || []),
            user.id
          ]
        );

        return templateResult.rows[0];
      });

      const response: ApiResponse<ProjectTemplate> = {
        success: true,
        data: result,
        message: 'Template created successfully',
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response, { status: 201 });
    }
  } catch (error) {
    console.error('Error in template operation:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid template data' : 'Template operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// Export route handlers
export const GET = withAuthHandler(handleGet, { allowedUserTypes: ['owner', 'employee'] });
export const POST = withAuthHandler(handlePost, { allowedUserTypes: ['owner', 'employee'] });