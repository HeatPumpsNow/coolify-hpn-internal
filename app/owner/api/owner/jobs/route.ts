import { NextRequest, NextResponse } from 'next/server';
import OwnerAuthService from '@/lib/supabase/server-owner';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { verifyOwnerToken } = await import('@/lib/supabase/server');
    const owner = await verifyOwnerToken(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const assignedTo = searchParams.get('assignedTo') || 'all';
    const dateRange = searchParams.get('dateRange') || '30';
    const search = searchParams.get('search') || '';

    // Build query
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (status !== 'all') {
      whereClause += ` AND j.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    if (priority !== 'all') {
      whereClause += ` AND j.urgency = $${queryParams.length + 1}`;
      queryParams.push(priority);
    }

    if (assignedTo !== 'all') {
      whereClause += ` AND ja.employee_id = $${queryParams.length + 1}`;
      queryParams.push(assignedTo);
    }

    if (search) {
      whereClause += ` AND (j.customer_name ILIKE $${queryParams.length + 1} OR j.job_type ILIKE $${queryParams.length + 1} OR j.address ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }

    // Date range filter
    whereClause += ` AND j.scheduled_date >= CURRENT_DATE - INTERVAL '${parseInt(dateRange)} days'`;
    whereClause += ` AND j.scheduled_date <= CURRENT_DATE + INTERVAL '90 days'`;

    // Get jobs with employee assignments
    const jobsResult = await query(`
      SELECT 
        j.id,
        j.customer_name,
        j.customer_phone,
        j.customer_email,
        j.job_type as service_type,
        j.customer_notes as description,
        j.address,
        j.scheduled_date,
        j.estimated_duration,
        j.status,
        j.urgency as priority,
        j.total_amount,
        j.customer_notes as special_instructions,
        j.equipment_needed,
        j.skills_required,
        j.created_at,
        j.updated_at,
        ja.employee_id,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.role as employee_role,
        e.phone as employee_phone,
        COUNT(*) OVER() as total_count
      FROM jobs j
      LEFT JOIN job_assignments ja ON j.id = ja.job_id
      LEFT JOIN employees e ON ja.employee_id = e.id
      ${whereClause}
      ORDER BY 
        CASE j.urgency 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        j.scheduled_date ASC
      LIMIT 100
    `, queryParams);

    // Get job statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_jobs,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN urgency = 'urgent' THEN 1 END) as urgent_jobs,
        AVG(CASE WHEN status = 'completed' AND total_amount > 0 THEN total_amount END) as avg_job_value,
        COUNT(CASE WHEN scheduled_date >= CURRENT_DATE AND scheduled_date < CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as jobs_this_week
      FROM jobs j
      WHERE j.scheduled_date >= CURRENT_DATE - INTERVAL '90 days'
    `);

    // Get unassigned jobs
    const unassignedResult = await query(`
      SELECT * FROM (
        SELECT 
          j.id,
          j.customer_name,
          j.customer_email,
          j.customer_phone,
          j.job_type as service_type,
          j.customer_notes as description,
          j.address,
          j.scheduled_date,
          j.estimated_duration,
          j.urgency as priority,
          j.skills_required,
          'job' as item_type
        FROM jobs j
        LEFT JOIN job_assignments ja ON j.id = ja.job_id
        WHERE ja.job_id IS NULL
        
        UNION ALL
        
        SELECT 
          sr.id,
          c.first_name || ' ' || c.last_name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          sr.request_type as service_type,
          sr.description,
          c.address || CASE WHEN c.city IS NOT NULL THEN ', ' || c.city ELSE '' END as address,
          CURRENT_DATE + INTERVAL '1 day' as scheduled_date,
          4 as estimated_duration,
          sr.urgency_level as priority,
          CASE sr.request_type
            WHEN 'no_heating' THEN 'Heat Pump Diagnostics'
            WHEN 'no_cooling' THEN 'Heat Pump Diagnostics'
            WHEN 'strange_noise' THEN 'Mechanical Diagnostics'
            WHEN 'high_bills' THEN 'Energy Efficiency'
            WHEN 'maintenance' THEN 'Preventive Maintenance'
            ELSE 'General HVAC'
          END as skills_required,
          'service_request' as item_type
        FROM service_requests sr
        JOIN customers c ON sr.customer_id = c.id
        WHERE sr.related_job_id IS NULL 
          AND sr.status IN ('submitted', 'acknowledged')
      ) combined_results
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'emergency' THEN 1
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5
        END,
        scheduled_date
      LIMIT 20
    `);

    // Get employee workload
    const workloadResult = await query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.role,
        COUNT(CASE WHEN j.status IN ('scheduled', 'in-progress') THEN 1 END) as active_jobs,
        SUM(CASE WHEN j.status IN ('scheduled', 'in-progress') THEN j.estimated_duration ELSE 0 END) as total_hours,
        MAX(j.scheduled_date) as latest_job_date,
        AVG(CASE WHEN j.status = 'completed' THEN j.customer_rating END) as avg_rating
      FROM employees e
      LEFT JOIN job_assignments ja ON e.id = ja.employee_id
      LEFT JOIN jobs j ON ja.job_id = j.id
      WHERE e.active = true
      GROUP BY e.id, e.first_name, e.last_name, e.role
      ORDER BY active_jobs ASC
    `);

    // Format jobs data
    const jobs = jobsResult.rows.map(job => ({
      id: job.id,
      customerName: job.customer_name,
      customerPhone: job.customer_phone,
      customerEmail: job.customer_email,
      serviceType: job.service_type,
      description: job.description,
      address: job.address,
      scheduledDate: job.scheduled_date,
      estimatedDuration: job.estimated_duration,
      status: job.status,
      priority: job.priority,
      totalAmount: parseFloat(job.total_amount) || 0,
      specialInstructions: job.special_instructions,
      equipmentNeeded: job.equipment_needed ? job.equipment_needed.split(',').map((item: string) => item.trim()) : [],
      skillsRequired: job.skills_required ? job.skills_required.split(',').map((skill: string) => skill.trim()) : [],
      assignedEmployee: job.employee_id ? {
        id: job.employee_id,
        name: `${job.employee_first_name} ${job.employee_last_name}`,
        role: job.employee_role,
        phone: job.employee_phone
      } : null,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    }));

    // Format statistics
    const stats = statsResult.rows[0];
    const statistics = {
      totalJobs: parseInt(stats.total_jobs) || 0,
      scheduledJobs: parseInt(stats.scheduled_jobs) || 0,
      activeJobs: parseInt(stats.active_jobs) || 0,
      completedJobs: parseInt(stats.completed_jobs) || 0,
      urgentJobs: parseInt(stats.urgent_jobs) || 0,
      averageJobValue: parseFloat(stats.avg_job_value) || 0,
      jobsThisWeek: parseInt(stats.jobs_this_week) || 0
    };

    // Format unassigned jobs
    const unassignedJobs = unassignedResult.rows.map(job => ({
      id: job.id,
      customerName: job.customer_name,
      customerEmail: job.customer_email,
      customerPhone: job.customer_phone,
      serviceType: job.service_type,
      description: job.description,
      address: job.address,
      scheduledDate: job.scheduled_date,
      priority: job.priority,
      skillsRequired: typeof job.skills_required === 'string' 
        ? job.skills_required.split(',').map((skill: string) => skill.trim())
        : [job.skills_required].filter(Boolean),
      estimatedDuration: job.estimated_duration,
      itemType: job.item_type
    }));

    // Format employee workload
    const employeeWorkload = workloadResult.rows.map(emp => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      role: emp.role,
      activeJobs: parseInt(emp.active_jobs) || 0,
      totalHours: parseFloat(emp.total_hours) || 0,
      latestJobDate: emp.latest_job_date,
      averageRating: emp.avg_rating ? parseFloat(emp.avg_rating).toFixed(1) : null,
      availability: emp.active_jobs < 3 ? 'available' : emp.active_jobs < 5 ? 'busy' : 'overloaded'
    }));

    return NextResponse.json({
      jobs,
      statistics,
      unassignedJobs,
      employeeWorkload,
      totalCount: jobsResult.rows.length > 0 ? parseInt(jobsResult.rows[0].total_count) : 0
    });

  } catch (error) {
    logger.error('Get jobs error', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
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

    const { verifyOwnerToken } = await import('@/lib/supabase/server');
    const owner = await verifyOwnerToken(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      serviceType,
      description,
      address,
      scheduledDate,
      estimatedDuration,
      priority,
      totalAmount,
      specialInstructions,
      equipmentNeeded,
      skillsRequired,
      assignedEmployeeId
    } = await request.json();

    // Validate required fields
    if (!customerName || !serviceType || !address || !scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create job
    const jobResult = await query(`
      INSERT INTO jobs (
        customer_name, customer_phone, customer_email, service_type, description,
        address, scheduled_date, estimated_duration, status, priority, total_amount,
        special_instructions, equipment_needed, skills_required, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING id, customer_name, service_type, scheduled_date, status, priority, created_at
    `, [
      customerName,
      customerPhone || null,
      customerEmail || null,
      serviceType,
      description || null,
      address,
      scheduledDate,
      estimatedDuration || 4,
      priority || 'medium',
      totalAmount || 0,
      specialInstructions || null,
      equipmentNeeded ? equipmentNeeded.join(', ') : null,
      skillsRequired ? skillsRequired.join(', ') : null
    ]);

    const newJob = jobResult.rows[0];

    // Assign employee if specified
    if (assignedEmployeeId) {
      await query(`
        INSERT INTO job_assignments (job_id, employee_id, assigned_at)
        VALUES ($1, $2, NOW())
      `, [newJob.id, assignedEmployeeId]);
    }

    // Log activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'job_created',
      `New ${serviceType} job scheduled for ${customerName}`,
      newJob.id,
      'job'
    ]);

    logger.info('Job created', {
      jobId: newJob.id,
      customerName: newJob.customer_name,
      createdBy: owner.id
    });

    return NextResponse.json({
      success: true,
      job: {
        id: newJob.id,
        customerName: newJob.customer_name,
        serviceType: newJob.service_type,
        scheduledDate: newJob.scheduled_date,
        status: newJob.status,
        priority: newJob.priority,
        createdAt: newJob.created_at
      }
    });

  } catch (error) {
    logger.error('Create job error', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { verifyOwnerToken } = await import('@/lib/supabase/server');
    const owner = await verifyOwnerToken(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { jobId, action, newEmployeeId, reason } = await request.json();

    if (!jobId || !action) {
      return NextResponse.json({ error: 'Job ID and action are required' }, { status: 400 });
    }

    // Get current job and assignment info
    const currentJobResult = await query(`
      SELECT 
        j.*,
        ja.employee_id as current_employee_id,
        e.first_name || ' ' || e.last_name as current_employee_name
      FROM jobs j
      LEFT JOIN job_assignments ja ON j.id = ja.job_id
      LEFT JOIN employees e ON ja.employee_id = e.id
      WHERE j.id = $1
    `, [jobId]);

    if (currentJobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = currentJobResult.rows[0];

    if (action === 'reassign') {
      if (!newEmployeeId) {
        return NextResponse.json({ error: 'New employee ID is required for reassignment' }, { status: 400 });
      }

      // Get new employee info
      const newEmployeeResult = await query(`
        SELECT id, first_name, last_name, role FROM employees WHERE id = $1 AND active = true
      `, [newEmployeeId]);

      if (newEmployeeResult.rows.length === 0) {
        return NextResponse.json({ error: 'New employee not found or inactive' }, { status: 404 });
      }

      const newEmployee = newEmployeeResult.rows[0];

      // Remove current assignment if exists
      if (job.current_employee_id) {
        await query(`DELETE FROM job_assignments WHERE job_id = $1`, [jobId]);
      }

      // Create new assignment
      await query(`
        INSERT INTO job_assignments (job_id, employee_id, assigned_at)
        VALUES ($1, $2, NOW())
      `, [jobId, newEmployeeId]);

      // Log reassignment activity
      const activityDescription = job.current_employee_id 
        ? `Job reassigned from ${job.current_employee_name} to ${newEmployee.first_name} ${newEmployee.last_name}${reason ? ` - Reason: ${reason}` : ''}`
        : `Job assigned to ${newEmployee.first_name} ${newEmployee.last_name}`;

      await query(`
        INSERT INTO business_activities (type, description, related_id, related_type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, ['job_reassigned', activityDescription, jobId, 'job']);

      // Create communication record for the job
      if (job.current_employee_id) {
        await query(`
          INSERT INTO job_communications (
            job_id, sender_type, sender_id, message_type, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          jobId,
          'system',
          owner.id,
          'reassignment',
          `Job has been reassigned to ${newEmployee.first_name} ${newEmployee.last_name}${reason ? ` - ${reason}` : ''}`
        ]);
      }

      logger.info('Job reassigned', {
        jobId,
        fromEmployee: job.current_employee_id,
        toEmployee: newEmployeeId,
        reason,
        reassignedBy: owner.id
      });

      return NextResponse.json({
        success: true,
        message: `Job successfully ${job.current_employee_id ? 'reassigned' : 'assigned'} to ${newEmployee.first_name} ${newEmployee.last_name}`,
        assignment: {
          jobId,
          employeeId: newEmployeeId,
          employeeName: `${newEmployee.first_name} ${newEmployee.last_name}`,
          employeeRole: newEmployee.role,
          assignedAt: new Date().toISOString()
        }
      });

    } else if (action === 'unassign') {
      if (!job.current_employee_id) {
        return NextResponse.json({ error: 'Job is not currently assigned' }, { status: 400 });
      }

      // Remove assignment
      await query(`DELETE FROM job_assignments WHERE job_id = $1`, [jobId]);

      // Log unassignment activity
      await query(`
        INSERT INTO business_activities (type, description, related_id, related_type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        'job_unassigned',
        `Job unassigned from ${job.current_employee_name}${reason ? ` - Reason: ${reason}` : ''}`,
        jobId,
        'job'
      ]);

      // Create communication record
      await query(`
        INSERT INTO job_communications (
          job_id, sender_type, sender_id, message_type, message, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        jobId,
        'system',
        owner.id,
        'unassignment',
        `Job has been unassigned${reason ? ` - ${reason}` : ''}`
      ]);

      logger.info('Job unassigned', {
        jobId,
        fromEmployee: job.current_employee_id,
        reason,
        unassignedBy: owner.id
      });

      return NextResponse.json({
        success: true,
        message: `Job successfully unassigned from ${job.current_employee_name}`
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    logger.error('Job reassignment error', error);
    return NextResponse.json(
      { error: 'Failed to process job reassignment' },
      { status: 500 }
    );
  }
}