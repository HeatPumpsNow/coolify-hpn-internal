import { NextRequest, NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/supabase/server';
import { query, transaction } from '@/lib/database';
import { ApiResponse } from '@/types';
import { z } from 'zod';

// Validation schema for mobile time clock
const MobileClockSchema = z.object({
  action: z.enum(['clock_in', 'clock_out']),
  project_id: z.string().uuid(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    address: z.string().optional(),
  }),
  device_info: z.object({
    device_id: z.string(),
    device_type: z.enum(['ios', 'android']),
    app_version: z.string().optional(),
    operating_system: z.string().optional(),
  }),
  notes: z.string().optional(),
  photo_ids: z.array(z.string()).optional(),
});

/**
 * POST /api/mobile/clock - Mobile time clock in/out
 */
async function handlePost(request: NextRequest, user: any) {
  try {
    const body = await request.json();
    const validatedData = MobileClockSchema.parse(body);

    const result = await transaction(async (client) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if employee has access to this project
      const projectAccess = await client.query(
        `SELECT p.id, p.project_name, p.status
         FROM projects p
         LEFT JOIN project_high_level_tasks pht ON p.id = pht.project_id
         LEFT JOIN project_detailed_tasks pdt ON pht.id = pdt.high_level_task_id
         WHERE p.id = $1 
           AND (p.project_manager_id = $2 
                OR p.lead_technician_id = $2
                OR pht.lead_technician_id = $2
                OR pdt.assigned_employee_id = $2
                OR $2 = ANY(pht.assigned_team))
         LIMIT 1`,
        [validatedData.project_id, user.id]
      );

      if (projectAccess.rows.length === 0) {
        throw new Error('No access to this project');
      }

      const project = projectAccess.rows[0];

      if (project.status === 'completed' || project.status === 'cancelled') {
        throw new Error('Cannot clock time to completed or cancelled projects');
      }

      // Get or create time entry for today
      let timeEntryResult = await client.query(
        'SELECT * FROM time_entries WHERE project_id = $1 AND employee_id = $2 AND entry_date = $3',
        [validatedData.project_id, user.id, today]
      );

      let timeEntry;
      
      if (timeEntryResult.rows.length === 0) {
        // Create new time entry
        const createResult = await client.query(
          `INSERT INTO time_entries (
            project_id, employee_id, entry_date, time_allocations,
            total_project_hours, total_billable_hours, total_non_billable_hours,
            gps_verified, device_info, app_version, sync_status
          ) VALUES ($1, $2, $3, $4, 0, 0, 0, true, $5, $6, 'synced')
          RETURNING *`,
          [
            validatedData.project_id,
            user.id,
            today,
            JSON.stringify([]),
            JSON.stringify(validatedData.device_info),
            validatedData.device_info.app_version
          ]
        );
        timeEntry = createResult.rows[0];
      } else {
        timeEntry = timeEntryResult.rows[0];
      }

      const currentTime = new Date().toISOString();
      const locationData = {
        latitude: validatedData.location.latitude,
        longitude: validatedData.location.longitude,
        accuracy: validatedData.location.accuracy,
        address: validatedData.location.address,
        timestamp: currentTime,
      };

      if (validatedData.action === 'clock_in') {
        // Clock in
        if (timeEntry.clock_in_time) {
          throw new Error('Already clocked in for today');
        }

        await client.query(
          `UPDATE time_entries 
           SET clock_in_time = $2,
               clock_in_location = $3,
               daily_notes = COALESCE(daily_notes, '') || $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            timeEntry.id,
            currentTime,
            JSON.stringify(locationData),
            validatedData.notes ? `Clock in: ${validatedData.notes}\\n` : ''
          ]
        );

        // Get available tasks for this employee
        const availableTasks = await client.query(
          `SELECT 
             'phase' as task_type, pp.id, pp.phase_name as task_name, 
             pp.status, pp.estimated_hours as estimated_duration
           FROM project_phases pp
           WHERE pp.project_id = $1 AND pp.status != 'completed'
           
           UNION ALL
           
           SELECT 
             'high_level_task' as task_type, pht.id, pht.task_name, 
             pht.status, pht.estimated_hours as estimated_duration
           FROM project_high_level_tasks pht
           WHERE pht.project_id = $1 
             AND pht.status != 'completed'
             AND (pht.lead_technician_id = $2 OR $2 = ANY(pht.assigned_team))
           
           UNION ALL
           
           SELECT 
             'detailed_task' as task_type, pdt.id, pdt.task_name, 
             pdt.status, pdt.estimated_duration_hours as estimated_duration
           FROM project_detailed_tasks pdt
           JOIN project_high_level_tasks pht ON pdt.high_level_task_id = pht.id
           WHERE pdt.project_id = $1 
             AND pdt.status != 'completed'
             AND (pdt.assigned_employee_id = $2 OR pht.lead_technician_id = $2 OR $2 = ANY(pht.assigned_team))
           
           ORDER BY task_type, task_name`,
          [validatedData.project_id, user.id]
        );

        return {
          action: 'clock_in',
          time_entry_id: timeEntry.id,
          clock_in_time: currentTime,
          project_name: project.project_name,
          location_verified: true,
          available_tasks: availableTasks.rows,
        };

      } else if (validatedData.action === 'clock_out') {
        // Clock out
        if (!timeEntry.clock_in_time) {
          throw new Error('Must clock in before clocking out');
        }

        if (timeEntry.clock_out_time) {
          throw new Error('Already clocked out for today');
        }

        // Calculate total day hours
        const clockInTime = new Date(timeEntry.clock_in_time);
        const clockOutTime = new Date(currentTime);
        const totalDayHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

        await client.query(
          `UPDATE time_entries 
           SET clock_out_time = $2,
               clock_out_location = $3,
               daily_notes = COALESCE(daily_notes, '') || $4,
               submitted = true,
               submitted_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            timeEntry.id,
            currentTime,
            JSON.stringify(locationData),
            validatedData.notes ? `Clock out: ${validatedData.notes}\\n` : ''
          ]
        );

        // Get day summary
        const summaryResult = await client.query(
          `SELECT 
             total_project_hours,
             total_billable_hours,
             total_non_billable_hours,
             time_allocations
           FROM time_entries 
           WHERE id = $1`,
          [timeEntry.id]
        );

        const summary = summaryResult.rows[0];
        const allocations = JSON.parse(summary.time_allocations || '[]');

        return {
          action: 'clock_out',
          time_entry_id: timeEntry.id,
          clock_out_time: currentTime,
          total_day_hours: Math.round(totalDayHours * 100) / 100,
          project_hours: summary.total_project_hours,
          billable_hours: summary.total_billable_hours,
          task_count: allocations.length,
          location_verified: true,
          submitted: true,
        };
      }
    });

    const response: ApiResponse<any> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error with mobile clock:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid clock data' : error.message || 'Clock operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// Export mobile route handler
export const POST = withMobileAuth(handlePost);