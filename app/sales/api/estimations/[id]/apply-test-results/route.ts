import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const applyTestResultsSchema = z.object({
  test_result_id: z.string().uuid(),
  selected_services: z.array(z.object({
    service_id: z.string().uuid(),
    custom_price: z.number().optional(),
    phase_id: z.string().uuid().optional(),
    notes: z.string().optional()
  })),
  auto_create_phases: z.boolean().default(true)
});

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
    
    // Validate request data
    const requestData = applyTestResultsSchema.parse(body);

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT ep.id, ep.sales_rep_id, ep.project_name
      FROM estimation_projects ep
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

    // Verify test result exists and belongs to this estimation
    const testResultQuery = `
      SELECT tr.id, tr.test_date, dt.test_name
      FROM test_results tr
      JOIN diagnostic_tests dt ON tr.diagnostic_test_id = dt.id
      WHERE tr.id = $1 AND tr.estimation_project_id = $2 AND tr.active = TRUE
    `;
    
    const testResultResult = await query(testResultQuery, [requestData.test_result_id, id]);

    if (testResultResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'TEST_RESULT_NOT_FOUND', message: 'Test result not found for this estimation' } },
        { status: 404 }
      );
    }

    const testResult = testResultResult.rows[0];
    const addedServices = [];
    const skippedServices = [];

    // Process each selected service
    for (const selectedService of requestData.selected_services) {
      try {
        // Get service details
        const serviceQuery = `
          SELECT * FROM test_driven_services WHERE id = $1 AND active = TRUE
        `;
        const serviceResult = await query(serviceQuery, [selectedService.service_id]);

        if (serviceResult.rows.length === 0) {
          skippedServices.push({
            service_id: selectedService.service_id,
            reason: 'Service not found or inactive'
          });
          continue;
        }

        const service = serviceResult.rows[0];

        // Determine target phase
        let targetPhaseId = selectedService.phase_id;
        
        if (!targetPhaseId && requestData.auto_create_phases) {
          // Find existing phase for this service category or create one
          const phaseQuery = `
            SELECT id FROM estimation_phases 
            WHERE estimation_project_id = $1 AND phase_type = $2 AND active = TRUE
            ORDER BY display_order LIMIT 1
          `;
          const phaseResult = await query(phaseQuery, [id, service.service_category]);
          
          if (phaseResult.rows.length > 0) {
            targetPhaseId = phaseResult.rows[0].id;
          } else {
            // Create new phase for this service category
            const createPhaseQuery = `
              INSERT INTO estimation_phases (
                estimation_project_id, phase_name, phase_type, display_order,
                complexity_multiplier, risk_factor_percentage
              ) VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id
            `;
            
            const phaseName = `${service.service_category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Services`;
            const newPhaseResult = await query(createPhaseQuery, [
              id,
              phaseName,
              service.service_category,
              999, // Put at end
              1.0,
              0
            ]);
            targetPhaseId = newPhaseResult.rows[0].id;
          }
        }

        if (!targetPhaseId) {
          skippedServices.push({
            service_id: selectedService.service_id,
            service_name: service.service_name,
            reason: 'No target phase specified and auto-create disabled'
          });
          continue;
        }

        // Determine pricing
        const finalPrice = selectedService.custom_price || service.typical_price;
        const laborHours = (service.labor_hours_min + service.labor_hours_max) / 2 || 4;

        // Add as line item with test-driven source
        const addLineItemQuery = `
          INSERT INTO estimation_line_items (
            estimation_phase_id, estimation_project_id, custom_item_name,
            description, quantity, unit_cost, unit_price, custom_unit_price,
            labor_hours_per_unit, labor_rate, labor_complexity_factor,
            source_type, template_source, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;

        const lineItemResult = await query(addLineItemQuery, [
          targetPhaseId,
          id,
          service.service_name,
          service.service_description,
          1,
          finalPrice * 0.65, // Assume 35% markup
          service.typical_price,
          selectedService.custom_price || null,
          laborHours,
          85, // Standard labor rate
          1.0,
          'test_driven',
          `Based on ${testResult.test_name} results`,
          selectedService.notes || `Recommended based on diagnostic test results from ${testResult.test_date.toISOString().split('T')[0]}`
        ]);

        addedServices.push({
          service_id: selectedService.service_id,
          service_name: service.service_name,
          line_item_id: lineItemResult.rows[0].id,
          price: finalPrice
        });

      } catch (serviceError) {
        console.error(`Error adding service ${selectedService.service_id}:`, serviceError);
        skippedServices.push({
          service_id: selectedService.service_id,
          reason: 'Error during service addition'
        });
      }
    }

    // Update test result to mark services as applied
    const updateTestResultQuery = `
      UPDATE test_results 
      SET recommended_services = $1, customer_reviewed = TRUE
      WHERE id = $2
    `;
    
    const appliedServiceIds = addedServices.map(s => s.service_id);
    await query(updateTestResultQuery, [JSON.stringify(appliedServiceIds), requestData.test_result_id]);

    // Trigger recalculation of estimation totals
    const recalculateQuery = `
      SELECT recalculate_estimation_totals($1)
    `;
    await query(recalculateQuery, [id]);

    return NextResponse.json({
      success: true,
      data: {
        estimation_id: id,
        test_result_id: requestData.test_result_id,
        services_added: addedServices.length,
        services_skipped: skippedServices.length,
        added_services: addedServices,
        skipped_services: skippedServices,
        message: `Successfully applied ${addedServices.length} test-driven service recommendations`
      }
    });

  } catch (error) {
    console.error('Apply test results error:', error);

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