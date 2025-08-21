import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { analyzeTemplateEffectiveness } from '@/lib/analytics';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { z } from 'zod';

const TemplateAnalysisQuerySchema = z.object({
  template_ids: z.string().optional().transform(str => str ? str.split(',') : undefined),
  include_recommendations: z.enum(['true', 'false']).optional().transform(val => val === 'true').default(true),
  min_usage_count: z.string().transform(Number).optional().default(1),
});

/**
 * GET /api/analytics/templates - Get detailed template effectiveness analysis
 */
async function handleGet(request: NextRequest, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = TemplateAnalysisQuerySchema.parse(Object.fromEntries(searchParams));

    // Get comprehensive template effectiveness analysis
    const templateAnalysis = await analyzeTemplateEffectiveness();

    // Filter by specific template IDs if requested
    let filteredAnalysis = templateAnalysis;
    if (queryParams.template_ids) {
      filteredAnalysis = {
        ...templateAnalysis,
        template_rankings: templateAnalysis.template_rankings.filter(ranking =>
          queryParams.template_ids!.includes(ranking.template_id)
        ),
        recommended_updates: templateAnalysis.recommended_updates.filter(update =>
          queryParams.template_ids!.includes(update.template_id)
        ),
      };
    }

    // Filter by minimum usage count
    if (queryParams.min_usage_count > 1) {
      filteredAnalysis = {
        ...filteredAnalysis,
        template_rankings: filteredAnalysis.template_rankings.filter(ranking =>
          ranking.usage_count >= queryParams.min_usage_count
        ),
      };
    }

    // Get detailed project history for top templates
    const topTemplates = filteredAnalysis.template_rankings
      .slice(0, 5)
      .map(t => t.template_id);

    const projectHistoryResult = await query(
      `SELECT p.id, p.project_name, p.status, p.completion_percentage,
              p.budgeted_hours, p.actual_hours, p.budgeted_labor_cost, p.actual_labor_cost,
              p.customer_satisfaction_score, p.created_at, pt.template_name
       FROM projects p
       JOIN project_templates pt ON p.template_id = pt.id
       WHERE p.template_id = ANY($1)
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [topTemplates]
    );

    const projectHistory = projectHistoryResult.rows;

    // Calculate template trends over time
    const trendsResult = await query(
      `SELECT pt.id as template_id, pt.template_name,
              DATE_TRUNC('month', p.created_at) as month,
              COUNT(*) as projects_count,
              AVG(CASE WHEN p.status = 'completed' THEN 
                ABS((p.actual_hours - p.budgeted_hours) / NULLIF(p.budgeted_hours, 0))
              END) as avg_time_variance,
              AVG(p.customer_satisfaction_score) as avg_satisfaction
       FROM project_templates pt
       LEFT JOIN projects p ON pt.id = p.template_id
       WHERE pt.id = ANY($1) 
         AND p.created_at >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY pt.id, pt.template_name, DATE_TRUNC('month', p.created_at)
       ORDER BY pt.template_name, month`,
      [topTemplates]
    );

    const trends = trendsResult.rows;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        template_effectiveness: filteredAnalysis,
        project_history: projectHistory,
        performance_trends: trends,
        analysis_parameters: queryParams,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating template analytics:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid query parameters' : 'Failed to generate template analytics',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// Export route handler
export const GET = withAuth(handleGet, { allowedUserTypes: ['owner', 'employee'] });