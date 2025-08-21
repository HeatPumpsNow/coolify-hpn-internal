import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/supabase/server';
import { query, transaction, getProjectHierarchy } from '@/lib/database';
import { ApiResponse, Project } from '@/types';
import { z } from 'zod';

// Validation schemas
const ProjectUpdateSchema = z.object({
  updates: z.object({
    project_name: z.string().min(1).optional(),
    status: z.enum(['planned', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
    planned_start_date: z.string().date().optional(),
    planned_end_date: z.string().date().optional(),
    actual_start_date: z.string().date().optional(),
    actual_end_date: z.string().date().optional(),
    project_manager_id: z.string().uuid().optional(),
    lead_technician_id: z.string().uuid().optional(),
    customer_preferences: z.record(z.any()).optional(),
    site_conditions: z.record(z.any()).optional(),
    equipment_specs: z.record(z.any()).optional(),
    special_requirements: z.record(z.any()).optional(),
    team_changes: z.array(z.object({
      action: z.enum(['add_member', 'remove_member', 'update_allocation']),
      employee_id: z.string().uuid(),
      role: z.string().optional(),
      hours_allocated: z.number().optional(),
    })).optional(),
    schedule_adjustments: z.array(z.object({
      task_id: z.string().uuid(),
      task_type: z.enum(['phase', 'high_level_task', 'detailed_task']),
      new_start_date: z.string().date().optional(),
      new_end_date: z.string().date().optional(),
      reason: z.string(),
    })).optional(),
  }),
  update_reason: z.string().optional(),
});

/**
 * GET /api/projects/[id] - Get detailed project information
 */
async function handleGet(request: NextRequest, user: any, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const projectId = params.id;

    // Get detailed project information
    const projectResult = await query(
      `SELECT p.*, 
             c.first_name || ' ' || c.last_name as customer_name,
             c.email as customer_email,
             c.phone as customer_phone,
             c.address as customer_address
       FROM projects p
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE p.id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Project not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const project = projectResult.rows[0];

    // Get query parameters to determine what additional data to include
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];
    const detailLevel = searchParams.get('detail_level') || 'full';

    const projectData: any = {
      project,
    };

    // Include phases and tasks if requested
    if (include.includes('phases') || include.includes('tasks') || detailLevel === 'full') {
      try {
        projectData.phases = await getProjectHierarchy(projectId);
      } catch (err) {
        console.log('No phases found for project');
        projectData.phases = [];
      }
    }
    
    // Include line items from quote if this project was created from a quote
    if (project.quote_id && (include.includes('line_items') || detailLevel === 'full')) {
      const lineItemsResult = await query(
        `SELECT line_items FROM quotes WHERE id = $1`,
        [project.quote_id]
      );
      
      if (lineItemsResult.rows.length > 0) {
        projectData.line_items = lineItemsResult.rows[0].line_items || [];
      }
    }

    // Skip time entries for now (table doesn't exist)

    // Skip analytics for now (tables/functions don't exist)

    // Skip documents and team for now (tables don't exist)

    const response: ApiResponse<any> = {
      success: true,
      data: projectData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch project details',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id] - Update project details
 */
async function handlePut(request: NextRequest, user: any, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const projectId = params.id;
    const body = await request.json();
    const validatedData = ProjectUpdateSchema.parse(body);

    const result = await transaction(async (client) => {
      // Check if project exists and user has access
      const projectCheck = await client.query(
        'SELECT id, status FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found');
      }

      const currentProject = projectCheck.rows[0];

      // Build update query
      const updates = validatedData.updates;
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && !['team_changes', 'schedule_adjustments'].includes(key)) {
          updateFields.push(`${key} = $${++paramCount}`);
          updateValues.push(value);
        }
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        
        const updateQuery = `
          UPDATE projects 
          SET ${updateFields.join(', ')}
          WHERE id = $${++paramCount}
          RETURNING *
        `;
        updateValues.push(projectId);

        const updateResult = await client.query(updateQuery, updateValues);
        
        // Log status change if applicable
        if (updates.status && updates.status !== currentProject.status) {
          await client.query(
            `INSERT INTO job_status_updates (job_id, employee_id, old_status, new_status, notes)
             SELECT job_id, $2, $3, $4, $5
             FROM projects WHERE id = $1`,
            [projectId, user.id, currentProject.status, updates.status, validatedData.update_reason]
          );
        }
      }

      // Handle team changes
      if (updates.team_changes) {
        for (const teamChange of updates.team_changes) {
          switch (teamChange.action) {
            case 'add_member':
              // Add team member to appropriate tasks
              await client.query(
                `UPDATE project_high_level_tasks 
                 SET assigned_team = array_append(assigned_team, $2)
                 WHERE project_id = $1 AND NOT ($2 = ANY(assigned_team))`,
                [projectId, teamChange.employee_id]
              );
              break;
              
            case 'remove_member':
              // Remove team member from all tasks
              await client.query(
                `UPDATE project_high_level_tasks 
                 SET assigned_team = array_remove(assigned_team, $2)
                 WHERE project_id = $1`,
                [projectId, teamChange.employee_id]
              );
              
              await client.query(
                `UPDATE project_detailed_tasks 
                 SET assigned_employee_id = NULL
                 WHERE project_id = $1 AND assigned_employee_id = $2`,
                [projectId, teamChange.employee_id]
              );
              break;
              
            case 'update_allocation':
              // Update team member role or allocation
              if (teamChange.role === 'lead_technician') {
                await client.query(
                  'UPDATE projects SET lead_technician_id = $2 WHERE id = $1',
                  [projectId, teamChange.employee_id]
                );
              }
              break;
          }
        }
      }

      // Handle schedule adjustments
      if (updates.schedule_adjustments) {
        for (const adjustment of updates.schedule_adjustments) {
          let updateTable = '';
          switch (adjustment.task_type) {
            case 'phase':
              updateTable = 'project_phases';
              break;
            case 'high_level_task':
              updateTable = 'project_high_level_tasks';
              break;
            case 'detailed_task':
              updateTable = 'project_detailed_tasks';
              break;
          }

          if (updateTable) {
            const scheduleUpdates: string[] = [];
            const scheduleValues: any[] = [];
            let scheduleParamCount = 0;

            if (adjustment.new_start_date) {
              scheduleUpdates.push(`planned_start_datetime = $${++scheduleParamCount}`);
              scheduleValues.push(adjustment.new_start_date);
            }

            if (adjustment.new_end_date) {
              scheduleUpdates.push(`planned_end_datetime = $${++scheduleParamCount}`);
              scheduleValues.push(adjustment.new_end_date);
            }

            if (scheduleUpdates.length > 0) {
              scheduleValues.push(adjustment.task_id);
              await client.query(
                `UPDATE ${updateTable} SET ${scheduleUpdates.join(', ')} WHERE id = $${++scheduleParamCount}`,
                scheduleValues
              );
            }
          }
        }
      }

      // Get updated project data
      const finalResult = await client.query(
        `SELECT p.*, 
               c.first_name || ' ' || c.last_name as customer_name,
               pm.first_name || ' ' || pm.last_name as project_manager_name,
               lt.first_name || ' ' || lt.last_name as lead_technician_name
         FROM projects p
         LEFT JOIN customers c ON p.customer_id = c.id
         LEFT JOIN employees pm ON p.project_manager_id = pm.id
         LEFT JOIN employees lt ON p.lead_technician_id = lt.id
         WHERE p.id = $1`,
        [projectId]
      );

      return finalResult.rows[0];
    });

    const response: ApiResponse<Project> = {
      success: true,
      data: result,
      message: 'Project updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid update data' : 'Failed to update project',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id] - Delete project (soft delete)
 */
async function handleDelete(request: NextRequest, user: any, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const projectId = params.id;

    // Only owners can delete projects
    if (user.type !== 'owner') {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions to delete projects',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    await transaction(async (client) => {
      // Check if project exists
      const projectCheck = await client.query(
        'SELECT id, status FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found');
      }

      // Soft delete - set status to cancelled
      await client.query(
        `UPDATE projects 
         SET status = 'cancelled', 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [projectId]
      );

      // Log the deletion
      await client.query(
        `INSERT INTO job_status_updates (job_id, employee_id, old_status, new_status, notes)
         SELECT job_id, $2, status, 'cancelled', 'Project deleted by ' || $3
         FROM projects WHERE id = $1`,
        [projectId, user.id, user.name]
      );
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Project deleted successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete project',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Export route handlers with authentication and project access checks
export const GET = withAuthHandler(handleGet, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: false // Temporarily disabled for testing
});

export const PUT = withAuthHandler(handlePut, { 
  allowedUserTypes: ['owner', 'employee'],
  requireProjectAccess: true 
});

export const DELETE = withAuthHandler(handleDelete, { 
  allowedUserTypes: ['owner'],
  requireProjectAccess: true 
});