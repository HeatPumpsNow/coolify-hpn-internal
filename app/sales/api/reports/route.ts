import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const reportsQuerySchema = z.object({
  report_type: z.enum(['overview', 'pipeline', 'activities', 'performance']).default('overview'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sales_rep_id: z.string().uuid().optional(),
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
    const { report_type, date_from, date_to, sales_rep_id } = reportsQuerySchema.parse(params);

    // Build base filter conditions
    let baseWhere = '';
    let baseParams: any[] = [];
    let paramCount = 0;

    // Role-based filtering
    if (user.role === 'sales_rep') {
      paramCount++;
      baseWhere += `sales_rep_id = $${paramCount}`;
      baseParams.push(user.id);
    } else if (sales_rep_id) {
      paramCount++;
      baseWhere += `sales_rep_id = $${paramCount}`;
      baseParams.push(sales_rep_id);
    }

    // Date filtering
    if (date_from) {
      paramCount++;
      const dateCondition = `created_at >= $${paramCount}`;
      baseWhere = baseWhere ? `${baseWhere} AND ${dateCondition}` : dateCondition;
      baseParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      const dateCondition = `created_at <= $${paramCount}`;
      baseWhere = baseWhere ? `${baseWhere} AND ${dateCondition}` : dateCondition;
      baseParams.push(date_to);
    }

    const whereClause = baseWhere ? `WHERE ${baseWhere}` : '';

    switch (report_type) {
      case 'overview':
        return await getOverviewReport(whereClause, baseParams);
      case 'pipeline':
        return await getPipelineReport(whereClause, baseParams);
      case 'activities':
        return await getActivitiesReport(whereClause, baseParams);
      case 'performance':
        return await getPerformanceReport(whereClause, baseParams);
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_REPORT_TYPE', message: 'Invalid report type' } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Reports fetch error:', error);

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

async function getOverviewReport(whereClause: string, params: any[]) {
  // Get overall statistics
  const overviewQuery = `
    SELECT 
      COUNT(DISTINCT l.id) as total_leads,
      COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) as qualified_leads,
      COUNT(DISTINCT p.id) as total_quotes,
      COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as accepted_quotes,
      COUNT(DISTINCT CASE WHEN p.status = 'sent' THEN p.id END) as pending_quotes,
      COALESCE(SUM(CASE WHEN p.status = 'accepted' THEN p.total_amount END), 0) as total_revenue,
      COALESCE(SUM(p.total_amount), 0) as pipeline_value,
      COUNT(DISTINCT a.id) as total_activities
    FROM sales_leads l
    LEFT JOIN proposals p ON l.id = p.lead_id
    LEFT JOIN sales_activities a ON l.id = a.lead_id
    ${whereClause.replace(/sales_rep_id/g, 'l.sales_rep_id')}
  `;

  const overviewResult = await query(overviewQuery, params);

  // Get monthly trends (last 6 months)
  const trendsQuery = `
    SELECT 
      DATE_TRUNC('month', l.created_at) as month,
      COUNT(DISTINCT l.id) as leads_count,
      COUNT(DISTINCT p.id) as quotes_count,
      COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as closed_deals,
      COALESCE(SUM(CASE WHEN p.status = 'accepted' THEN p.total_amount END), 0) as revenue
    FROM sales_leads l
    LEFT JOIN proposals p ON l.id = p.lead_id
    WHERE l.created_at >= NOW() - INTERVAL '6 months'
    ${whereClause ? `AND ${whereClause.replace(/sales_rep_id/g, 'l.sales_rep_id')}` : ''}
    GROUP BY DATE_TRUNC('month', l.created_at)
    ORDER BY month DESC
    LIMIT 6
  `;

  const trendsResult = await query(trendsQuery, params);

  // Get top performing sales reps (if user is manager)
  let topRepsResult = { rows: [] };
  if (params.length === 0) { // No specific rep filter
    const topRepsQuery = `
      SELECT 
        sr.first_name, sr.last_name,
        COUNT(DISTINCT l.id) as leads_count,
        COUNT(DISTINCT p.id) as quotes_count,
        COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as deals_closed,
        COALESCE(SUM(CASE WHEN p.status = 'accepted' THEN p.total_amount END), 0) as revenue
      FROM sales_reps sr
      LEFT JOIN sales_leads l ON sr.id = l.sales_rep_id
      LEFT JOIN proposals p ON l.id = p.lead_id
      WHERE l.created_at >= NOW() - INTERVAL '3 months'
      GROUP BY sr.id, sr.first_name, sr.last_name
      ORDER BY revenue DESC
      LIMIT 5
    `;
    topRepsResult = await query(topRepsQuery);
  }

  return NextResponse.json({
    success: true,
    data: {
      overview: overviewResult.rows[0],
      trends: trendsResult.rows,
      top_reps: topRepsResult.rows,
    },
  });
}

async function getPipelineReport(whereClause: string, params: any[]) {
  // Pipeline by stage
  const pipelineQuery = `
    SELECT 
      l.status as stage,
      COUNT(*) as count,
      COALESCE(AVG(
        CASE WHEN p.total_amount IS NOT NULL THEN p.total_amount 
        ELSE 15000 END
      ), 0) as avg_value,
      COALESCE(SUM(
        CASE WHEN p.total_amount IS NOT NULL THEN p.total_amount 
        ELSE 15000 END
      ), 0) as total_value
    FROM sales_leads l
    LEFT JOIN proposals p ON l.id = p.lead_id
    ${whereClause.replace(/sales_rep_id/g, 'l.sales_rep_id')}
    GROUP BY l.status
    ORDER BY 
      CASE l.status 
        WHEN 'new' THEN 1
        WHEN 'contacted' THEN 2
        WHEN 'qualified' THEN 3
        WHEN 'quoted' THEN 4
        WHEN 'closed_won' THEN 5
        WHEN 'closed_lost' THEN 6
        ELSE 7
      END
  `;

  const pipelineResult = await query(pipelineQuery, params);

  // Conversion rates
  const conversionQuery = `
    SELECT 
      COUNT(DISTINCT l.id) as total_leads,
      COUNT(DISTINCT CASE WHEN l.status IN ('qualified', 'quoted', 'closed_won') THEN l.id END) as qualified_leads,
      COUNT(DISTINCT p.id) as total_quotes,
      COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as accepted_quotes
    FROM sales_leads l
    LEFT JOIN proposals p ON l.id = p.lead_id
    ${whereClause.replace(/sales_rep_id/g, 'l.sales_rep_id')}
  `;

  const conversionResult = await query(conversionQuery, params);

  return NextResponse.json({
    success: true,
    data: {
      pipeline_stages: pipelineResult.rows,
      conversion_metrics: conversionResult.rows[0],
    },
  });
}

async function getActivitiesReport(whereClause: string, params: any[]) {
  // Activities by type
  const activitiesQuery = `
    SELECT 
      at.name as activity_type,
      at.icon,
      at.color,
      COUNT(a.id) as count,
      AVG(a.duration_minutes) as avg_duration
    FROM sales_activities a
    LEFT JOIN activity_types at ON a.activity_type_id = at.id
    LEFT JOIN sales_leads l ON a.lead_id = l.id
    ${whereClause.replace(/sales_rep_id/g, 'a.sales_rep_id')}
    GROUP BY at.id, at.name, at.icon, at.color
    ORDER BY count DESC
  `;

  const activitiesResult = await query(activitiesQuery, params);

  // Activities timeline (last 30 days)
  const timelineQuery = `
    SELECT 
      DATE(a.created_at) as date,
      COUNT(*) as activity_count,
      COUNT(DISTINCT a.lead_id) as leads_touched
    FROM sales_activities a
    LEFT JOIN sales_leads l ON a.lead_id = l.id
    WHERE a.created_at >= NOW() - INTERVAL '30 days'
    ${whereClause ? `AND ${whereClause.replace(/sales_rep_id/g, 'a.sales_rep_id')}` : ''}
    GROUP BY DATE(a.created_at)
    ORDER BY date DESC
    LIMIT 30
  `;

  const timelineResult = await query(timelineQuery, params);

  // Upcoming activities
  const upcomingQuery = `
    SELECT 
      a.subject,
      a.scheduled_at,
      at.name as activity_type,
      l.customer_info,
      l.lead_number
    FROM sales_activities a
    LEFT JOIN activity_types at ON a.activity_type_id = at.id
    LEFT JOIN sales_leads l ON a.lead_id = l.id
    WHERE a.status = 'pending' AND a.scheduled_at IS NOT NULL
    ${whereClause ? `AND ${whereClause.replace(/sales_rep_id/g, 'a.sales_rep_id')}` : ''}
    ORDER BY a.scheduled_at ASC
    LIMIT 10
  `;

  const upcomingResult = await query(upcomingQuery, params);

  return NextResponse.json({
    success: true,
    data: {
      activities_by_type: activitiesResult.rows,
      activity_timeline: timelineResult.rows,
      upcoming_activities: upcomingResult.rows.map(row => ({
        ...row,
        customer_info: typeof row.customer_info === 'string' ? JSON.parse(row.customer_info) : row.customer_info,
      })),
    },
  });
}

async function getPerformanceReport(whereClause: string, params: any[]) {
  // Performance metrics
  const performanceQuery = `
    SELECT 
      COUNT(DISTINCT l.id) as leads_generated,
      COUNT(DISTINCT p.id) as quotes_created,
      COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as deals_closed,
      COALESCE(SUM(CASE WHEN p.status = 'accepted' THEN p.total_amount END), 0) as revenue,
      COALESCE(AVG(CASE WHEN p.status = 'accepted' THEN p.total_amount END), 0) as avg_deal_size,
      COUNT(DISTINCT a.id) as activities_completed,
      COALESCE(AVG(a.duration_minutes), 0) as avg_activity_duration
    FROM sales_leads l
    LEFT JOIN proposals p ON l.id = p.lead_id
    LEFT JOIN sales_activities a ON l.id = a.lead_id
    ${whereClause.replace(/sales_rep_id/g, 'l.sales_rep_id')}
  `;

  const performanceResult = await query(performanceQuery, params);

  // Quote response times
  const responseTimeQuery = `
    SELECT 
      AVG(EXTRACT(EPOCH FROM (p.created_at - l.created_at)) / 86400) as avg_days_to_quote,
      AVG(EXTRACT(EPOCH FROM (
        CASE WHEN p.status = 'accepted' THEN p.updated_at ELSE NULL END - p.created_at
      )) / 86400) as avg_days_to_close
    FROM sales_leads l
    LEFT JOIN proposals p ON l.id = p.lead_id
    ${whereClause.replace(/sales_rep_id/g, 'l.sales_rep_id')}
  `;

  const responseTimeResult = await query(responseTimeQuery, params);

  return NextResponse.json({
    success: true,
    data: {
      performance_metrics: {
        ...performanceResult.rows[0],
        ...responseTimeResult.rows[0],
      },
    },
  });
}