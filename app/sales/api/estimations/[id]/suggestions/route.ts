import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';
import { z } from 'zod';

const suggestionsQuerySchema = z.object({
  equipment_tier: z.string().optional().default('standard'),
  include_dismissed: z.string().optional().transform(val => val === 'true'),
  priority_filter: z.string().optional(),
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
    const { equipment_tier, include_dismissed, priority_filter } = suggestionsQuerySchema.parse(queryParams);

    // Check if estimation exists and user has access
    const estimationQuery = `
      SELECT id, sales_rep_id, quote_type FROM estimation_projects WHERE id = $1
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

    // Get component suggestions using the database function
    let suggestionsQuery = `
      SELECT * FROM get_component_suggestions($1, $2)
    `;
    let suggestParams = [estimation.quote_type, equipment_tier];

    // Apply priority filter if specified
    if (priority_filter) {
      suggestionsQuery += ` WHERE priority = $3`;
      suggestParams.push(priority_filter);
    }

    const suggestionsResult = await query(suggestionsQuery, suggestParams);

    // Get project type suggestions for context
    const projectSuggestionsQuery = `
      SELECT * FROM project_type_suggestions 
      WHERE project_type = $1 AND equipment_tier = $2 AND active = TRUE
    `;
    const projectSuggestionsResult = await query(projectSuggestionsQuery, [estimation.quote_type, equipment_tier]);

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

    // Process suggestions and mark as already included if applicable
    const processedSuggestions = suggestionsResult.rows.map(suggestion => {
      const isAlreadyIncluded = existingItems.some(existing => 
        existing.toLowerCase().includes(suggestion.component_name.toLowerCase()) ||
        suggestion.component_name.toLowerCase().includes(existing.toLowerCase())
      );

      return {
        id: suggestion.suggestion_id,
        component_name: suggestion.component_name,
        reason: suggestion.reason,
        likelihood: suggestion.likelihood,
        cost_range: {
          min: suggestion.cost_min,
          max: suggestion.cost_max
        },
        category: suggestion.category,
        priority: suggestion.priority,
        educational_content: suggestion.educational_content,
        roi_information: suggestion.roi_info,
        is_already_included: isAlreadyIncluded,
        estimated_savings_annual: calculateEstimatedSavings(suggestion),
        installation_complexity: getInstallationComplexity(suggestion.category, suggestion.priority)
      };
    });

    // Filter out dismissed suggestions if not explicitly requested
    let filteredSuggestions = processedSuggestions;
    if (!include_dismissed) {
      // This would check against a user preferences table if implemented
      // For now, return all suggestions
    }

    // Get task dependencies for scheduling context
    const taskDependenciesQuery = `
      SELECT task_name, depends_on, dependency_type, minimum_gap_hours,
             weather_dependent, weather_buffer, complexity_multiplier
      FROM get_task_dependencies($1)
    `;
    const taskDependenciesResult = await query(taskDependenciesQuery, [estimation.quote_type]);

    return NextResponse.json({
      success: true,
      data: {
        estimation_id: id,
        project_type: estimation.quote_type,
        equipment_tier: equipment_tier,
        suggestions: filteredSuggestions,
        project_baseline: projectSuggestionsResult.rows[0] || null,
        task_dependencies: taskDependenciesResult.rows,
        summary: {
          total_suggestions: filteredSuggestions.length,
          required_count: filteredSuggestions.filter(s => s.priority === 'required').length,
          recommended_count: filteredSuggestions.filter(s => s.priority === 'recommended').length,
          optional_count: filteredSuggestions.filter(s => s.priority === 'optional').length,
          total_potential_cost: filteredSuggestions.reduce((sum, s) => sum + s.cost_range.max, 0),
          already_included_count: filteredSuggestions.filter(s => s.is_already_included).length
        }
      },
    });

  } catch (error) {
    console.error('Component suggestions fetch error:', error);

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

// Helper functions
function calculateEstimatedSavings(suggestion: any): number | null {
  const component = suggestion.component_name.toLowerCase();
  
  // Estimated annual savings based on component type
  if (component.includes('smart thermostat')) {
    return 250; // Average $250/year savings
  } else if (component.includes('duct sealing')) {
    return 300; // Average $300/year savings
  } else if (component.includes('surge protection')) {
    return 0; // No operational savings, insurance value
  } else if (component.includes('air quality')) {
    return 0; // Health benefits, not direct cost savings
  }
  
  return null;
}

function getInstallationComplexity(category: string, priority: string): 'low' | 'medium' | 'high' {
  if (category === 'electrical' && priority === 'required') {
    return 'high';
  } else if (category === 'ductwork') {
    return 'medium';
  } else if (category === 'controls' || category === 'accessory') {
    return 'low';
  }
  
  return 'medium';
}

// POST endpoint for accepting/dismissing suggestions
const acceptSuggestionSchema = z.object({
  suggestion_id: z.string().uuid(),
  action: z.enum(['accept', 'dismiss']),
  add_to_phase_id: z.string().uuid().optional(),
  custom_price: z.number().min(0).optional(),
  notes: z.string().optional()
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
    const { suggestion_id, action, add_to_phase_id, custom_price, notes } = acceptSuggestionSchema.parse(body);

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

    if (action === 'accept') {
      // Get suggestion details
      const suggestionQuery = `
        SELECT * FROM component_dependencies WHERE id = $1
      `;
      const suggestionResult = await query(suggestionQuery, [suggestion_id]);

      if (suggestionResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'SUGGESTION_NOT_FOUND', message: 'Suggestion not found' } },
          { status: 404 }
        );
      }

      const suggestion = suggestionResult.rows[0];

      // Determine phase to add to
      let phaseId = add_to_phase_id;
      if (!phaseId) {
        // Auto-select phase based on component category
        const phaseQuery = `
          SELECT id FROM estimation_phases 
          WHERE estimation_project_id = $1 AND phase_type = $2 AND active = TRUE
          ORDER BY display_order LIMIT 1
        `;
        const phaseResult = await query(phaseQuery, [id, suggestion.component_category]);
        
        if (phaseResult.rows.length > 0) {
          phaseId = phaseResult.rows[0].id;
        } else {
          // Default to first phase
          const defaultPhaseQuery = `
            SELECT id FROM estimation_phases 
            WHERE estimation_project_id = $1 AND active = TRUE
            ORDER BY display_order LIMIT 1
          `;
          const defaultPhaseResult = await query(defaultPhaseQuery, [id]);
          if (defaultPhaseResult.rows.length > 0) {
            phaseId = defaultPhaseResult.rows[0].id;
          }
        }
      }

      if (!phaseId) {
        return NextResponse.json(
          { success: false, error: { code: 'NO_PHASE_AVAILABLE', message: 'No suitable phase found for component' } },
          { status: 400 }
        );
      }

      // Calculate pricing
      const costRange = JSON.parse(suggestion.typical_cost_range);
      const suggestedPrice = custom_price || costRange.max; // Use max as conservative estimate
      const laborHours = suggestion.component_category === 'electrical' ? 2 : 1; // Electrical takes longer

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
        phaseId,
        id,
        suggestion.suggested_component,
        suggestion.suggestion_reason,
        1,
        costRange.min,
        costRange.max,
        custom_price || null,
        laborHours,
        85, // Standard labor rate
        1.0,
        'suggestion',
        notes || `Added from suggestion: ${suggestion.suggestion_reason}`
      ]);

      // Record in history
      await query(`
        INSERT INTO estimation_calculation_history (
          estimation_project_id, user_id, change_type, change_description,
          calculation_snapshot
        ) VALUES ($1, $2, 'suggestion_accepted', $3, $4)
      `, [
        id,
        user.id,
        `Accepted suggestion: ${suggestion.suggested_component}`,
        JSON.stringify({
          suggestion_id: suggestion_id,
          component: suggestion.suggested_component,
          cost_range: costRange,
          final_price: suggestedPrice,
          phase_id: phaseId
        })
      ]);

      return NextResponse.json({
        success: true,
        data: {
          message: 'Suggestion accepted and added to estimation',
          line_item: lineItemResult.rows[0],
          suggestion_id: suggestion_id
        }
      });

    } else if (action === 'dismiss') {
      // Record dismissal for future reference
      // This could be stored in a user preferences table
      console.log(`User ${user.id} dismissed suggestion ${suggestion_id}`);

      return NextResponse.json({
        success: true,
        data: {
          message: 'Suggestion dismissed',
          suggestion_id: suggestion_id
        }
      });
    }

    // Default response for unknown actions
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('Suggestion action error:', error);

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