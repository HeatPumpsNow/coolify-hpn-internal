import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withMobileAuth } from '@/lib/supabase/server';
import { query, transaction, registerMobileDevice } from '@/lib/database';
import { TimeEntryRequest, ApiResponse, TimeEntry } from '@/types';
import { z } from 'zod';

// Validation schemas
const TimeEntrySchema = z.object({
  employee_id: z.string().uuid(),
  project_id: z.string().uuid(),
  entry_date: z.string().date(),
  clock_in_time: z.string().datetime().optional(),
  clock_out_time: z.string().datetime().optional(),
  time_allocations: z.array(z.object({
    allocation_id: z.string().uuid().optional(),
    hierarchy_level: z.enum(['phase', 'high_level_task', 'detailed_task']),
    phase_id: z.string().uuid().optional(),
    high_level_task_id: z.string().uuid().optional(),
    detailed_task_id: z.string().uuid().optional(),
    start_time: z.string(),
    end_time: z.string(),
    duration_hours: z.number().min(0),
    notes: z.string().optional(),
    challenges_encountered: z.array(z.string()).optional(),
    efficiency_rating: z.number().min(1).max(10).optional(),
    materials_used: z.array(z.object({
      item: z.string(),
      quantity: z.number(),
      unit: z.string(),
      cost: z.number().optional(),
    })).optional(),
  })),
  break_time_hours: z.number().min(0).optional(),
  travel_time_hours: z.number().min(0).optional(),
  training_time_hours: z.number().min(0).optional(),
  admin_time_hours: z.number().min(0).optional(),
  location_data: z.object({
    clock_in_location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
      accuracy: z.number().optional(),
    }).optional(),
    clock_out_location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
      accuracy: z.number().optional(),
    }).optional(),
    gps_verified: z.boolean().optional(),
  }).optional(),
  daily_notes: z.string().optional(),
  challenges_faced: z.string().optional(),
  achievements: z.string().optional(),
  weather_conditions: z.string().optional(),
  site_conditions_notes: z.string().optional(),
  customer_interaction: z.boolean().optional(),
  customer_feedback: z.string().optional(),
  productivity_score: z.number().min(1).max(10).optional(),
  work_quality_score: z.number().min(1).max(10).optional(),
  device_info: z.object({
    device_id: z.string(),
    device_type: z.enum(['ios', 'android', 'web']),
    app_version: z.string().optional(),
    operating_system: z.string().optional(),
  }).optional(),
});

const TimeEntryFiltersSchema = z.object({
  project_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  approved: z.enum(['true', 'false']).optional(),
  submitted: z.enum(['true', 'false']).optional(),
  sync_status: z.enum(['pending', 'synced', 'error']).optional(),
  page: z.string().transform(Number).optional(),
  per_page: z.string().transform(Number).optional(),
});

/**
 * GET /api/time-entries - List time entries with filtering
 */
async function handleGet(request: NextRequest, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = TimeEntryFiltersSchema.parse(Object.fromEntries(searchParams));

    // Build query with filters
    let queryText = `
      SELECT te.*, 
             e.first_name || ' ' || e.last_name as employee_name,
             e.role as employee_role,
             p.project_name,
             p.project_number,
             c.first_name || ' ' || c.last_name as customer_name
      FROM time_entries te
      LEFT JOIN employees e ON te.employee_id = e.id
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Apply filters
    if (filters.project_id) {
      queryText += ` AND te.project_id = $${++paramCount}`;
      params.push(filters.project_id);
    }

    if (filters.employee_id) {
      queryText += ` AND te.employee_id = $${++paramCount}`;
      params.push(filters.employee_id);
    }

    if (filters.start_date) {
      queryText += ` AND te.entry_date >= $${++paramCount}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      queryText += ` AND te.entry_date <= $${++paramCount}`;
      params.push(filters.end_date);
    }

    if (filters.approved) {
      queryText += ` AND te.approved = $${++paramCount}`;
      params.push(filters.approved === 'true');
    }

    if (filters.submitted) {
      queryText += ` AND te.submitted = $${++paramCount}`;
      params.push(filters.submitted === 'true');
    }

    if (filters.sync_status) {
      queryText += ` AND te.sync_status = $${++paramCount}`;
      params.push(filters.sync_status);
    }

    // User access control - employees can only see their own entries
    if (user.type === 'employee') {
      queryText += ` AND te.employee_id = $${++paramCount}`;
      params.push(user.id);
    }

    queryText += ` ORDER BY te.entry_date DESC, te.created_at DESC`;

    // Pagination
    const page = filters.page || 1;
    const perPage = Math.min(filters.per_page || 20, 100);
    const offset = (page - 1) * perPage;

    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(perPage, offset);

    // Get total count
    let countQuery = queryText.replace(/SELECT te\.\*.*?FROM/, 'SELECT COUNT(*)\\nFROM');
    countQuery = countQuery.replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, '');

    const [entriesResult, countResult] = await Promise.all([
      query(queryText, params),
      query(countQuery, params.slice(0, -2)),
    ]);

    const timeEntries = entriesResult.rows;
    const total = parseInt(countResult.rows[0].count);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        time_entries: timeEntries,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid filter parameters' : 'Failed to fetch time entries',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * POST /api/time-entries - Create new time entry
 */
