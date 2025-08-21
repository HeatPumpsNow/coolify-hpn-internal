import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const tokenCookie = request.cookies.get('auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await AuthService.validateSession(tokenCookie.value);
    if (!employee) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get jobs assigned to this employee
    const result = await query(
      `SELECT 
        j.id,
        j.customer_name,
        j.customer_phone,
        j.customer_email,
        j.address,
        j.job_type,
        j.status,
        j.urgency,
        j.scheduled_date,
        j.estimated_duration,
        j.actual_duration,
        j.description,
        j.notes,
        j.completed_at,
        j.created_at,
        ja.assigned_at,
        COUNT(ep.id) as photo_count
       FROM jobs j
       INNER JOIN job_assignments ja ON j.id = ja.job_id
       LEFT JOIN employee_photos ep ON j.id = ep.job_id AND ep.employee_id = $1
       WHERE ja.employee_id = $1
       GROUP BY j.id, ja.assigned_at
       ORDER BY 
         CASE j.status 
           WHEN 'in-progress' THEN 1
           WHEN 'scheduled' THEN 2
           WHEN 'completed' THEN 3
           WHEN 'cancelled' THEN 4
         END,
         j.scheduled_date ASC`,
      [employee.id]
    );

    const jobs = result.rows.map((row: any) => ({
      id: row.id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      address: row.address,
      jobType: row.job_type,
      status: row.status,
      urgency: row.urgency,
      scheduledDate: row.scheduled_date,
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      description: row.description,
      notes: row.notes,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      assignedAt: row.assigned_at,
      photoCount: parseInt(row.photo_count) || 0
    }));

    return NextResponse.json({
      success: true,
      jobs
    });

  } catch (error) {
    console.error('Fetch jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}