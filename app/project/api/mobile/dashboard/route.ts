import { NextRequest, NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

/**
 * GET /api/mobile/dashboard - Mobile dashboard with employee's current projects and today's schedule
 */
async function handleGet(request: NextRequest, user: any) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get employee info and today's time entry status
    const employeeResult = await query(
      `SELECT e.first_name, e.last_name, e.role,
              te.id as todays_time_entry_id,
              te.clock_in_time,
              te.clock_out_time,
              te.total_project_hours,
              te.project_id as current_project_id
       FROM employees e
       LEFT JOIN time_entries te ON e.id = te.employee_id AND te.entry_date = $2
       WHERE e.id = $1`,
      [user.id, today]
    );

    if (employeeResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const employee = employeeResult.rows[0];

    // Get active projects for this employee
    const activeProjectsResult = await query(
      `SELECT DISTINCT p.id, p.project_number, p.project_name, p.status, 
              p.completion_percentage, p.planned_start_date, p.planned_end_date,
              c.first_name || ' ' || c.last_name as customer_name,
              c.address as customer_address,
              CASE 
                WHEN p.project_manager_id = $1 THEN 'project_manager'
                WHEN p.lead_technician_id = $1 THEN 'lead_technician'
                WHEN pht.lead_technician_id = $1 THEN 'task_lead'
                WHEN pdt.assigned_employee_id = $1 THEN 'assigned_worker'
                ELSE 'team_member'
              END as role_in_project
       FROM projects p
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN project_high_level_tasks pht ON p.id = pht.project_id
       LEFT JOIN project_detailed_tasks pdt ON pht.id = pdt.high_level_task_id
       WHERE p.status IN ('scheduled', 'in_progress')
         AND (p.project_manager_id = $1 
              OR p.lead_technician_id = $1
              OR pht.lead_technician_id = $1
              OR pdt.assigned_employee_id = $1
              OR $1 = ANY(pht.assigned_team))
       ORDER BY p.planned_start_date, p.created_at`,
      [user.id]
    );

    // Get today's scheduled tasks
    const todaysTasksResult = await query(
      `SELECT 
         'high_level_task' as task_type,
         pht.id,
         pht.task_name,
         pht.estimated_hours,
         pht.status,
         p.project_name,
         p.project_number,
         pht.planned_start_datetime,
         pht.planned_end_datetime
       FROM project_high_level_tasks pht
       JOIN projects p ON pht.project_id = p.id
       WHERE (pht.lead_technician_id = $1 OR $1 = ANY(pht.assigned_team))
         AND DATE(pht.planned_start_datetime) = $2
         AND pht.status NOT IN ('completed', 'skipped')
       
       UNION ALL
       
       SELECT 
         'detailed_task' as task_type,
         pdt.id,
         pdt.task_name,
         pdt.estimated_duration_hours as estimated_hours,
         pdt.status,
         p.project_name,
         p.project_number,
         pdt.planned_start_datetime,
         pdt.planned_end_datetime
       FROM project_detailed_tasks pdt
       JOIN project_high_level_tasks pht ON pdt.high_level_task_id = pht.id
       JOIN projects p ON pdt.project_id = p.id
       WHERE pdt.assigned_employee_id = $1
         AND DATE(pdt.planned_start_datetime) = $2
         AND pdt.status NOT IN ('completed', 'skipped')
       
       ORDER BY planned_start_datetime`,
      [user.id, today]
    );

    // Get current active project details if employee is clocked in
    let activeProject = null;
    if (employee.current_project_id && employee.clock_in_time && !employee.clock_out_time) {
      const activeProjectResult = await query(
        `SELECT p.id, p.project_name, p.project_number, p.completion_percentage, p.status,
                c.first_name || ' ' || c.last_name as customer_name,
                -- Find current task (most recent time allocation)
                CASE 
                  WHEN te.time_allocations::text LIKE '%detailed_task%' THEN 
                    (SELECT task_name FROM project_detailed_tasks WHERE id = 
                      (SELECT (jsonb_array_elements(te.time_allocations)->>'detailed_task_id')::uuid 
                       FROM time_entries te2 WHERE te2.id = te.id LIMIT 1))
                  WHEN te.time_allocations::text LIKE '%high_level_task%' THEN 
                    (SELECT task_name FROM project_high_level_tasks WHERE id = 
                      (SELECT (jsonb_array_elements(te.time_allocations)->>'high_level_task_id')::uuid 
                       FROM time_entries te2 WHERE te2.id = te.id LIMIT 1))
                  ELSE 'General project work'
                END as current_task_name
         FROM projects p
         LEFT JOIN customers c ON p.customer_id = c.id
         LEFT JOIN time_entries te ON p.id = te.project_id AND te.employee_id = $1 AND te.entry_date = $2
         WHERE p.id = $3`,
        [user.id, today, employee.current_project_id]
      );

      if (activeProjectResult.rows.length > 0) {
        activeProject = activeProjectResult.rows[0];
      }
    }

    // Get recent notifications
    const notificationsResult = await query(
      `SELECT n.type, n.title, n.message, n.priority, n.created_at, n.action_url
       FROM notifications n
       WHERE n.recipient_type = 'employee' 
         AND n.recipient_id = $1
         AND n.read = false
         AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
       ORDER BY n.priority DESC, n.created_at DESC
       LIMIT 5`,
      [user.id]
    );

    // Calculate quick stats
    const stats = {
      active_projects: activeProjectsResult.rows.length,
      tasks_today: todaysTasksResult.rows.length,
      hours_logged_today: employee.total_project_hours || 0,
      is_clocked_in: !!(employee.clock_in_time && !employee.clock_out_time),
    };

    // Determine available quick actions
    const quickActions = [];
    
    if (!employee.clock_in_time) {
      quickActions.push({ action: 'clock_in', available: true, label: 'Clock In' });
    } else if (employee.clock_in_time && !employee.clock_out_time) {
      quickActions.push({ action: 'clock_out', available: true, label: 'Clock Out' });
      quickActions.push({ action: 'log_time', available: true, label: 'Log Time to Task' });
      quickActions.push({ action: 'take_photo', available: true, label: 'Take Progress Photo' });
      quickActions.push({ action: 'log_materials', available: true, label: 'Log Materials Used' });
    } else {
      quickActions.push({ action: 'view_summary', available: true, label: 'View Day Summary' });
    }

    const dashboardData = {
      employee_info: {
        name: `${employee.first_name} ${employee.last_name}`,
        role: employee.role,
        current_projects: activeProjectsResult.rows.map(p => p.id),
        todays_schedule: {
          clock_in_required: !employee.clock_in_time,
          tasks_planned: todaysTasksResult.rows.length,
          estimated_hours: todaysTasksResult.rows.reduce((sum, task) => sum + (task.estimated_hours || 0), 0),
        },
      },
      active_project: activeProject,
      active_projects: activeProjectsResult.rows,
      todays_tasks: todaysTasksResult.rows,
      quick_actions: quickActions,
      stats,
      notifications: notificationsResult.rows,
    };

    const response: ApiResponse<any> = {
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching mobile dashboard:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch dashboard data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Export mobile route handler
export const GET = withMobileAuth(handleGet);