async function handlePost(request: NextRequest, user: any) {
  try {
    const body = await request.json();
    const validatedData = TimeEntrySchema.parse(body);

    // Validate employee access
    if (user.type === 'employee' && validatedData.employee_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot create time entries for other employees',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const result = await transaction(async (client) => {
      // Check for existing time entry for this date
      const existingEntry = await client.query(
        'SELECT id FROM time_entries WHERE project_id = $1 AND employee_id = $2 AND entry_date = $3',
        [validatedData.project_id, validatedData.employee_id, validatedData.entry_date]
      );

      if (existingEntry.rows.length > 0) {
        throw new Error('Time entry already exists for this date');
      }

      // Calculate totals
      const totalProjectHours = validatedData.time_allocations.reduce((sum, allocation) => sum + allocation.duration_hours, 0);
      const totalBillableHours = totalProjectHours; // All project time is billable
      const totalNonBillableHours = (validatedData.break_time_hours || 0) + 
                                   (validatedData.training_time_hours || 0) + 
                                   (validatedData.admin_time_hours || 0);

      // Create time entry
      const timeEntryResult = await client.query(
        `INSERT INTO time_entries (
          project_id, employee_id, entry_date, clock_in_time, clock_out_time,
          time_allocations, break_time_hours, travel_time_hours, 
          training_time_hours, admin_time_hours, clock_in_location, 
          clock_out_location, gps_verified, location_accuracy_meters,
          total_project_hours, total_billable_hours, total_non_billable_hours,
          productivity_score, work_quality_score, daily_notes, challenges_faced,
          achievements, weather_conditions, site_conditions_notes,
          customer_interaction, customer_feedback, device_info, app_version,
          sync_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        ) RETURNING *`,
        [
          validatedData.project_id,
          validatedData.employee_id,
          validatedData.entry_date,
          validatedData.clock_in_time,
          validatedData.clock_out_time,
          JSON.stringify(validatedData.time_allocations),
          validatedData.break_time_hours || 0,
          validatedData.travel_time_hours || 0,
          validatedData.training_time_hours || 0,
          validatedData.admin_time_hours || 0,
          validatedData.location_data?.clock_in_location ? JSON.stringify(validatedData.location_data.clock_in_location) : null,
          validatedData.location_data?.clock_out_location ? JSON.stringify(validatedData.location_data.clock_out_location) : null,
          validatedData.location_data?.gps_verified || false,
          validatedData.location_data?.clock_in_location?.accuracy,
          totalProjectHours,
          totalBillableHours,
          totalNonBillableHours,
          validatedData.productivity_score,
          validatedData.work_quality_score,
          validatedData.daily_notes,
          validatedData.challenges_faced,
          validatedData.achievements,
          validatedData.weather_conditions,
          validatedData.site_conditions_notes,
          validatedData.customer_interaction || false,
          validatedData.customer_feedback,
          validatedData.device_info ? JSON.stringify(validatedData.device_info) : null,
          validatedData.device_info?.app_version,
          'synced'
        ]
      );

      const timeEntry = timeEntryResult.rows[0];

      // Register mobile device if provided
      if (validatedData.device_info) {
        await registerMobileDevice({
          employee_id: validatedData.employee_id,
          device_id: validatedData.device_info.device_id,
          device_type: validatedData.device_info.device_type,
          operating_system: validatedData.device_info.operating_system,
          app_version: validatedData.device_info.app_version,
        });
      }

      // Process material usage from time allocations
      for (const allocation of validatedData.time_allocations) {
        if (allocation.materials_used && allocation.detailed_task_id) {
          for (const material of allocation.materials_used) {
            await client.query(
              `INSERT INTO project_material_usage (
                project_id, detailed_task_id, time_entry_id, employee_id,
                material_name, quantity_used, unit_of_measure, unit_cost,
                total_cost, usage_date, usage_time, usage_notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                validatedData.project_id,
                allocation.detailed_task_id,
                timeEntry.id,
                validatedData.employee_id,
                material.item,
                material.quantity,
                material.unit,
                material.cost || 0,
                (material.cost || 0) * material.quantity,
                validatedData.entry_date,
                allocation.start_time,
                allocation.notes || 'Material usage from time entry'
              ]
            );
          }
        }
      }

      // Update project actual hours
      const projectHoursResult = await client.query(
        `SELECT COALESCE(SUM(total_project_hours), 0) as total_actual_hours
         FROM time_entries 
         WHERE project_id = $1`,
        [validatedData.project_id]
      );

      await client.query(
        'UPDATE projects SET actual_hours = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [validatedData.project_id, projectHoursResult.rows[0].total_actual_hours]
      );

      // Calculate variance analysis
      const varianceAnalysis = await calculateVarianceAnalysis(client, timeEntry);

      return {
        time_entry: timeEntry,
        variance_analysis: varianceAnalysis,
      };
    });

    const response: ApiResponse<any> = {
      success: true,
      data: result,
      message: 'Time entry created successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof z.ZodError ? 'Invalid time entry data' : error.message || 'Failed to create time entry',
        timestamp: new Date().toISOString(),
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

/**
 * Helper function to calculate variance analysis
 */
async function calculateVarianceAnalysis(client: any, timeEntry: any) {
  const allocations = JSON.parse(timeEntry.time_allocations);
  const analysis = {
    tasks_on_estimate: 0,
    tasks_over_estimate: 0,
    tasks_under_estimate: 0,
    average_efficiency: 0,
    total_variance_hours: 0,
  };

  let totalEfficiency = 0;
  let tasksWithEfficiency = 0;

  for (const allocation of allocations) {
    let estimatedHours = 0;
    
    // Get estimated hours based on hierarchy level
    if (allocation.detailed_task_id) {
      const taskResult = await client.query(
        'SELECT estimated_duration_hours FROM project_detailed_tasks WHERE id = $1',
        [allocation.detailed_task_id]
      );
      estimatedHours = taskResult.rows[0]?.estimated_duration_hours || 0;
    } else if (allocation.high_level_task_id) {
      const taskResult = await client.query(
        'SELECT estimated_hours FROM project_high_level_tasks WHERE id = $1',
        [allocation.high_level_task_id]
      );
      estimatedHours = taskResult.rows[0]?.estimated_hours || 0;
    }

    if (estimatedHours > 0) {
      const variance = allocation.duration_hours - estimatedHours;
      analysis.total_variance_hours += variance;

      if (Math.abs(variance) <= estimatedHours * 0.1) { // Within 10%
        analysis.tasks_on_estimate++;
      } else if (variance > 0) {
        analysis.tasks_over_estimate++;
      } else {
        analysis.tasks_under_estimate++;
      }
    }

    if (allocation.efficiency_rating) {
      totalEfficiency += allocation.efficiency_rating;
      tasksWithEfficiency++;
    }
  }

  analysis.average_efficiency = tasksWithEfficiency > 0 ? totalEfficiency / tasksWithEfficiency : 0;

  return analysis;
}

// Export route handlers with authentication
export const GET = withAuth(handleGet, { allowedUserTypes: ['owner', 'employee'] });
export const POST = withAuth(handlePost, { allowedUserTypes: ['owner', 'employee'] });