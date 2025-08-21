import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/supabase/server';
import { generateCostForecasting } from '@/lib/analytics';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { z } from 'zod';

const ForecastingQuerySchema = z.object({
  project_ids: z.string().transform(str => str.split(',')),
  forecast_horizon_days: z.string().transform(Number).optional().default(30),
  include_risk_analysis: z.enum(['true', 'false']).optional().transform(val => val === 'true').default(true),
  scenario_modeling: z.string().optional().transform(str => 
    str ? str.split(',') : ['realistic']
  ).pipe(z.array(z.enum(['optimistic', 'realistic', 'pessimistic']))),
  include_portfolio_analysis: z.enum(['true', 'false']).optional().transform(val => val === 'true').default(false),
});

const PortfolioForecastSchema = z.object({
  include_all_active: z.enum(['true', 'false']).optional().transform(val => val === 'true').default(true),
  status_filter: z.string().optional().transform(str => str ? str.split(',') : ['scheduled', 'in_progress']),
  forecast_horizon_days: z.string().transform(Number).optional().default(90),
  scenario_modeling: z.string().optional().transform(str => 
    str ? str.split(',') : ['realistic', 'pessimistic']
  ).pipe(z.array(z.enum(['optimistic', 'realistic', 'pessimistic']))),
});

/**
 * GET /api/analytics/forecasting - Generate cost forecasting for specific projects
 */
