import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { 
  calculateProjectPerformanceMetrics, 
  generateCostForecasting, 
  analyzeTemplateEffectiveness 
} from '@/lib/analytics';
import { ApiResponse } from '@/types';
import { z } from 'zod';

// Validation schemas
const PerformanceAnalysisQuerySchema = z.object({
  project_ids: z.string().optional().transform(str => str ? str.split(',') : undefined),
  date_range: z.enum(['30d', '90d', '1y', 'custom']).optional().default('90d'),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  metrics: z.string().optional().transform(str => str ? str.split(',') : ['time', 'cost', 'quality']),
  aggregation: z.enum(['project', 'phase', 'task', 'employee', 'template']).optional().default('project'),
});

const CostForecastQuerySchema = z.object({
  project_ids: z.string().transform(str => str.split(',')),
  forecast_horizon_days: z.string().transform(Number).optional().default(30),
  include_risk_analysis: z.enum(['true', 'false']).optional().transform(val => val === 'true').default(true),
  scenario_modeling: z.string().optional().transform(str => 
    str ? str.split(',') : ['realistic']
  ).pipe(z.array(z.enum(['optimistic', 'realistic', 'pessimistic']))),
});

/**
 * GET /api/analytics - Get project performance analytics
 */
async function handleGet(request: NextRequest, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = PerformanceAnalysisQuerySchema.parse(Object.fromEntries(searchParams));

    // Validate date range for custom option
    if (queryParams.date_range === 'custom') {
      if (!queryParams.start_date || !queryParams.end_date) {
        return NextResponse.json(
          {
            success: false,
            message: 'start_date and end_date are required when using custom date range',
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    // Build parameters for analytics function
    const analysisParameters = {
      project_ids: queryParams.project_ids,
      date_range: queryParams.date_range,
      start_date: queryParams.start_date,
      end_date: queryParams.end_date,
      metrics: queryParams.metrics as ('time' | 'cost' | 'quality' | 'customer_satisfaction')[],
      aggregation: queryParams.aggregation as 'project' | 'phase' | 'task' | 'employee' | 'template',
    };

    // Calculate performance metrics
    const performanceData = await calculateProjectPerformanceMetrics(analysisParameters);

    // Analyze template effectiveness if no specific projects are requested
    let templateEffectiveness = null;
    if (!queryParams.project_ids) {
      templateEffectiveness = await analyzeTemplateEffectiveness();
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        performance_metrics: performanceData,
        template_effectiveness: templateEffectiveness,
        analysis_parameters: analysisParameters,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid query parameters' : 'Failed to generate analytics',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * POST /api/analytics - Generate cost forecasting
 */
async function handlePost(request: NextRequest, user: any) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'cost_forecast') {
      const validatedData = CostForecastQuerySchema.parse(body.parameters);

      const forecastParameters = {
        project_ids: validatedData.project_ids,
        forecast_horizon_days: validatedData.forecast_horizon_days,
        include_risk_analysis: validatedData.include_risk_analysis,
        scenario_modeling: validatedData.scenario_modeling,
      };

      const forecastData = await generateCostForecasting(forecastParameters);

      const response: ApiResponse<any> = {
        success: true,
        data: forecastData,
        message: 'Cost forecast generated successfully',
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);

    } else if (action === 'template_analysis') {
      const templateData = await analyzeTemplateEffectiveness();

      const response: ApiResponse<any> = {
        success: true,
        data: templateData,
        message: 'Template effectiveness analysis completed',
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);

    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid action. Supported actions: cost_forecast, template_analysis',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in analytics operation:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid request data' : 'Analytics operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// Export route handlers
export const GET = withAuth(handleGet, { allowedUserTypes: ['owner', 'employee'] });
export const POST = withAuth(handlePost, { allowedUserTypes: ['owner', 'employee'] });