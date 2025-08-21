import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { query, transaction } from '@/lib/database';
import { generateProjectSchedule } from '@/lib/scheduling';
import { ApiResponse } from '@/types';
import { z } from 'zod';

// Validation schema for schedule generation
const ScheduleGenerationSchema = z.object({
  scheduling_parameters: z.object({
    start_date: z.string().date(),
    working_hours: z.object({
      start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      lunch_duration: z.number().min(0).max(2),
    }),
    working_days: z.array(z.number().min(1).max(7)),
    team_availability: z.array(z.object({
      employee_id: z.string().uuid(),
      availability: z.array(z.object({
        date: z.string().date(),
        available_hours: z.number().min(0).max(24),
      })),
    })),
    constraints: z.object({
      customer_availability: z.array(z.object({
        date: z.string().date(),
        time_window: z.string(),
      })).optional(),
      weather_considerations: z.boolean().optional(),
      equipment_delivery_date: z.string().date().optional(),
    }).optional(),
  }),
  optimization_goals: z.array(z.enum(['minimize_duration', 'balance_workload', 'minimize_travel'])).optional(),
});

const ScheduleUpdateSchema = z.object({
  schedule_adjustments: z.array(z.object({
    task_id: z.string().uuid(),
    task_type: z.enum(['phase', 'high_level_task', 'detailed_task']),
    new_start_date: z.string().datetime().optional(),
    new_end_date: z.string().datetime().optional(),
    new_assigned_resources: z.array(z.string().uuid()).optional(),
    reason: z.string(),
  })),
  update_reason: z.string(),
  weather_impact: z.object({
    affected_dates: z.array(z.string().date()),
    delay_hours: z.number(),
    mitigation_plan: z.string(),
  }).optional(),
});

/**
 * GET /api/projects/[id]/schedule - Get current project schedule
 */
