import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { query, transaction } from '@/lib/database';
import { ApiResponse } from '@/types';
import { z } from 'zod';

// Validation schema for single task update
const TaskUpdateSchema = z.object({
  status: z.string().optional(),
  actual_duration_hours: z.number().optional(),
  actual_hours: z.number().optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
  completion_notes: z.string().optional(),
  efficiency_rating: z.number().min(1).max(10).optional(),
  quality_rating: z.number().min(1).max(10).optional(),
  assigned_employee_id: z.string().uuid().optional(),
  materials_used: z.array(z.object({
    material_name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    cost: z.number().optional(),
  })).optional(),
  quality_checkpoints: z.array(z.object({
    checkpoint: z.string(),
    status: z.enum(['passed', 'failed', 'pending']),
    notes: z.string().optional(),
  })).optional(),
  photos_uploaded: z.array(z.string()).optional(),
  issues_encountered: z.array(z.object({
    issue_type: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    resolution: z.string().optional(),
  })).optional(),
  solutions_applied: z.array(z.object({
    solution_type: z.string(),
    description: z.string(),
    effectiveness: z.enum(['poor', 'fair', 'good', 'excellent']),
  })).optional(),
  variance_reasons: z.string().optional(),
  improvement_suggestions: z.string().optional(),
});

/**
 * GET /api/projects/[id]/tasks/[taskId] - Get specific task details
 */
