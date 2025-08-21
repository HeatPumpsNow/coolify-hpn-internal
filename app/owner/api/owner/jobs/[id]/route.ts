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
    const hasPermission = await OwnerAuthService.hasPermission(owner.id, 'jobs_manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const jobId = params.id;

    // Get job details with employee information
    const jobResult = await query(`
      SELECT 
        j.*,
        ja.employee_id,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.role as employee_role,
        e.phone as employee_phone,
        e.email as employee_email
      FROM jobs j
      LEFT JOIN job_assignments ja ON j.id = ja.job_id
      LEFT JOIN employees e ON ja.employee_id = e.id
      WHERE j.id = $1
    `, [jobId]);

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobResult.rows[0];

    // Get job photos
    const photosResult = await query(`
      SELECT 
        id,
        url,
        caption,
        phase,
        uploaded_at
      FROM job_photos
      WHERE job_id = $1
      ORDER BY uploaded_at DESC
    `, [jobId]);

    // Get job history/timeline
    const timelineResult = await query(`
      SELECT 
        type,
        description,
        created_at,
        metadata
      FROM business_activities
      WHERE related_id = $1 AND related_type = 'job'
      ORDER BY created_at DESC
    `, [jobId]);

    // Format job data
    const jobData = {
      id: job.id,
      customerName: job.customer_name,
      customerPhone: job.customer_phone,
      customerEmail: job.customer_email,
      serviceType: job.service_type,
      description: job.description,
      address: job.address,
      scheduledDate: job.scheduled_date,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      estimatedDuration: job.estimated_duration,
      actualDuration: job.actual_duration,
      status: job.status,
      priority: job.priority,
      totalAmount: parseFloat(job.total_amount) || 0,
      specialInstructions: job.special_instructions,
      equipmentNeeded: job.equipment_needed ? job.equipment_needed.split(',').map((item: string) => item.trim()) : [],
      skillsRequired: job.skills_required ? job.skills_required.split(',').map((skill: string) => skill.trim()) : [],
      customerRating: job.customer_rating,
      customerFeedback: job.customer_feedback,
      assignedEmployee: job.employee_id ? {
        id: job.employee_id,
        name: `${job.employee_first_name} ${job.employee_last_name}`,
        role: job.employee_role,
        phone: job.employee_phone,
        email: job.employee_email
      } : null,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    };

    // Format photos
    const photos = photosResult.rows.map(photo => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      phase: photo.phase,
      uploadedAt: photo.uploaded_at
    }));

    // Format timeline
    const timeline = timelineResult.rows.map(activity => ({
      type: activity.type,
      description: activity.description,
      timestamp: activity.created_at,
      metadata: activity.metadata
    }));

    return NextResponse.json({
      job: jobData,
      photos,
      timeline
    });

  } catch (error) {
    logger.error('Get job details error', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
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
    const hasPermission = await OwnerAuthService.hasPermission(owner.id, 'jobs_manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const jobId = params.id;
    const updateData = await request.json();

    // Build update query dynamically
    const allowedFields = [
      'customer_name', 'customer_phone', 'customer_email', 'service_type', 
      'description', 'address', 'scheduled_date', 'estimated_duration', 
      'status', 'priority', 'total_amount', 'special_instructions', 
      'equipment_needed', 'skills_required'
    ];
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        if (key === 'equipment_needed' || key === 'skills_required') {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(Array.isArray(updateData[key]) ? updateData[key].join(', ') : updateData[key]);
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(updateData[key]);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add updated_at
    updateFields.push(`updated_at = NOW()`);

    // Update job
    const result = await query(`
      UPDATE jobs 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, customer_name, service_type, status, updated_at
    `, [...updateValues, jobId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const updatedJob = result.rows[0];

    // Handle employee assignment if specified
    if (updateData.assignedEmployeeId !== undefined) {
      // Remove existing assignment
      await query('DELETE FROM job_assignments WHERE job_id = $1', [jobId]);
      
      // Add new assignment if employee specified
      if (updateData.assignedEmployeeId) {
        await query(`
          INSERT INTO job_assignments (job_id, employee_id, assigned_at)
          VALUES ($1, $2, NOW())
        `, [jobId, updateData.assignedEmployeeId]);
      }
    }

    // Log activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'job_updated',
      `Job ${updatedJob.customer_name} (${updatedJob.service_type}) updated`,
      jobId,
      'job'
    ]);

    logger.info('Job updated', {
      jobId,
      updatedBy: owner.id,
      changes: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        customerName: updatedJob.customer_name,
        serviceType: updatedJob.service_type,
        status: updatedJob.status,
        updatedAt: updatedJob.updated_at
      }
    });

  } catch (error) {
    logger.error('Update job error', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const hasPermission = await OwnerAuthService.hasPermission(owner.id, 'jobs_manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const jobId = params.id;

    // Get job info before deletion
    const jobResult = await query(`
      SELECT customer_name, service_type, status
      FROM jobs WHERE id = $1
    `, [jobId]);

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobResult.rows[0];

    // Prevent deletion of completed jobs
    if (job.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot delete completed jobs' },
        { status: 400 }
      );
    }

    // Delete job (cascade will handle assignments and photos)
    await query('DELETE FROM jobs WHERE id = $1', [jobId]);

    // Log activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'job_deleted',
      `Job ${job.customer_name} (${job.service_type}) deleted`,
      jobId,
      'job'
    ]);

    logger.info('Job deleted', {
      jobId,
      customerName: job.customer_name,
      deletedBy: owner.id
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Delete job error', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}