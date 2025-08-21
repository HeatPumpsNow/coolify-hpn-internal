import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/auth';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ownerPayload = verifyOwnerToken(tokenCookie.value);
    if (!ownerPayload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // For now, all active owners have employees_view permission
    // (This can be enhanced later with proper permission checking)

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (status !== 'all') {
      whereClause += ' AND e.active = $' + (queryParams.length + 1);
      queryParams.push(status === 'active');
    }

    if (search) {
      whereClause += ' AND (e.first_name ILIKE $' + (queryParams.length + 1) + 
                     ' OR e.last_name ILIKE $' + (queryParams.length + 1) + 
                     ' OR e.email ILIKE $' + (queryParams.length + 1) + ')';
      queryParams.push(`%${search}%`);
    }

    // Get employees with performance metrics
    const employeesResult = await query(`
      SELECT 
        e.id,
        e.email,
        e.first_name,
        e.last_name,
        e.role,
        e.phone,
        e.hire_date,
        e.active,
        e.created_at,
        e.updated_at,
        COUNT(DISTINCT ja.job_id) as total_jobs,
        COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN ja.job_id END) as completed_jobs,
        AVG(CASE WHEN j.status = 'completed' THEN j.customer_rating END) as avg_rating,
        SUM(CASE WHEN j.status = 'completed' THEN j.total_amount ELSE 0 END) as total_revenue,
        MAX(j.actual_end_time) as last_job_date,
        AVG(sp.current_level) as avg_skill_level
      FROM employees e
      LEFT JOIN job_assignments ja ON e.id = ja.employee_id
      LEFT JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN skill_progress sp ON e.id = sp.employee_id
      ${whereClause}
      GROUP BY e.id, e.email, e.first_name, e.last_name, e.role, e.phone, e.hire_date, e.active, e.created_at, e.updated_at
      ORDER BY 
        CASE WHEN $${queryParams.length + 1} = 'name' THEN e.first_name END ${sortOrder},
        CASE WHEN $${queryParams.length + 1} = 'jobs' THEN COUNT(DISTINCT ja.job_id) END ${sortOrder === 'asc' ? 'ASC' : 'DESC'},
        CASE WHEN $${queryParams.length + 1} = 'revenue' THEN SUM(CASE WHEN j.status = 'completed' THEN j.total_amount ELSE 0 END) END ${sortOrder === 'asc' ? 'ASC' : 'DESC'},
        CASE WHEN $${queryParams.length + 1} = 'rating' THEN AVG(CASE WHEN j.status = 'completed' THEN j.customer_rating END) END ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
    `, [...queryParams, sortBy]);

    // Get current active jobs for each employee
    const currentJobsResult = await query(`
      SELECT 
        ja.employee_id,
        COUNT(*) as active_jobs
      FROM job_assignments ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.status IN ('scheduled', 'in-progress')
      GROUP BY ja.employee_id
    `);

    const currentJobsMap = new Map();
    currentJobsResult.rows.forEach(row => {
      currentJobsMap.set(row.employee_id, parseInt(row.active_jobs));
    });

    // Format employee data
    const employees = employeesResult.rows.map(emp => ({
      id: emp.id,
      email: emp.email,
      firstName: emp.first_name,
      lastName: emp.last_name,
      fullName: `${emp.first_name} ${emp.last_name}`,
      role: emp.role,
      phone: emp.phone,
      hireDate: emp.hire_date,
      status: emp.active ? 'active' : 'inactive',
      lastLogin: null, // This column doesn't exist in the employee table
      totalJobs: parseInt(emp.total_jobs) || 0,
      completedJobs: parseInt(emp.completed_jobs) || 0,
      activeJobs: currentJobsMap.get(emp.id) || 0,
      averageRating: emp.avg_rating ? parseFloat(emp.avg_rating).toFixed(1) : null,
      totalRevenue: parseFloat(emp.total_revenue) || 0,
      lastJobDate: emp.last_job_date,
      averageSkillLevel: emp.avg_skill_level ? parseFloat(emp.avg_skill_level).toFixed(1) : null,
      completionRate: emp.total_jobs > 0 ? ((emp.completed_jobs / emp.total_jobs) * 100).toFixed(1) : '0',
      createdAt: emp.created_at,
      updatedAt: emp.updated_at
    }));

    // Get summary statistics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.status === 'active').length;
    const avgCompletionRate = employees.length > 0 
      ? (employees.reduce((sum, emp) => sum + parseFloat(emp.completionRate), 0) / employees.length).toFixed(1)
      : '0';
    const totalRevenue = employees.reduce((sum, emp) => sum + emp.totalRevenue, 0);

    return NextResponse.json({
      employees,
      summary: {
        totalEmployees,
        activeEmployees,
        avgCompletionRate: parseFloat(avgCompletionRate),
        totalRevenue
      }
    });

  } catch (error) {
    logger.error('Get employees error', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ownerPayload = verifyOwnerToken(tokenCookie.value);
    if (!ownerPayload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // For now, all active owners have employees_manage permission
    // (This can be enhanced later with proper permission checking)

    const {
      email,
      firstName,
      lastName,
      role,
      phone,
      hireDate,
      password
    } = await request.json();

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmployee = await query(
      'SELECT id FROM employees WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingEmployee.rows.length > 0) {
      return NextResponse.json(
        { error: 'Employee with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create employee
    const result = await query(`
      INSERT INTO employees (
        email, password_hash, first_name, last_name, role, phone, hire_date, active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      RETURNING id, email, first_name, last_name, role, phone, hire_date, active, created_at
    `, [
      email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role,
      phone || null,
      hireDate || new Date().toISOString().split('T')[0]
    ]);

    const newEmployee = result.rows[0];

    // Log activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'employee_joined',
      `New ${role} ${firstName} ${lastName} joined the team`,
      newEmployee.id,
      'employee'
    ]);

    logger.info('Employee created', {
      employeeId: newEmployee.id,
      email: newEmployee.email,
      createdBy: ownerPayload.ownerId
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: newEmployee.id,
        email: newEmployee.email,
        firstName: newEmployee.first_name,
        lastName: newEmployee.last_name,
        role: newEmployee.role,
        phone: newEmployee.phone,
        hireDate: newEmployee.hire_date,
        status: newEmployee.active ? 'active' : 'inactive',
        createdAt: newEmployee.created_at
      }
    });

  } catch (error) {
    logger.error('Create employee error', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}