import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate employee (consistent with service requests list API)
    const tokenCookie = request.cookies.get('auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const AuthService = await import('@/lib/supabase/server');
    const employee = await AuthService.default.validateSession(tokenCookie.value);
    if (!employee) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const resolvedParams = await params;
    const serviceRequestId = resolvedParams.id;

    // Get service request details - verify employee is assigned
    const serviceRequestResult = await query(`
      SELECT 
        sr.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        ce.brand || ' ' || ce.model as equipment_name,
        EXTRACT(DAY FROM CURRENT_TIMESTAMP - sr.created_at)::INTEGER as days_pending
      FROM service_requests sr
      JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN customer_equipment ce ON sr.equipment_id = ce.id
      WHERE sr.id = $1 AND sr.assigned_technician_id = $2
    `, [serviceRequestId, employee.user?.id]);

    if (serviceRequestResult.rows.length === 0) {
      // Check if service request exists at all for better error messaging
      const checkExistsResult = await query(`
        SELECT sr.id, sr.assigned_technician_id, sr.status,
               COALESCE(e.first_name || ' ' || e.last_name, 'Unassigned') as assigned_to
        FROM service_requests sr
        LEFT JOIN employees e ON sr.assigned_technician_id = e.id
        WHERE sr.id = $1
      `, [serviceRequestId]);
      
      if (checkExistsResult.rows.length === 0) {
        logger.warn('Service request not found', { serviceRequestId, employeeId: employee.user?.id });
        return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
      } else {
        const existingRequest = checkExistsResult.rows[0];
        logger.warn('Service request not assigned to employee', { 
          serviceRequestId, 
          employeeId: employee.user?.id,
          assignedTo: existingRequest.assigned_technician_id,
          assignedName: existingRequest.assigned_to,
          status: existingRequest.status
        });
        return NextResponse.json({ 
          error: `Service request is assigned to ${existingRequest.assigned_to}, not you`,
          details: {
            assigned_to: existingRequest.assigned_to,
            status: existingRequest.status
          }
        }, { status: 403 });
      }
    }

    const serviceRequest = serviceRequestResult.rows[0];

    // Get work records (handle case where table doesn't exist yet)
    let workRecordsResult;
    try {
      workRecordsResult = await query(`
        SELECT 
          wr.*,
          CASE 
            WHEN wr.performed_by_type = 'owner' THEN 'Owner'
            WHEN wr.performed_by_type = 'employee' THEN e.first_name || ' ' || e.last_name
            ELSE wr.performed_by
          END as performed_by_name
        FROM service_request_work_records wr
        LEFT JOIN employees e ON wr.performed_by = e.id::text AND wr.performed_by_type = 'employee'
        WHERE wr.service_request_id = $1
        ORDER BY wr.created_at DESC
      `, [serviceRequestId]);
    } catch (error) {
      logger.warn('Work records table not found, returning empty array', { serviceRequestId });
      workRecordsResult = { rows: [] };
    }

    // Get activities (handle case where table doesn't exist yet)
    let activitiesResult;
    try {
      activitiesResult = await query(`
        SELECT 
          sa.*,
          CASE 
            WHEN sa.performed_by_type = 'owner' THEN 'Owner'
            WHEN sa.performed_by_type = 'employee' THEN e.first_name || ' ' || e.last_name
            WHEN sa.performed_by_type = 'system' THEN 'System'
            ELSE sa.performed_by
          END as performed_by_name
        FROM service_request_activities sa
        LEFT JOIN employees e ON sa.performed_by = e.id::text AND sa.performed_by_type = 'employee'
        WHERE sa.service_request_id = $1
        ORDER BY sa.created_at DESC
      `, [serviceRequestId]);
    } catch (error) {
      logger.warn('Activities table not found, returning empty array', { serviceRequestId });
      activitiesResult = { rows: [] };
    }

    // Format service request data
    const formattedServiceRequest = {
      id: serviceRequest.id,
      customerName: serviceRequest.customer_name,
      customerEmail: serviceRequest.customer_email,
      customerPhone: serviceRequest.customer_phone,
      customerAddress: serviceRequest.customer_address,
      equipmentName: serviceRequest.equipment_name,
      requestType: serviceRequest.request_type,
      urgencyLevel: serviceRequest.urgency_level,
      title: serviceRequest.title,
      description: serviceRequest.description,
      symptoms: serviceRequest.symptoms || [],
      customerPhotos: serviceRequest.customer_photos || [],
      status: serviceRequest.status,
      relatedJobId: serviceRequest.related_job_id,
      resolutionNotes: serviceRequest.resolution_notes,
      customerSatisfactionRating: serviceRequest.customer_satisfaction_rating,
      resolvedAt: serviceRequest.resolved_at,
      createdAt: serviceRequest.created_at,
      updatedAt: serviceRequest.updated_at,
      daysPending: serviceRequest.days_pending
    };

    // Format work records
    const workRecords = workRecordsResult.rows.map((record: any) => ({
      id: record.id,
      serviceRequestId: record.service_request_id,
      performedBy: record.performed_by_name,
      performedByType: record.performed_by_type,
      workType: record.work_type,
      description: record.description,
      materials: record.materials || [],
      timeSpent: record.time_spent,
      photos: record.photos || [],
      createdAt: record.created_at
    }));

    // Format activities
    const activities = activitiesResult.rows.map((activity: any) => ({
      id: activity.id,
      serviceRequestId: activity.service_request_id,
      activityType: activity.activity_type,
      description: activity.description,
      performedBy: activity.performed_by_name,
      performedByType: activity.performed_by_type,
      photos: activity.photos || [],
      createdAt: activity.created_at
    }));

    return NextResponse.json({
      serviceRequest: formattedServiceRequest,
      workRecords,
      activities
    });

  } catch (error) {
    logger.error('Get employee service request details error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch service request details' },
      { status: 500 }
    );
  }
}