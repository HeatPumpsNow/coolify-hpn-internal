import { NextRequest, NextResponse } from 'next/server';
import OwnerAuthService from '@/lib/auth-owner';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const owner = await OwnerAuthService.validateSession(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await OwnerAuthService.hasPermission(owner.id, 'jobs_manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { jobId, employeeId, action } = await request.json();

    if (!jobId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get job details
    const jobResult = await query(`
      SELECT customer_name, service_type, scheduled_date, skills_required
      FROM jobs WHERE id = $1
    `, [jobId]);

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobResult.rows[0];

    if (action === 'assign') {
      if (!employeeId) {
        return NextResponse.json(
          { error: 'Employee ID required for assignment' },
          { status: 400 }
        );
      }

      // Check if employee exists and is active
      const employeeResult = await query(`
        SELECT first_name, last_name, role, status
        FROM employees WHERE id = $1
      `, [employeeId]);

      if (employeeResult.rows.length === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      const employee = employeeResult.rows[0];

      if (employee.status !== 'active') {
        return NextResponse.json(
          { error: 'Cannot assign job to inactive employee' },
          { status: 400 }
        );
      }

      // Check for scheduling conflicts
      const conflictResult = await query(`
        SELECT COUNT(*) as conflicts
        FROM job_assignments ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.employee_id = $1
          AND j.scheduled_date::date = $2::date
          AND j.status IN ('scheduled', 'in-progress')
      `, [employeeId, job.scheduled_date]);

      const conflicts = parseInt(conflictResult.rows[0].conflicts);
      if (conflicts >= 2) {
        return NextResponse.json(
          { error: 'Employee already has multiple jobs scheduled for this date' },
          { status: 409 }
        );
      }

      // Remove existing assignment if any
      await query('DELETE FROM job_assignments WHERE job_id = $1', [jobId]);

      // Create new assignment
      await query(`
        INSERT INTO job_assignments (job_id, employee_id, assigned_at)
        VALUES ($1, $2, NOW())
      `, [jobId, employeeId]);

      // Log activity
      await query(`
        INSERT INTO business_activities (type, description, related_id, related_type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        'job_assigned',
        `Job ${job.customer_name} assigned to ${employee.first_name} ${employee.last_name}`,
        jobId,
        'job'
      ]);

      logger.info('Job assigned', {
        jobId,
        employeeId,
        assignedBy: owner.id
      });

      return NextResponse.json({
        success: true,
        message: `Job assigned to ${employee.first_name} ${employee.last_name}`,
        assignment: {
          jobId,
          employeeId,
          employeeName: `${employee.first_name} ${employee.last_name}`,
          assignedAt: new Date().toISOString()
        }
      });

    } else if (action === 'unassign') {
      // Remove assignment
      const deleteResult = await query(`
        DELETE FROM job_assignments 
        WHERE job_id = $1
        RETURNING employee_id
      `, [jobId]);

      if (deleteResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No assignment found for this job' },
          { status: 404 }
        );
      }

      // Log activity
      await query(`
        INSERT INTO business_activities (type, description, related_id, related_type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        'job_unassigned',
        `Job ${job.customer_name} unassigned`,
        jobId,
        'job'
      ]);

      logger.info('Job unassigned', {
        jobId,
        unassignedBy: owner.id
      });

      return NextResponse.json({
        success: true,
        message: 'Job unassigned successfully'
      });

    } else if (action === 'auto-assign') {
      // Find best available employee based on skills, workload, and availability
      const candidatesResult = await query(`
        SELECT 
          e.id,
          e.first_name,
          e.last_name,
          e.role,
          COUNT(CASE WHEN j.status IN ('scheduled', 'in-progress') THEN 1 END) as current_workload,
          AVG(CASE WHEN j.status = 'completed' THEN j.customer_rating END) as avg_rating,
          STRING_AGG(DISTINCT sp.skill_name, ',') as skills
        FROM employees e
        LEFT JOIN job_assignments ja ON e.id = ja.employee_id
        LEFT JOIN jobs j ON ja.job_id = j.id
        LEFT JOIN skill_progress sp ON e.id = sp.employee_id AND sp.current_level > 0
        WHERE e.status = 'active'
        GROUP BY e.id, e.first_name, e.last_name, e.role
        HAVING COUNT(CASE WHEN j.status IN ('scheduled', 'in-progress') THEN 1 END) < 3
        ORDER BY 
          COUNT(CASE WHEN j.status IN ('scheduled', 'in-progress') THEN 1 END) ASC,
          AVG(CASE WHEN j.status = 'completed' THEN j.customer_rating END) DESC NULLS LAST
        LIMIT 5
      `);

      if (candidatesResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No available employees found for auto-assignment' },
          { status: 404 }
        );
      }

      // Select best candidate (first in sorted results)
      const bestCandidate = candidatesResult.rows[0];

      // Remove existing assignment if any
      await query('DELETE FROM job_assignments WHERE job_id = $1', [jobId]);

      // Create new assignment
      await query(`
        INSERT INTO job_assignments (job_id, employee_id, assigned_at)
        VALUES ($1, $2, NOW())
      `, [jobId, bestCandidate.id]);

      // Log activity
      await query(`
        INSERT INTO business_activities (type, description, related_id, related_type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        'job_auto_assigned',
        `Job ${job.customer_name} auto-assigned to ${bestCandidate.first_name} ${bestCandidate.last_name}`,
        jobId,
        'job'
      ]);

      logger.info('Job auto-assigned', {
        jobId,
        employeeId: bestCandidate.id,
        assignedBy: owner.id,
        reason: 'auto-assignment'
      });

      return NextResponse.json({
        success: true,
        message: `Job auto-assigned to ${bestCandidate.first_name} ${bestCandidate.last_name}`,
        assignment: {
          jobId,
          employeeId: bestCandidate.id,
          employeeName: `${bestCandidate.first_name} ${bestCandidate.last_name}`,
          assignedAt: new Date().toISOString(),
          reason: 'Best available based on workload and rating'
        },
        candidates: candidatesResult.rows.map(candidate => ({
          id: candidate.id,
          name: `${candidate.first_name} ${candidate.last_name}`,
          role: candidate.role,
          currentWorkload: parseInt(candidate.current_workload) || 0,
          averageRating: candidate.avg_rating ? parseFloat(candidate.avg_rating).toFixed(1) : null,
          skills: candidate.skills ? candidate.skills.split(',') : []
        }))
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "assign", "unassign", or "auto-assign"' },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error('Job assignment error', error);
    return NextResponse.json(
      { error: 'Failed to process job assignment' },
      { status: 500 }
    );
  }
}