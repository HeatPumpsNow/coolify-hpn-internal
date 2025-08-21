import { NextRequest, NextResponse } from 'next/server';
import OwnerAuthService from '@/lib/supabase/server-owner';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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
    const hasPermission = await OwnerAuthService.hasPermission(owner.id, 'employees_view');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const employeeId = params.id;

    // Get employee details with comprehensive metrics
    const employeeResult = await query(`
      SELECT 
        e.id,
        e.email,
        e.first_name,
        e.last_name,
        e.role,
        e.phone,
        e.hire_date,
        e.status,
        e.last_login,
        e.created_at,
        e.updated_at,
        COUNT(DISTINCT ja.job_id) as total_jobs,
        COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN ja.job_id END) as completed_jobs,
        COUNT(DISTINCT CASE WHEN j.status IN ('scheduled', 'in-progress') THEN ja.job_id END) as active_jobs,
        AVG(CASE WHEN j.status = 'completed' THEN j.customer_rating END) as avg_rating,
        SUM(CASE WHEN j.status = 'completed' THEN j.total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN j.status = 'completed' AND j.completed_at IS NOT NULL AND j.scheduled_date IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (j.completed_at - j.scheduled_date)) / 3600 END) as avg_completion_time,
        MAX(j.completed_at) as last_job_date,
        AVG(sp.current_level) as avg_skill_level,
        COUNT(DISTINCT sp.skill_id) as total_skills
      FROM employees e
      LEFT JOIN job_assignments ja ON e.id = ja.employee_id
      LEFT JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN skill_progress sp ON e.id = sp.employee_id
      WHERE e.id = $1
      GROUP BY e.id, e.email, e.first_name, e.last_name, e.role, e.phone, e.hire_date, e.status, e.last_login, e.created_at, e.updated_at
    `, [employeeId]);

    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const emp = employeeResult.rows[0];

    // Get recent jobs
    const recentJobsResult = await query(`
      SELECT 
        j.id,
        j.customer_name,
        j.service_type,
        j.status,
        j.total_amount,
        j.scheduled_date,
        j.completed_at,
        j.customer_rating,
        j.customer_feedback
      FROM jobs j
      JOIN job_assignments ja ON j.id = ja.job_id
      WHERE ja.employee_id = $1
      ORDER BY j.scheduled_date DESC
      LIMIT 10
    `, [employeeId]);

    // Get skills progress
    const skillsResult = await query(`
      SELECT 
        sp.skill_id,
        sp.skill_name,
        sp.category,
        sp.current_level,
        sp.max_level,
        sp.experience,
        sp.experience_to_next,
        sp.unlocked,
        sp.updated_at
      FROM skill_progress sp
      WHERE sp.employee_id = $1
      ORDER BY sp.category, sp.skill_name
    `, [employeeId]);

    // Get performance over time (last 6 months)
    const performanceResult = await query(`
      SELECT 
        DATE_TRUNC('month', j.completed_at) as month,
        COUNT(*) as jobs_completed,
        AVG(j.customer_rating) as avg_rating,
        SUM(j.total_amount) as revenue
      FROM jobs j
      JOIN job_assignments ja ON j.id = ja.job_id
      WHERE ja.employee_id = $1 
        AND j.status = 'completed' 
        AND j.completed_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', j.completed_at)
      ORDER BY month DESC
    `, [employeeId]);

    // Format employee data
    const employee = {
      id: emp.id,
      email: emp.email,
      firstName: emp.first_name,
      lastName: emp.last_name,
      fullName: `${emp.first_name} ${emp.last_name}`,
      role: emp.role,
      phone: emp.phone,
      hireDate: emp.hire_date,
      status: emp.status,
      lastLogin: emp.last_login,
      totalJobs: parseInt(emp.total_jobs) || 0,
      completedJobs: parseInt(emp.completed_jobs) || 0,
      activeJobs: parseInt(emp.active_jobs) || 0,
      averageRating: emp.avg_rating ? parseFloat(emp.avg_rating).toFixed(1) : null,
      totalRevenue: parseFloat(emp.total_revenue) || 0,
      averageCompletionTime: emp.avg_completion_time ? parseFloat(emp.avg_completion_time).toFixed(1) : null,
      lastJobDate: emp.last_job_date,
      averageSkillLevel: emp.avg_skill_level ? parseFloat(emp.avg_skill_level).toFixed(1) : null,
      totalSkills: parseInt(emp.total_skills) || 0,
      completionRate: emp.total_jobs > 0 ? ((emp.completed_jobs / emp.total_jobs) * 100).toFixed(1) : '0',
      createdAt: emp.created_at,
      updatedAt: emp.updated_at
    };

    // Format recent jobs
    const recentJobs = recentJobsResult.rows.map(job => ({
      id: job.id,
      customerName: job.customer_name,
      serviceType: job.service_type,
      status: job.status,
      totalAmount: parseFloat(job.total_amount) || 0,
      scheduledDate: job.scheduled_date,
      completedAt: job.completed_at,
      customerRating: job.customer_rating,
      customerFeedback: job.customer_feedback
    }));

    // Format skills
    const skillsByCategory = skillsResult.rows.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push({
        id: skill.skill_id,
        name: skill.skill_name,
        currentLevel: skill.current_level,
        maxLevel: skill.max_level,
        experience: skill.experience,
        experienceToNext: skill.experience_to_next,
        unlocked: skill.unlocked,
        progress: skill.max_level > 0 ? (skill.current_level / skill.max_level) * 100 : 0,
        updatedAt: skill.updated_at
      });
      return acc;
    }, {});

    // Format performance data
    const performanceHistory = performanceResult.rows.map(perf => ({
      month: perf.month,
      jobsCompleted: parseInt(perf.jobs_completed),
      averageRating: perf.avg_rating ? parseFloat(perf.avg_rating).toFixed(1) : null,
      revenue: parseFloat(perf.revenue) || 0
    }));

    return NextResponse.json({
      employee,
      recentJobs,
      skillsByCategory,
      performanceHistory
    });

  } catch (error) {
    logger.error('Get employee details error', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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
    const hasPermission = await OwnerAuthService.hasPermission(owner.id, 'employees_manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const employeeId = params.id;
    const updateData = await request.json();

    // Build update query dynamically
    const allowedFields = ['first_name', 'last_name', 'phone', 'role', 'status'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(updateData[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add updated_at
    updateFields.push(`updated_at = NOW()`);

    // Update employee
    const result = await query(`
      UPDATE employees 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, role, phone, status, updated_at
    `, [...updateValues, employeeId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updatedEmployee = result.rows[0];

    // Log activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'employee_updated',
      `Employee ${updatedEmployee.first_name} ${updatedEmployee.last_name} profile updated`,
      employeeId,
      'employee'
    ]);

    logger.info('Employee updated', {
      employeeId,
      updatedBy: owner.id,
      changes: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: updatedEmployee.id,
        email: updatedEmployee.email,
        firstName: updatedEmployee.first_name,
        lastName: updatedEmployee.last_name,
        role: updatedEmployee.role,
        phone: updatedEmployee.phone,
        status: updatedEmployee.status,
        updatedAt: updatedEmployee.updated_at
      }
    });

  } catch (error) {
    logger.error('Update employee error', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}