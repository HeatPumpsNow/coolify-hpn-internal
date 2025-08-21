import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/auth';
import { query } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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

    const jobId = params.id;
    const { status } = await request.json();

    // Validate status
    const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Verify job assignment
    const jobCheck = await query(
      `SELECT j.id, j.status as current_status FROM jobs j 
       INNER JOIN job_assignments ja ON j.id = ja.job_id 
       WHERE j.id = $1 AND ja.employee_id = $2`,
      [jobId, employee.id]
    );

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found or not assigned to you' },
        { status: 403 }
      );
    }

    const currentStatus = jobCheck.rows[0].current_status;
    
    // Update job status
    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const updateValues = [status];
    
    // Set completion time if completing job
    if (status === 'completed' && currentStatus !== 'completed') {
      updateFields.push('completed_at = NOW()');
    }

    await query(
      `UPDATE jobs SET ${updateFields.join(', ')} WHERE id = $${updateValues.length + 1}`,
      [...updateValues, jobId]
    );

    // Award points for job completion
    if (status === 'completed' && currentStatus !== 'completed') {
      await query(
        `INSERT INTO skill_points 
         (employee_id, category, points, source_type, source_id, notes)
         VALUES ($1, 'job_completion', 50, 'job', $2, $3)`,
        [
          employee.id,
          jobId,
          'Job completed successfully'
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Job status updated to ${status}`,
      pointsAwarded: status === 'completed' && currentStatus !== 'completed' ? 50 : 0
    });

  } catch (error) {
    console.error('Job status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 }
    );
  }
}