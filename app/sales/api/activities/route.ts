import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const activitiesQuerySchema = z.object({
  lead_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'cancelled', 'overdue']).optional(),
  activity_type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

const createActivitySchema = z.object({
  lead_id: z.string().uuid('Valid lead ID is required'),
  quote_id: z.string().uuid().optional(),
  activity_type_id: z.string().uuid('Valid activity type is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  outcome: z.string().optional(),
  duration_minutes: z.number().min(0).optional(),
  scheduled_at: z.string().optional(),
  completed_at: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  follow_up_date: z.string().optional(),
  follow_up_notes: z.string().optional(),
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
    const { lead_id, quote_id, status, activity_type, date_from, date_to, page, limit } = activitiesQuerySchema.parse(params);

    // Build dynamic query
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 0;

    // Filter by sales rep (for non-managers)
    if (user.role === 'sales_rep') {
      paramCount++;
      whereConditions.push(`a.sales_rep_id = $${paramCount}`);
      queryParams.push(user.id);
    }

    if (lead_id) {
      paramCount++;
      whereConditions.push(`a.lead_id = $${paramCount}`);
      queryParams.push(lead_id);
    }

    if (quote_id) {
      paramCount++;
      whereConditions.push(`a.quote_id = $${paramCount}`);
      queryParams.push(quote_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`a.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (activity_type) {
      paramCount++;
      whereConditions.push(`at.name = $${paramCount}`);
      queryParams.push(activity_type);
    }

    if (date_from) {
      paramCount++;
      whereConditions.push(`a.created_at >= $${paramCount}`);
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      whereConditions.push(`a.created_at <= $${paramCount}`);
      queryParams.push(date_to);
    }

    const offset = (page - 1) * limit;
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM sales_activities a 
      LEFT JOIN activity_types at ON a.activity_type_id = at.id 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const activitiesQuery = `
      SELECT 
        a.id, a.lead_id, a.quote_id, a.subject, a.description, a.outcome,
        a.duration_minutes, a.scheduled_at, a.completed_at, a.status,
        a.follow_up_date, a.follow_up_notes, a.created_at, a.updated_at,
        at.name as activity_type, at.icon, at.color,
        l.lead_number, l.customer_info,
        p.quote_number,
        sr.first_name as rep_first_name, sr.last_name as rep_last_name
      FROM sales_activities a
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN sales_leads l ON a.lead_id = l.id
      LEFT JOIN proposals p ON a.quote_id = p.id
      LEFT JOIN sales_reps sr ON a.sales_rep_id = sr.id
      ${whereClause}
      ORDER BY 
        CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END,
        COALESCE(a.scheduled_at, a.created_at) DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const activitiesResult = await query(activitiesQuery, queryParams);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        activities: activitiesResult.rows.map(row => ({
          ...row,
          customer_info: typeof row.customer_info === 'string' ? JSON.parse(row.customer_info) : row.customer_info,
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
    console.error('Activities fetch error:', error);

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
    const activityData = createActivitySchema.parse(body);

    // Verify lead access
    const leadCheckQuery = `
      SELECT id FROM sales_leads 
      WHERE id = $1 ${user.role === 'sales_rep' ? 'AND sales_rep_id = $2' : ''}
    `;
    const leadCheckParams = user.role === 'sales_rep' ? [activityData.lead_id, user.id] : [activityData.lead_id];
    const leadResult = await query(leadCheckQuery, leadCheckParams);

    if (leadResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Lead not found or access denied' } },
        { status: 403 }
      );
    }

    // If quote_id provided, verify quote access
    if (activityData.quote_id) {
      const quoteCheckQuery = `
        SELECT id FROM proposals 
        WHERE id = $1 ${user.role === 'sales_rep' ? 'AND sales_rep_id = $2' : ''}
      `;
      const quoteCheckParams = user.role === 'sales_rep' ? [activityData.quote_id, user.id] : [activityData.quote_id];
      const quoteResult = await query(quoteCheckQuery, quoteCheckParams);

      if (quoteResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Quote not found or access denied' } },
          { status: 403 }
        );
      }
    }

    // Create activity
    const insertActivityQuery = `
      INSERT INTO sales_activities (
        lead_id, quote_id, sales_rep_id, activity_type_id, subject, description,
        outcome, duration_minutes, scheduled_at, completed_at, status,
        follow_up_date, follow_up_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING id, created_at
    `;

    const result = await query(insertActivityQuery, [
      activityData.lead_id,
      activityData.quote_id || null,
      user.id,
      activityData.activity_type_id,
      activityData.subject,
      activityData.description || null,
      activityData.outcome || null,
      activityData.duration_minutes || null,
      activityData.scheduled_at || null,
      activityData.completed_at || null,
      activityData.status,
      activityData.follow_up_date || null,
      activityData.follow_up_notes || null,
    ]);

    const newActivity = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newActivity.id,
        message: 'Activity created successfully',
        created_at: newActivity.created_at,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Activity creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid activity data',
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