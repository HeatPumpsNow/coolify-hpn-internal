import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/supabase/server';
import { query, transaction } from '@/lib/database';
import { ApiResponse } from '@/types';
import { z } from 'zod';

// Validation schemas
const TaskUpdateSchema = z.object({
  task_updates: z.array(z.object({
    task_id: z.string().uuid(),
    task_type: z.enum(['phase', 'high_level_task', 'detailed_task']),
    status: z.string().optional(),
    actual_hours: z.number().optional(),
    actual_duration_hours: z.number().optional(),
    completion_percentage: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
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
  })),
  batch_notes: z.string().optional(),
});

const SingleTaskUpdateSchema = z.object({
  status: z.string().optional(),
  actual_duration_hours: z.number().optional(),
  completion_notes: z.string().optional(),
  efficiency_rating: z.number().min(1).max(10).optional(),
  quality_rating: z.number().min(1).max(10).optional(),
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
 * GET /api/projects/[id]/tasks - Get all tasks for a project in hierarchy
 */
async function handleGet(request: NextRequest, user: any, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get('task_type');
    const status = searchParams.get('status');
    const assigned_to = searchParams.get('assigned_to');
    const include_completed = searchParams.get('include_completed') === 'true';

    // Get phases with filters
    let phaseQuery = `
      SELECT pp.*, 
             COUNT(pht.id) as total_high_level_tasks,
             COUNT(CASE WHEN pht.status = 'completed' THEN 1 END) as completed_high_level_tasks
      FROM project_phases pp
      LEFT JOIN project_high_level_tasks pht ON pp.id = pht.phase_id
      WHERE pp.project_id = $1
    `;
    
    const params_array = [projectId];
    let paramCount = 1;

    if (!include_completed) {
      phaseQuery += ` AND pp.status != 'completed'`;
    }

    phaseQuery += ` GROUP BY pp.id ORDER BY pp.phase_order`;

    const phasesResult = await query(phaseQuery, params_array);
    const phases = phasesResult.rows;

    // Get high-level tasks for each phase
    for (const phase of phases) {
      let hlTaskQuery = `
        SELECT pht.*,
               e.first_name || ' ' || e.last_name as lead_technician_name,
               COUNT(pdt.id) as total_detailed_tasks,
               COUNT(CASE WHEN pdt.status = 'completed' THEN 1 END) as completed_detailed_tasks
        FROM project_high_level_tasks pht
        LEFT JOIN employees e ON pht.lead_technician_id = e.id
        LEFT JOIN project_detailed_tasks pdt ON pht.id = pdt.high_level_task_id
        WHERE pht.phase_id = $1
      `;

      const hlParams = [phase.id];
      let hlParamCount = 1;

      if (status) {
        hlTaskQuery += ` AND pht.status = $${++hlParamCount}`;
        hlParams.push(status);
      }

      if (assigned_to) {
        hlTaskQuery += ` AND (pht.lead_technician_id = $${++hlParamCount} OR $${hlParamCount} = ANY(pht.assigned_team))`;
        hlParams.push(assigned_to);
      }

      if (!include_completed) {
        hlTaskQuery += ` AND pht.status != 'completed'`;
      }

      hlTaskQuery += ` GROUP BY pht.id, e.first_name, e.last_name ORDER BY pht.task_order`;

      const hlTasksResult = await query(hlTaskQuery, hlParams);
      const hlTasks = hlTasksResult.rows;

      // Get detailed tasks for each high-level task
      for (const hlTask of hlTasks) {
        let detailQuery = `
          SELECT pdt.*,
                 e.first_name || ' ' || e.last_name as assigned_employee_name
          FROM project_detailed_tasks pdt
          LEFT JOIN employees e ON pdt.assigned_employee_id = e.id
          WHERE pdt.high_level_task_id = $1
        `;

        const detailParams = [hlTask.id];
        let detailParamCount = 1;

        if (status) {
          detailQuery += ` AND pdt.status = $${++detailParamCount}`;
          detailParams.push(status);
        }

        if (assigned_to) {
          detailQuery += ` AND pdt.assigned_employee_id = $${++detailParamCount}`;
          detailParams.push(assigned_to);
        }

        if (!include_completed) {
          detailQuery += ` AND pdt.status != 'completed'`;
        }

        detailQuery += ` ORDER BY pdt.task_order`;

        const detailTasksResult = await query(detailQuery, detailParams);
        hlTask.detailed_tasks = detailTasksResult.rows;
      }

      phase.high_level_tasks = hlTasks;
    }

    // Filter by task type if specified
    let resultData = phases;
    if (taskType === 'high_level_task') {
      resultData = phases.flatMap(phase => phase.high_level_tasks);
    } else if (taskType === 'detailed_task') {
      resultData = phases.flatMap(phase => 
        phase.high_level_tasks.flatMap(hlTask => hlTask.detailed_tasks)
      );
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        project_id: projectId,
        hierarchy: resultData,
        summary: {
          total_phases: phases.length,
          total_high_level_tasks: phases.reduce((sum, p) => sum + (p.total_high_level_tasks || 0), 0),
          total_detailed_tasks: phases.reduce((sum, p) => 
            sum + p.high_level_tasks.reduce((hlSum: number, hl: any) => 
              hlSum + (hl.total_detailed_tasks || 0), 0), 0),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch project tasks',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/tasks - Bulk update multiple tasks
 */
async function handlePut(request: NextRequest, user: any, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validatedData = TaskUpdateSchema.parse(body);

    const results = await transaction(async (client) => {
      const updateResults = [];

      for (const taskUpdate of validatedData.task_updates) {
        let tableName = '';
        let completionTimeField = '';
        
        switch (taskUpdate.task_type) {
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

        if (!tableName) continue;

        // Build update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramCount = 0;

        for (const [key, value] of Object.entries(taskUpdate)) {
          if (value !== undefined && !['task_id', 'task_type', 'materials_used', 'quality_checkpoints', 'photos_uploaded', 'issues_encountered'].includes(key)) {
            updateFields.push(`${key} = $${++paramCount}`);
            updateValues.push(value);
          }
        }

        // Set completion timestamp if status is completed
        if (taskUpdate.status === 'completed') {
          updateFields.push(`${completionTimeField} = CURRENT_TIMESTAMP`);
          if (taskUpdate.task_type === 'detailed_task') {
            updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
          }
        }

        if (updateFields.length > 0) {
          updateValues.push(taskUpdate.task_id);
          const updateQuery = `
            UPDATE ${tableName} 
            SET ${updateFields.join(', ')}
            WHERE id = $${++paramCount}
            RETURNING *
          `;

          const result = await client.query(updateQuery, updateValues);
          updateResults.push(result.rows[0]);

          // Handle materials usage for detailed tasks
          if (taskUpdate.materials_used && taskUpdate.task_type === 'detailed_task') {
            for (const material of taskUpdate.materials_used) {
              await client.query(
                `INSERT INTO project_material_usage (
                  project_id, detailed_task_id, employee_id, material_name,
                  quantity_used, unit_of_measure, unit_cost, total_cost,
                  usage_date, usage_time
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, CURRENT_TIME)`,
                [
                  projectId,
                  taskUpdate.task_id,
                  user.id,
                  material.material_name,
                  material.quantity,
                  material.unit,
                  material.cost,
                  (material.cost || 0) * material.quantity
                ]
              );
            }
          }
        }
      }

      // Update project completion percentage
      await updateProjectCompletion(client, projectId);

      return updateResults;
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        updated_tasks: results,
        batch_notes: validatedData.batch_notes,
      },
      message: `Successfully updated ${results.length} tasks`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating tasks:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid task update data' : 'Failed to update tasks',
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
}

// Export route handlers
export const GET = withAuthHandler(handleGet, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});

export const PUT = withAuthHandler(handlePut, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});