async function handleGet(
  request: NextRequest, 
  user: any, 
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const projectId = params.id;
    const taskId = params.taskId;
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get('task_type') || 'detailed_task';

    let taskData = null;
    let tableName = '';
    let additionalJoins = '';
    let additionalFields = '';

    switch (taskType) {
      case 'phase':
        tableName = 'project_phases pp';
        additionalFields = `
          , COUNT(pht.id) as total_high_level_tasks
          , COUNT(CASE WHEN pht.status = 'completed' THEN 1 END) as completed_high_level_tasks
        `;
        additionalJoins = 'LEFT JOIN project_high_level_tasks pht ON pp.id = pht.phase_id';
        break;
      case 'high_level_task':
        tableName = 'project_high_level_tasks pht';
        additionalFields = `
          , e.first_name || ' ' || e.last_name as lead_technician_name
          , e.email as lead_technician_email
          , COUNT(pdt.id) as total_detailed_tasks
          , COUNT(CASE WHEN pdt.status = 'completed' THEN 1 END) as completed_detailed_tasks
        `;
        additionalJoins = `
          LEFT JOIN employees e ON pht.lead_technician_id = e.id
          LEFT JOIN project_detailed_tasks pdt ON pht.id = pdt.high_level_task_id
        `;
        break;
      case 'detailed_task':
        tableName = 'project_detailed_tasks pdt';
        additionalFields = `
          , e.first_name || ' ' || e.last_name as assigned_employee_name
          , e.email as assigned_employee_email
          , e.role as assigned_employee_role
        `;
        additionalJoins = 'LEFT JOIN employees e ON pdt.assigned_employee_id = e.id';
        break;
    }

    const taskQuery = `
      SELECT ${taskType === 'phase' ? 'pp' : taskType === 'high_level_task' ? 'pht' : 'pdt'}.*
             ${additionalFields}
      FROM ${tableName}
      ${additionalJoins}
      WHERE ${taskType === 'phase' ? 'pp' : taskType === 'high_level_task' ? 'pht' : 'pdt'}.id = $1
      ${taskType !== 'detailed_task' ? `GROUP BY ${taskType === 'phase' ? 'pp' : 'pht'}.id${additionalFields.includes('e.') ? ', e.first_name, e.last_name, e.email' : ''}` : ''}
    `;

    const taskResult = await query(taskQuery, [taskId]);

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Task not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    taskData = taskResult.rows[0];

    // Get material usage for detailed tasks
    if (taskType === 'detailed_task') {
      const materialsResult = await query(
        `SELECT pmu.*, e.first_name || ' ' || e.last_name as logged_by_name
         FROM project_material_usage pmu
         LEFT JOIN employees e ON pmu.employee_id = e.id
         WHERE pmu.detailed_task_id = $1
         ORDER BY pmu.usage_date DESC, pmu.created_at DESC`,
        [taskId]
      );
      taskData.materials_usage = materialsResult.rows;
    }

    // Get time entries for this task
    const timeEntriesResult = await query(
      `SELECT te.*, e.first_name || ' ' || e.last_name as employee_name
       FROM time_entries te
       LEFT JOIN employees e ON te.employee_id = e.id
       WHERE te.project_id = $1 
         AND te.time_allocations::text ILIKE $2
       ORDER BY te.entry_date DESC
       LIMIT 10`,
      [projectId, `%${taskId}%`]
    );
    taskData.recent_time_entries = timeEntriesResult.rows;

    // Get dependencies if applicable
    if (taskType !== 'detailed_task') {
      const dependenciesResult = await query(
        `SELECT td.*, 
                CASE 
                  WHEN td.predecessor_task_type = 'phase' THEN (SELECT phase_name FROM project_phases WHERE id = td.predecessor_task_id)
                  WHEN td.predecessor_task_type = 'high_level_task' THEN (SELECT task_name FROM project_high_level_tasks WHERE id = td.predecessor_task_id)
                  WHEN td.predecessor_task_type = 'detailed_task' THEN (SELECT task_name FROM project_detailed_tasks WHERE id = td.predecessor_task_id)
                END as predecessor_task_name,
                CASE 
                  WHEN td.successor_task_type = 'phase' THEN (SELECT phase_name FROM project_phases WHERE id = td.successor_task_id)
                  WHEN td.successor_task_type = 'high_level_task' THEN (SELECT task_name FROM project_high_level_tasks WHERE id = td.successor_task_id)
                  WHEN td.successor_task_type = 'detailed_task' THEN (SELECT task_name FROM project_detailed_tasks WHERE id = td.successor_task_id)
                END as successor_task_name
         FROM task_dependencies td
         WHERE td.predecessor_task_id = $1 OR td.successor_task_id = $1`,
        [taskId]
      );
      taskData.dependencies = dependenciesResult.rows;
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        task: taskData,
        task_type: taskType,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching task details:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch task details',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/tasks/[taskId] - Update specific task
 */
async function handlePut(
  request: NextRequest, 
  user: any, 
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const projectId = params.id;
    const taskId = params.taskId;
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get('task_type') || 'detailed_task';
    
    const body = await request.json();
    const validatedData = TaskUpdateSchema.parse(body);

    const result = await transaction(async (client) => {
      let tableName = '';
      let completionTimeField = '';
      
      switch (taskType) {
        case 'phase':
          tableName = 'project_phases';
          completionTimeField = 'actual_end_date';
          break;
        case 'high_level_task':
          tableName = 'project_high_level_tasks';
          completionTimeField = 'actual_end_datetime';
          break;
        case 'detailed_task':
          tableName = 'project_detailed_tasks';
          completionTimeField = 'actual_end_datetime';
          break;
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(validatedData)) {
        if (value !== undefined && !['materials_used', 'quality_checkpoints', 'photos_uploaded', 'issues_encountered', 'solutions_applied'].includes(key)) {
          updateFields.push(`${key} = $${++paramCount}`);
          updateValues.push(value);
        }
      }

      // Set start time if status changes to in_progress
      if (validatedData.status === 'in_progress') {
        const actualStartField = taskType === 'phase' ? 'actual_start_date' : 'actual_start_datetime';
        updateFields.push(`${actualStartField} = COALESCE(${actualStartField}, CURRENT_TIMESTAMP)`);
      }

      // Set completion timestamp if status is completed
      if (validatedData.status === 'completed') {
        updateFields.push(`${completionTimeField} = CURRENT_TIMESTAMP`);
        if (taskType === 'detailed_task') {
          updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
        }
        // Set completion percentage to 100
        updateFields.push(`completion_percentage = 100`);
      }

      if (updateFields.length > 0) {
        updateValues.push(taskId);
        const updateQuery = `
          UPDATE ${tableName} 
          SET ${updateFields.join(', ')}
          WHERE id = $${++paramCount}
          RETURNING *
        `;

        const taskResult = await client.query(updateQuery, updateValues);
        const updatedTask = taskResult.rows[0];

        // Handle materials usage for detailed tasks
        if (validatedData.materials_used && taskType === 'detailed_task') {
          for (const material of validatedData.materials_used) {
            await client.query(
              `INSERT INTO project_material_usage (
                project_id, detailed_task_id, employee_id, material_name,
                quantity_used, unit_of_measure, unit_cost, total_cost,
                usage_date, usage_time, usage_notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, CURRENT_TIME, $9)`,
              [
                projectId,
                taskId,
                user.id,
                material.material_name,
                material.quantity,
                material.unit,
                material.cost || 0,
                (material.cost || 0) * material.quantity,
                `Updated via task completion by ${user.name}`
              ]
            );
          }
        }

        // Update project completion percentage
        await updateProjectCompletion(client, projectId);

        // Create learning insights if there are variances
        if (validatedData.actual_duration_hours && updatedTask.estimated_duration_hours) {
          const variance = validatedData.actual_duration_hours - updatedTask.estimated_duration_hours;
          const variancePercentage = (variance / updatedTask.estimated_duration_hours) * 100;

          if (Math.abs(variancePercentage) > 10) { // Only create insights for significant variances
            await client.query(
              `INSERT INTO project_learning_insights (
                project_id, insight_type, insight_category, task_type,
                variance_type, variance_amount, variance_percentage,
                recommended_action, created_by
              ) VALUES ($1, 'time_variance', 'template_adjustment', $2, $3, $4, $5, $6, $7)`,
              [
                projectId,
                updatedTask.task_name,
                variance > 0 ? 'over_estimate' : 'under_estimate',
                variance,
                variancePercentage,
                validatedData.variance_reasons || 'Task completion variance detected',
                user.id
              ]
            );
          }
        }

        return updatedTask;
      }

      return null;
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: 'No updates were made',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        task: result,
        task_type: taskType,
      },
      message: 'Task updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid task update data' : 'Failed to update task',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * Helper function to update project completion percentage
 */
async function updateProjectCompletion(client: any, projectId: string) {
  const result = await client.query(
    `SELECT 
       COUNT(*) as total_tasks,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
     FROM project_high_level_tasks 
     WHERE project_id = $1`,
    [projectId]
  );

  const { total_tasks, completed_tasks } = result.rows[0];
  const completionPercentage = total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0;

  await client.query(
    `UPDATE projects 
     SET completion_percentage = $2, 
         updated_at = CURRENT_TIMESTAMP,
         status = CASE 
           WHEN $2 = 100 THEN 'completed'
           WHEN $2 > 0 AND status = 'planned' THEN 'in_progress'
           ELSE status
         END
     WHERE id = $1`,
    [projectId, completionPercentage]
  );

  // Update actual hours from time entries
  const hoursResult = await client.query(
    `SELECT COALESCE(SUM(total_project_hours), 0) as total_actual_hours
     FROM time_entries 
     WHERE project_id = $1`,
    [projectId]
  );

  const totalActualHours = hoursResult.rows[0].total_actual_hours;

  await client.query(
    'UPDATE projects SET actual_hours = $2 WHERE id = $1',
    [projectId, totalActualHours]
  );
}

// Export route handlers
export const GET = withAuth(handleGet, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});

export const PUT = withAuth(handlePut, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});