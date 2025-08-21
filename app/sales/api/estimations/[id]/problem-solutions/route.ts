import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const problemSolutionsQuerySchema = z.object({
  identified_problems: z.string().optional().transform(val => val ? JSON.parse(val) : []),
  solution_level: z.enum(['base', 'typical', 'comprehensive']).optional().default('typical'),
  include_assessment: z.string().optional().transform(val => val === 'true'),
});

const assessmentSchema = z.object({
  identified_problems: z.array(z.string()),
  severity_scores: z.record(z.number().min(1).max(5)),
  temperature_readings: z.record(z.number()).optional(),
  humidity_readings: z.record(z.number()).optional(),
  home_characteristics: z.object({
    square_footage: z.number().optional(),
    home_age: z.number().optional(),
    insulation_condition: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
    ductwork_condition: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  }).optional(),
  assessment_method: z.enum(['visual', 'diagnostic_tools', 'comprehensive']).default('visual'),
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
    const queryParams = Object.fromEntries(url.searchParams);
    const { identified_problems, solution_level, include_assessment } = problemSolutionsQuerySchema.parse(queryParams);

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT ep.id, ep.sales_rep_id, ep.quote_type, ep.project_name,
             ha.identified_problems as existing_problems, ha.severity_scores
      FROM estimation_projects ep
      LEFT JOIN home_assessment_data ha ON ep.id = ha.estimation_project_id
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

    if (user.role === 'sales_rep' && estimation.sales_rep_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Use existing assessment problems or provided problems
    const problemsToAnalyze = identified_problems.length > 0 
      ? identified_problems 
      : (estimation.existing_problems ? JSON.parse(estimation.existing_problems) : []);

    // Get problem-based templates
    const templatesQuery = `SELECT * FROM get_problem_based_suggestions($1)`;
    const templatesResult = await query(templatesQuery, [JSON.stringify(problemsToAnalyze)]);

    // Get service components for these problems
    const servicesQuery = `SELECT * FROM get_service_components_for_problems($1)`;
    const servicesResult = await query(servicesQuery, [JSON.stringify(problemsToAnalyze)]);

    // Get existing line items to check what's already included
    const existingItemsQuery = `
      SELECT DISTINCT custom_item_name, sku, description
      FROM estimation_line_items 
      WHERE estimation_project_id = $1 AND active = TRUE
    `;
    const existingItemsResult = await query(existingItemsQuery, [id]);
    const existingItems = existingItemsResult.rows.map(item => 
      item.custom_item_name || item.description || item.sku
    );

    // Process templates and services
    const processedTemplates = templatesResult.rows.map(template => ({
      id: template.template_id,
      name: template.template_name,
      category: template.problem_category,
      description: template.problem_description,
      solutions: JSON.parse(template.solution_components),
      pricing: {
        base: template.base_cost,
        typical: template.typical_cost,
        comprehensive: template.comprehensive_cost,
        recommended_level: solution_level
      },
      effectiveness: template.effectiveness,
      satisfaction: template.satisfaction,
      estimated_cost: solution_level === 'base' ? template.base_cost :
                      solution_level === 'comprehensive' ? template.comprehensive_cost :
                      template.typical_cost
    }));

    const processedServices = servicesResult.rows.map(service => {
      const isAlreadyIncluded = existingItems.some(existing => 
        existing.toLowerCase().includes(service.service_name.toLowerCase()) ||
        service.service_name.toLowerCase().includes(existing.toLowerCase())
      );

      return {
        id: service.service_id,
        name: service.service_name,
        category: service.service_category,
        description: service.service_description,
        price_range: {
          min: service.price_min,
          max: service.price_max
        },
        effectiveness: service.effectiveness,
        benefits: JSON.parse(service.customer_benefits || '[]'),
        roi_timeframe: service.roi_timeframe,
        is_already_included: isAlreadyIncluded,
        priority: service.effectiveness >= 4.5 ? 'recommended' : 
                 service.effectiveness >= 3.5 ? 'optional' : 'conditional'
      };
    });

    // Get Equipment options (simplified good/better)
    const equipmentQuery = `
      SELECT * FROM equipment_catalog 
      WHERE equipment_type = 'heat_pump' AND active = TRUE
      ORDER BY efficiency_tier, capacity_tons
    `;
    const equipmentResult = await query(equipmentQuery);
    
    const equipmentOptions = {
      good: equipmentResult.rows.filter(eq => eq.efficiency_tier === 'good'),
      better: equipmentResult.rows.filter(eq => eq.efficiency_tier === 'better')
    };

    // Assessment data if requested
    let assessmentData = null;
    if (include_assessment && estimation.existing_problems) {
      assessmentData = {
        identified_problems: JSON.parse(estimation.existing_problems),
        severity_scores: JSON.parse(estimation.severity_scores || '{}'),
        assessment_available: true
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        estimation_id: id,
        project_name: estimation.project_name,
        identified_problems: problemsToAnalyze,
        solution_level: solution_level,
        
        problem_templates: processedTemplates,
        service_components: processedServices,
        equipment_options: equipmentOptions,
        assessment_data: assessmentData,
        
        summary: {
          total_problems_identified: problemsToAnalyze.length,
          total_templates_available: processedTemplates.length,
          total_services_available: processedServices.length,
          services_already_included: processedServices.filter(s => s.is_already_included).length,
          estimated_cost_range: {
            min: processedTemplates.reduce((sum, t) => sum + t.pricing.base, 0),
            typical: processedTemplates.reduce((sum, t) => sum + t.pricing.typical, 0),
            max: processedTemplates.reduce((sum, t) => sum + t.pricing.comprehensive, 0)
          }
        }
      },
    });

  } catch (error) {
    console.error('Problem solutions fetch error:', error);

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

// POST endpoint for saving assessment data and accepting solutions
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
    const body = await request.json();
    const { action, ...data } = body;

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

    if (action === 'save_assessment') {
      const assessmentData = assessmentSchema.parse(data);

      // Upsert assessment data
      const upsertQuery = `
        INSERT INTO home_assessment_data (
          estimation_project_id, identified_problems, severity_scores,
          temperature_readings, humidity_readings, square_footage, home_age,
          insulation_condition, ductwork_condition, assessment_method,
          assessed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (estimation_project_id) DO UPDATE SET
          identified_problems = EXCLUDED.identified_problems,
          severity_scores = EXCLUDED.severity_scores,
          temperature_readings = EXCLUDED.temperature_readings,
          humidity_readings = EXCLUDED.humidity_readings,
          square_footage = EXCLUDED.square_footage,
          home_age = EXCLUDED.home_age,
          insulation_condition = EXCLUDED.insulation_condition,
          ductwork_condition = EXCLUDED.ductwork_condition,
          assessment_method = EXCLUDED.assessment_method,
          assessed_by = EXCLUDED.assessed_by,
          assessment_date = CURRENT_TIMESTAMP
        RETURNING id
      `;

      await query(upsertQuery, [
        id,
        JSON.stringify(assessmentData.identified_problems),
        JSON.stringify(assessmentData.severity_scores),
        JSON.stringify(assessmentData.temperature_readings || {}),
        JSON.stringify(assessmentData.humidity_readings || {}),
        assessmentData.home_characteristics?.square_footage || null,
        assessmentData.home_characteristics?.home_age || null,
        assessmentData.home_characteristics?.insulation_condition || null,
        assessmentData.home_characteristics?.ductwork_condition || null,
        assessmentData.assessment_method,
        user.id
      ]);

      return NextResponse.json({
        success: true,
        data: {
          message: 'Assessment data saved successfully',
          problems_identified: assessmentData.identified_problems.length
        }
      });

    } else if (action === 'accept_service') {
      const { service_id, phase_id, custom_price } = data;

      // Get service details
      const serviceQuery = `SELECT * FROM service_components WHERE id = $1`;
      const serviceResult = await query(serviceQuery, [service_id]);

      if (serviceResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } },
          { status: 404 }
        );
      }

      const service = serviceResult.rows[0];

      // Determine phase if not provided
      let targetPhaseId = phase_id;
      if (!targetPhaseId) {
        const phaseQuery = `
          SELECT id FROM estimation_phases 
          WHERE estimation_project_id = $1 AND phase_type = $2 AND active = TRUE
          ORDER BY display_order LIMIT 1
        `;
        const phaseResult = await query(phaseQuery, [id, service.service_category]);
        
        if (phaseResult.rows.length > 0) {
          targetPhaseId = phaseResult.rows[0].id;
        } else {
          // Create appropriate phase
          const createPhaseQuery = `
            INSERT INTO estimation_phases (
              estimation_project_id, phase_name, phase_type, display_order,
              complexity_multiplier, risk_factor_percentage
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `;
          const newPhaseResult = await query(createPhaseQuery, [
            id,
            `${service.service_category.charAt(0).toUpperCase() + service.service_category.slice(1)} Services`,
            service.service_category,
            999, // Put at end
            1.0,
            0
          ]);
          targetPhaseId = newPhaseResult.rows[0].id;
        }
      }

      // Calculate pricing
      const suggestedPrice = custom_price || service.price_range_max; // Use max as conservative estimate
      const laborHours = service.labor_hours_max || 4; // Default labor estimate

      // Add as line item
      const addLineItemQuery = `
        INSERT INTO estimation_line_items (
          estimation_phase_id, estimation_project_id, custom_item_name,
          description, quantity, unit_cost, unit_price, custom_unit_price,
          labor_hours_per_unit, labor_rate, labor_complexity_factor,
          source_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const lineItemResult = await query(addLineItemQuery, [
        targetPhaseId,
        id,
        service.service_name,
        service.service_description,
        1,
        service.price_range_min,
        service.price_range_max,
        custom_price || null,
        laborHours,
        85, // Standard labor rate
        service.complexity_level === 'complex' ? 1.3 : 1.0,
        'problem_solution',
        `Problem-solving service: ${service.service_category}`
      ]);

      return NextResponse.json({
        success: true,
        data: {
          message: 'Service added to estimation',
          line_item: lineItemResult.rows[0],
          service_name: service.service_name
        }
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('Problem solutions action error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid request data',
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