async function handleGet(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const scheduleVersion = searchParams.get('version');
    const includeAnalysis = searchParams.get('include_analysis') === 'true';

    // Get current active schedule
    let scheduleQuery = `
      SELECT ps.*, 
             p.project_name,
             p.status as project_status,
             p.planned_start_date as project_planned_start,
             p.planned_end_date as project_planned_end
      FROM project_schedules ps
      JOIN projects p ON ps.project_id = p.id
      WHERE ps.project_id = $1
    `;

    const params_array = [projectId];
    let paramCount = 1;

    if (scheduleVersion) {
      scheduleQuery += ` AND ps.schedule_version = $${++paramCount}`;
      params_array.push(parseInt(scheduleVersion));
    } else {
      scheduleQuery += ` AND ps.status = 'active'`;
    }

    scheduleQuery += ` ORDER BY ps.schedule_version DESC LIMIT 1`;

    const scheduleResult = await query(scheduleQuery, params_array);

    if (scheduleResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No schedule found for this project',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const schedule = scheduleResult.rows[0];

    // Get task progress updates
    const progressResult = await query(
      `SELECT 
         'phase' as task_type, pp.id, pp.phase_name as task_name,
         pp.status, pp.completion_percentage, pp.actual_start_date, pp.actual_end_date
       FROM project_phases pp
       WHERE pp.project_id = $1
       
       UNION ALL
       
       SELECT 
         'high_level_task' as task_type, pht.id, pht.task_name,
         pht.status, pht.completion_percentage, 
         pht.actual_start_datetime as actual_start_date,
         pht.actual_end_datetime as actual_end_date
       FROM project_high_level_tasks pht
       WHERE pht.project_id = $1
       
       UNION ALL
       
       SELECT 
         'detailed_task' as task_type, pdt.id, pdt.task_name,
         pdt.status, 100 as completion_percentage,
         pdt.actual_start_datetime as actual_start_date,
         pdt.actual_end_datetime as actual_end_date
       FROM project_detailed_tasks pdt
       WHERE pdt.project_id = $1 AND pdt.status = 'completed'`,
      [projectId]
    );

    const taskProgress = progressResult.rows;

    // Enhanced schedule data
    const scheduleData = {
      schedule: {
        ...schedule,
        gantt_data: JSON.parse(schedule.gantt_data || '{}'),
        resource_assignments: JSON.parse(schedule.resource_assignments || '{}'),
        resource_conflicts: JSON.parse(schedule.resource_conflicts || '[]'),
        external_constraints: JSON.parse(schedule.external_constraints || '{}'),
      },
      task_progress: taskProgress,
    };

    // Include schedule analysis if requested
    if (includeAnalysis) {
      const analysisResult = await performScheduleAnalysis(projectId, schedule);
      scheduleData.analysis = analysisResult;
    }

    const response: ApiResponse<any> = {
      success: true,
      data: scheduleData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching project schedule:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch project schedule',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/schedule - Generate new project schedule
 */
async function handlePost(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validatedData = ScheduleGenerationSchema.parse(body);

    // Check if user has permission to create schedules
    if (user.type === 'employee') {
      // Check if employee is project manager or lead technician
      const projectCheck = await query(
        'SELECT project_manager_id, lead_technician_id FROM projects WHERE id = $1',
        [projectId]
      );
      
      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found');
      }

      const project = projectCheck.rows[0];
      if (project.project_manager_id !== user.id && project.lead_technician_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            message: 'Insufficient permissions to create project schedules',
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }
    }

    // Convert optimization goals to the expected format
    const optimizationGoals = {
      minimize_duration: validatedData.optimization_goals?.includes('minimize_duration') || true,
      balance_workload: validatedData.optimization_goals?.includes('balance_workload') || true,
      minimize_travel: validatedData.optimization_goals?.includes('minimize_travel') || false,
      respect_dependencies: true,
      consider_weather: validatedData.scheduling_parameters.constraints?.weather_considerations || false,
    };

    // Generate schedule
    const newSchedule = await generateProjectSchedule(
      projectId,
      validatedData.scheduling_parameters,
      optimizationGoals
    );

    // Update project dates based on schedule
    await query(
      `UPDATE projects 
       SET planned_start_date = $2,
           planned_end_date = $3,
           status = CASE WHEN status = 'planned' THEN 'scheduled' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [projectId, validatedData.scheduling_parameters.start_date, newSchedule.schedule_end_date]
    );

    // Update individual task schedules
    await updateTaskSchedules(projectId, newSchedule.gantt_data);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        schedule: newSchedule,
        schedule_summary: {
          project_start: validatedData.scheduling_parameters.start_date,
          project_end: newSchedule.schedule_end_date,
          total_duration_days: calculateDurationDays(
            validatedData.scheduling_parameters.start_date,
            newSchedule.schedule_end_date
          ),
          critical_path: newSchedule.critical_path,
          optimization_score: newSchedule.optimization_score,
        },
      },
      message: 'Project schedule generated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error generating project schedule:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid scheduling parameters' : 'Failed to generate schedule',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/schedule - Update existing schedule
 */
async function handlePut(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validatedData = ScheduleUpdateSchema.parse(body);

    const result = await transaction(async (client) => {
      // Get current schedule
      const currentScheduleResult = await client.query(
        'SELECT * FROM project_schedules WHERE project_id = $1 AND status = $2',
        [projectId, 'active']
      );

      if (currentScheduleResult.rows.length === 0) {
        throw new Error('No active schedule found to update');
      }

      const currentSchedule = currentScheduleResult.rows[0];

      // Create new version of the schedule
      const newVersion = currentSchedule.schedule_version + 1;

      // Mark current schedule as superseded
      await client.query(
        'UPDATE project_schedules SET status = $2 WHERE id = $1',
        [currentSchedule.id, 'superseded']
      );

      // Parse current Gantt data
      const ganttData = JSON.parse(currentSchedule.gantt_data || '{}');

      // Apply schedule adjustments
      for (const adjustment of validatedData.schedule_adjustments) {
        await applyScheduleAdjustment(client, projectId, adjustment, ganttData);
      }

      // Create new schedule version
      const newScheduleResult = await client.query(
        `INSERT INTO project_schedules (
          project_id, schedule_version, schedule_type, schedule_start_date,
          schedule_end_date, working_hours_start, working_hours_end, working_days,
          gantt_data, critical_path, critical_path_duration_days, resource_assignments,
          resource_conflicts, external_constraints, optimization_score, status,
          previous_schedule_id, change_reason, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *`,
        [
          projectId,
          newVersion,
          'current',
          currentSchedule.schedule_start_date,
          currentSchedule.schedule_end_date,
          currentSchedule.working_hours_start,
          currentSchedule.working_hours_end,
          currentSchedule.working_days,
          JSON.stringify(ganttData),
          currentSchedule.critical_path,
          currentSchedule.critical_path_duration_days,
          currentSchedule.resource_assignments,
          currentSchedule.resource_conflicts,
          currentSchedule.external_constraints,
          currentSchedule.optimization_score,
          'active',
          currentSchedule.id,
          validatedData.update_reason,
          user.id
        ]
      );

      return newScheduleResult.rows[0];
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        schedule: result,
        adjustments_applied: validatedData.schedule_adjustments.length,
        update_reason: validatedData.update_reason,
      },
      message: 'Schedule updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating project schedule:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid schedule update data' : 'Failed to update schedule',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * Helper function to apply schedule adjustment
 */
async function applyScheduleAdjustment(client: any, projectId: string, adjustment: any, ganttData: any) {
  let tableName = '';
  let dateFields = { start: '', end: '' };

  switch (adjustment.task_type) {
    case 'phase':
      tableName = 'project_phases';
      dateFields = { start: 'planned_start_date', end: 'planned_end_date' };
      break;
    case 'high_level_task':
      tableName = 'project_high_level_tasks';
      dateFields = { start: 'planned_start_datetime', end: 'planned_end_datetime' };
      break;
    case 'detailed_task':
      tableName = 'project_detailed_tasks';
      dateFields = { start: 'planned_start_datetime', end: 'planned_end_datetime' };
      break;
  }

  // Update database
  const updateFields = [];
  const updateValues = [];
  let paramCount = 0;

  if (adjustment.new_start_date) {
    updateFields.push(`${dateFields.start} = $${++paramCount}`);
    updateValues.push(adjustment.new_start_date);
  }

  if (adjustment.new_end_date) {
    updateFields.push(`${dateFields.end} = $${++paramCount}`);
    updateValues.push(adjustment.new_end_date);
  }

  if (adjustment.new_assigned_resources && adjustment.task_type === 'high_level_task') {
    updateFields.push(`assigned_team = $${++paramCount}`);
    updateValues.push(adjustment.new_assigned_resources);
  } else if (adjustment.new_assigned_resources && adjustment.task_type === 'detailed_task') {
    updateFields.push(`assigned_employee_id = $${++paramCount}`);
    updateValues.push(adjustment.new_assigned_resources[0]);
  }

  if (updateFields.length > 0) {
    updateValues.push(adjustment.task_id);
    const updateQuery = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = $${++paramCount}`;
    await client.query(updateQuery, updateValues);
  }

  // Update Gantt data
  if (ganttData.tasks) {
    const taskIndex = ganttData.tasks.findIndex((t: any) => t.id === adjustment.task_id);
    if (taskIndex !== -1) {
      if (adjustment.new_start_date) {
        ganttData.tasks[taskIndex].start = adjustment.new_start_date;
      }
      if (adjustment.new_end_date) {
        ganttData.tasks[taskIndex].end = adjustment.new_end_date;
      }
      if (adjustment.new_assigned_resources) {
        ganttData.tasks[taskIndex].resource = adjustment.new_assigned_resources;
      }
    }
  }
}

/**
 * Helper function to update task schedules
 */
async function updateTaskSchedules(projectId: string, ganttData: any) {
  if (!ganttData.tasks) return;

  for (const task of ganttData.tasks) {
    let tableName = '';
    let dateFields = { start: '', end: '' };

    switch (task.type) {
      case 'phase':
        tableName = 'project_phases';
        dateFields = { start: 'planned_start_date', end: 'planned_end_date' };
        break;
      case 'high_level_task':
        tableName = 'project_high_level_tasks';
        dateFields = { start: 'planned_start_datetime', end: 'planned_end_datetime' };
        break;
      case 'detailed_task':
        tableName = 'project_detailed_tasks';
        dateFields = { start: 'planned_start_datetime', end: 'planned_end_datetime' };
        break;
    }

    if (tableName) {
      await query(
        `UPDATE ${tableName} 
         SET ${dateFields.start} = $2, ${dateFields.end} = $3
         WHERE id = $1`,
        [task.id, task.start, task.end]
      );
    }
  }
}

/**
 * Helper function to perform schedule analysis
 */
async function performScheduleAnalysis(projectId: string, schedule: any) {
  // Get current project status
  const projectResult = await query(
    `SELECT completion_percentage, actual_hours, budgeted_hours,
            actual_labor_cost, budgeted_labor_cost
     FROM projects WHERE id = $1`,
    [projectId]
  );

  const project = projectResult.rows[0];

  // Calculate schedule variance
  const plannedEndDate = new Date(schedule.schedule_end_date);
  const today = new Date();
  const daysFromPlannedEnd = Math.ceil((plannedEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Get task completion rates
  const taskStatsResult = await query(
    `SELECT 
       COUNT(*) as total_tasks,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
       COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
       COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_tasks
     FROM project_high_level_tasks
     WHERE project_id = $1`,
    [projectId]
  );

  const taskStats = taskStatsResult.rows[0];

  return {
    schedule_health: daysFromPlannedEnd >= 0 ? 'on_track' : 'delayed',
    days_variance: Math.abs(daysFromPlannedEnd),
    completion_rate: project.completion_percentage,
    task_completion_rate: taskStats.total_tasks > 0 ? 
      (taskStats.completed_tasks / taskStats.total_tasks) * 100 : 0,
    blocked_tasks_count: parseInt(taskStats.blocked_tasks),
    critical_path_status: 'healthy', // Would be calculated from critical path analysis
    resource_utilization: 85, // Would be calculated from resource assignments
    risk_factors: [],
    recommendations: [],
  };
}

/**
 * Helper function to calculate duration in days
 */
function calculateDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// Export route handlers
export const GET = withAuth(handleGet, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});

export const POST = withAuth(handlePost, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});

export const PUT = withAuth(handlePut, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});