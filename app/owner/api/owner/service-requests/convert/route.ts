import { NextRequest, NextResponse } from 'next/server';
import OwnerAuthService from '@/lib/auth-owner';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { verifyOwnerToken } = await import('@/lib/auth');
    const owner = await verifyOwnerToken(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const {
      serviceRequestId,
      scheduledDate,
      estimatedDuration,
      priority,
      assignedEmployeeId,
      customInstructions
    } = await request.json();

    // Validate required fields
    if (!serviceRequestId) {
      return NextResponse.json(
        { error: 'Service request ID is required' },
        { status: 400 }
      );
    }

    // Check if service request exists and isn't already converted
    const serviceRequestCheck = await query(`
      SELECT id, related_job_id, title, status
      FROM service_requests 
      WHERE id = $1
    `, [serviceRequestId]);

    if (serviceRequestCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    const serviceRequest = serviceRequestCheck.rows[0];

    if (serviceRequest.related_job_id) {
      return NextResponse.json(
        { error: 'Service request has already been converted to a job' },
        { status: 400 }
      );
    }

    // Get service request details for job creation
    const serviceRequestDetails = await query(`
      SELECT 
        sr.*,
        c.first_name || ' ' || c.last_name as full_name,
        c.phone,
        c.email,
        c.address
      FROM service_requests sr
      JOIN customers c ON sr.customer_id = c.id
      WHERE sr.id = $1
    `, [serviceRequestId]);

    if (serviceRequestDetails.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request details not found' },
        { status: 404 }
      );
    }

    const srDetails = serviceRequestDetails.rows[0];

    // Map service request type to valid job type
    const getJobType = (requestType: string): string => {
      const jobTypeMap: { [key: string]: string } = {
        'no_heating': 'repair',
        'no_cooling': 'repair', 
        'strange_noise': 'repair',
        'high_bills': 'service',
        'poor_air_quality': 'service',
        'maintenance': 'maintenance',
        'installation': 'installation',
        'annual_service': 'maintenance',
        'filter_change': 'maintenance',
        'system_checkup': 'maintenance',
        'warranty_service': 'service',
        'other': 'service'
      };
      return jobTypeMap[requestType] || 'service';
    };

    // Create job from service request
    const customerName = srDetails.full_name;
    const customerPhone = srDetails.phone || null;
    const customerEmail = srDetails.email || null;
    const address = srDetails.address;
    const jobType = getJobType(srDetails.request_type);
    const scheduledDateTime = scheduledDate ? new Date(scheduledDate + 'T09:00:00Z') : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const duration = estimatedDuration || 4;
    const notes = `${srDetails.title}: ${srDetails.description || ''} [Converted from service request]`;

    const jobResult = await query(`
      INSERT INTO jobs (
        customer_name, customer_phone, customer_email, address, job_type,
        scheduled_date, estimated_duration, status, customer_notes
      ) VALUES ($1, $2::varchar, $3::varchar, $4, $5, $6, $7, 'scheduled', $8)
      RETURNING id, customer_name, job_type, scheduled_date, status, created_at
    `, [
      customerName,
      customerPhone,
      customerEmail,
      address,
      jobType,
      scheduledDateTime,
      duration,
      notes
    ]);

    const newJob = jobResult.rows[0];
    const jobId = newJob.id;

    // Update service request to link to the new job
    await query(`
      UPDATE service_requests 
      SET related_job_id = $1, 
          status = 'scheduled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [jobId, serviceRequestId]);

    // If an employee is assigned, create the job assignment
    if (assignedEmployeeId) {
      await query(`
        INSERT INTO job_assignments (job_id, employee_id, assigned_by, notes, assigned_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (job_id, employee_id) DO UPDATE SET
          assigned_by = $3,
          notes = $4,
          assigned_at = CURRENT_TIMESTAMP
      `, [
        jobId,
        assignedEmployeeId,
        owner.id,
        customInstructions || 'Converted from service request'
      ]);

      // Update the job to reflect the assignment
      await query(`
        UPDATE jobs 
        SET assigned_employees = ARRAY[$1::UUID],
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [assignedEmployeeId, jobId]);
    }

    // Get the created job details (use the job we already have from insert)
    const jobDetails = newJob;
    
    // If we assigned an employee, get their name
    let employeeName = null;
    if (assignedEmployeeId) {
      const employeeResult = await query(`
        SELECT first_name || ' ' || last_name as full_name
        FROM employees 
        WHERE id = $1
      `, [assignedEmployeeId]);
      
      if (employeeResult.rows.length > 0) {
        employeeName = employeeResult.rows[0].full_name;
      }
    }

    // Create a system communication message about the conversion
    await query(`
      INSERT INTO customer_communications (
        customer_id,
        service_request_id,
        job_id,
        thread_id,
        message_type,
        sender_type,
        message,
        read_by_customer,
        read_by_technician,
        created_at
      )
      SELECT 
        sr.customer_id,
        sr.id,
        $1,
        COALESCE(
          (SELECT thread_id FROM customer_communications WHERE service_request_id = sr.id LIMIT 1),
          uuid_generate_v4()
        ),
        'status_update',
        'system',
        'Your service request has been scheduled as a job. ' || 
        CASE 
          WHEN $2 IS NOT NULL THEN 'A technician has been assigned and will contact you soon.'
          ELSE 'We will assign a technician and contact you with details.'
        END,
        false,
        false,
        CURRENT_TIMESTAMP
      FROM service_requests sr
      WHERE sr.id = $3
    `, [jobId, assignedEmployeeId, serviceRequestId]);

    // Log the conversion activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, data, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      'service_request_converted',
      `Service request "${serviceRequest.title}" converted to job`,
      jobId,
      'job',
      JSON.stringify({
        original_service_request_id: serviceRequestId,
        assigned_employee_id: assignedEmployeeId,
        converted_by: owner.id
      })
    ]);

    logger.info('Service request converted to job', {
      serviceRequestId,
      jobId,
      assignedEmployeeId,
      convertedBy: owner.id
    });

    return NextResponse.json({
      success: true,
      job: {
        id: jobDetails.id,
        customerName: jobDetails.customer_name,
        jobType: jobDetails.job_type,
        scheduledDate: jobDetails.scheduled_date,
        status: jobDetails.status,
        assignedEmployee: assignedEmployeeId ? {
          id: assignedEmployeeId,
          name: employeeName
        } : null
      },
      message: 'Service request successfully converted to job'
    });

  } catch (error) {
    logger.error('Convert service request error', error);
    return NextResponse.json(
      { error: 'Failed to convert service request to job' },
      { status: 500 }
    );
  }
}