async function handleGet(request: NextRequest, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = ForecastingQuerySchema.parse(Object.fromEntries(searchParams));

    // Validate that projects exist and user has access
    const projectCheckResult = await query(
      `SELECT id, project_name, status, completion_percentage
       FROM projects 
       WHERE id = ANY($1)`,
      [queryParams.project_ids]
    );

    if (projectCheckResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No accessible projects found for the provided IDs',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const accessibleProjects = projectCheckResult.rows;
    const accessibleProjectIds = accessibleProjects.map(p => p.id);

    // Generate cost forecasting
    const forecastParameters = {
      project_ids: accessibleProjectIds,
      forecast_horizon_days: queryParams.forecast_horizon_days,
      include_risk_analysis: queryParams.include_risk_analysis,
      scenario_modeling: queryParams.scenario_modeling,
    };

    const forecastData = await generateCostForecasting(forecastParameters);

    // Add project context information
    const enrichedForecasts = forecastData.project_forecasts.map((forecast: any) => {
      const projectInfo = accessibleProjects.find(p => p.id === forecast.project_id);
      return {
        ...forecast,
        project_info: projectInfo,
      };
    });

    // Generate portfolio insights if requested
    let portfolioInsights = null;
    if (queryParams.include_portfolio_analysis) {
      portfolioInsights = await generatePortfolioInsights(accessibleProjectIds);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        project_forecasts: enrichedForecasts,
        portfolio_summary: forecastData.portfolio_summary,
        portfolio_insights: portfolioInsights,
        forecast_parameters: forecastParameters,
        projects_analyzed: accessibleProjects.length,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating cost forecasting:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid query parameters' : 'Failed to generate cost forecasting',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * POST /api/analytics/forecasting - Generate portfolio-wide forecasting
 */
async function handlePost(request: NextRequest, user: any) {
  try {
    const body = await request.json();
    const queryParams = PortfolioForecastSchema.parse(body);

    // Get all active projects if requested
    let projectIds: string[] = [];
    
    if (queryParams.include_all_active) {
      const activeProjectsResult = await query(
        `SELECT id FROM projects 
         WHERE status = ANY($1)
         ORDER BY created_at DESC`,
        [queryParams.status_filter]
      );
      
      projectIds = activeProjectsResult.rows.map(p => p.id);
    } else if (body.project_ids && Array.isArray(body.project_ids)) {
      projectIds = body.project_ids;
    }

    if (projectIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No projects found for portfolio analysis',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Generate comprehensive portfolio forecast
    const forecastParameters = {
      project_ids: projectIds,
      forecast_horizon_days: queryParams.forecast_horizon_days,
      include_risk_analysis: true,
      scenario_modeling: queryParams.scenario_modeling,
    };

    const [forecastData, portfolioAnalytics] = await Promise.all([
      generateCostForecasting(forecastParameters),
      generateComprehensivePortfolioAnalytics(projectIds),
    ]);

    // Calculate portfolio-level risk assessment
    const portfolioRisk = calculatePortfolioRiskAssessment(forecastData.project_forecasts);

    // Generate actionable recommendations
    const recommendations = generatePortfolioRecommendations(
      forecastData.project_forecasts,
      portfolioAnalytics
    );

    const response: ApiResponse<any> = {
      success: true,
      data: {
        portfolio_forecast: forecastData,
        portfolio_analytics: portfolioAnalytics,
        risk_assessment: portfolioRisk,
        recommendations: recommendations,
        analysis_scope: {
          projects_analyzed: projectIds.length,
          forecast_horizon_days: queryParams.forecast_horizon_days,
          scenarios_modeled: queryParams.scenario_modeling,
        },
      },
      message: 'Portfolio forecasting analysis completed',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating portfolio forecasting:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid request data' : 'Portfolio forecasting failed',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * Generate portfolio insights for specific projects
 */
async function generatePortfolioInsights(projectIds: string[]): Promise<any> {
  const insightsResult = await query(
    `SELECT 
       COUNT(*) as total_projects,
       SUM(budgeted_labor_cost) as total_budgeted_cost,
       SUM(actual_labor_cost) as total_actual_cost,
       AVG(completion_percentage) as avg_completion,
       COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed_projects,
       COUNT(CASE WHEN completion_percentage > 50 AND 
         (actual_labor_cost / NULLIF(budgeted_labor_cost, 0)) > 1.1 THEN 1 END) as over_budget_projects
     FROM projects 
     WHERE id = ANY($1)`,
    [projectIds]
  );

  const insights = insightsResult.rows[0];

  return {
    portfolio_health: {
      total_projects: parseInt(insights.total_projects),
      budget_performance: insights.total_budgeted_cost > 0 ? 
        (insights.total_actual_cost / insights.total_budgeted_cost) : 1.0,
      average_completion: parseFloat(insights.avg_completion) || 0,
      delayed_projects: parseInt(insights.delayed_projects),
      over_budget_projects: parseInt(insights.over_budget_projects),
    },
    risk_indicators: {
      budget_variance_risk: insights.over_budget_projects > (insights.total_projects * 0.3) ? 'high' : 'low',
      schedule_risk: insights.delayed_projects > (insights.total_projects * 0.2) ? 'high' : 'low',
    },
  };
}

/**
 * Generate comprehensive portfolio analytics
 */
async function generateComprehensivePortfolioAnalytics(projectIds: string[]): Promise<any> {
  // Resource utilization analysis
  const resourceUtilizationResult = await query(
    `SELECT 
       e.id, e.first_name, e.last_name, e.role,
       COUNT(DISTINCT p.id) as active_projects,
       SUM(CASE WHEN p.status IN ('scheduled', 'in_progress') THEN p.budgeted_hours ELSE 0 END) as total_hours_committed
     FROM employees e
     LEFT JOIN projects p ON (e.id = p.project_manager_id OR e.id = p.lead_technician_id)
     WHERE p.id = ANY($1) OR p.id IS NULL
     GROUP BY e.id, e.first_name, e.last_name, e.role
     ORDER BY total_hours_committed DESC`,
    [projectIds]
  );

  // Template usage analysis
  const templateUsageResult = await query(
    `SELECT 
       pt.id, pt.template_name, pt.equipment_category,
       COUNT(p.id) as usage_count,
       AVG(p.completion_percentage) as avg_completion,
       AVG(CASE WHEN p.status = 'completed' THEN 
         ABS((p.actual_hours - p.budgeted_hours) / NULLIF(p.budgeted_hours, 0))
       END) as avg_variance
     FROM project_templates pt
     LEFT JOIN projects p ON pt.id = p.template_id
     WHERE p.id = ANY($1)
     GROUP BY pt.id, pt.template_name, pt.equipment_category
     ORDER BY usage_count DESC`,
    [projectIds]
  );

  return {
    resource_utilization: resourceUtilizationResult.rows,
    template_performance: templateUsageResult.rows,
  };
}

/**
 * Calculate portfolio risk assessment
 */
function calculatePortfolioRiskAssessment(projectForecasts: any[]): any {
  const riskFactors = {
    budget_overrun_risk: 0,
    schedule_delay_risk: 0,
    resource_conflict_risk: 0,
    overall_risk_level: 'low' as 'low' | 'medium' | 'high' | 'critical',
  };

  // Calculate budget overrun risk
  const overBudgetProjects = projectForecasts.filter(f => 
    f.current_status.budget_consumed_percentage > 100
  ).length;
  riskFactors.budget_overrun_risk = overBudgetProjects / projectForecasts.length;

  // Calculate schedule delay risk
  const atRiskProjects = projectForecasts.filter(f => 
    f.forecasts.realistic.completion_confidence < 0.7
  ).length;
  riskFactors.schedule_delay_risk = atRiskProjects / projectForecasts.length;

  // Determine overall risk level
  const maxRisk = Math.max(riskFactors.budget_overrun_risk, riskFactors.schedule_delay_risk);
  if (maxRisk > 0.4) {
    riskFactors.overall_risk_level = 'critical';
  } else if (maxRisk > 0.25) {
    riskFactors.overall_risk_level = 'high';
  } else if (maxRisk > 0.15) {
    riskFactors.overall_risk_level = 'medium';
  }

  return riskFactors;
}

/**
 * Generate portfolio recommendations
 */
function generatePortfolioRecommendations(projectForecasts: any[], portfolioAnalytics: any): any[] {
  const recommendations = [];

  // Check for resource conflicts
  const highUtilizationResources = portfolioAnalytics.resource_utilization.filter(
    (r: any) => r.total_hours_committed > 160 // More than 4 weeks of work
  );

  if (highUtilizationResources.length > 0) {
    recommendations.push({
      type: 'resource_management',
      priority: 'high',
      title: 'Resource Overallocation Detected',
      description: `${highUtilizationResources.length} team members are overallocated`,
      action: 'Consider redistributing work or hiring additional staff',
    });
  }

  // Check for template performance issues
  const underperformingTemplates = portfolioAnalytics.template_performance.filter(
    (t: any) => t.avg_variance > 0.3
  );

  if (underperformingTemplates.length > 0) {
    recommendations.push({
      type: 'template_optimization',
      priority: 'medium',
      title: 'Template Accuracy Issues',
      description: `${underperformingTemplates.length} templates have high variance`,
      action: 'Review and update time estimates for affected templates',
    });
  }

  return recommendations;
}

// Export route handlers
export const GET = withAuth(handleGet, { allowedUserTypes: ['owner', 'employee'] });
export const POST = withAuth(handlePost, { allowedUserTypes: ['owner', 'employee'] });