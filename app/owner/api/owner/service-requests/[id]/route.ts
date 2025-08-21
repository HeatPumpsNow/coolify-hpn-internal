import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { verifyOwnerToken } = await import('@/lib/supabase/server');
    const owner = await verifyOwnerToken(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const serviceRequestId = params.id;

    // Get service request details
    const serviceRequestResult = await query(`
      SELECT 
        sr.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        ce.brand || ' ' || ce.model as equipment_name,
        e.first_name || ' ' || e.last_name as technician_name,
        EXTRACT(DAY FROM CURRENT_TIMESTAMP - sr.created_at)::INTEGER as days_pending
      FROM service_requests sr
      JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN customer_equipment ce ON sr.equipment_id = ce.id
      LEFT JOIN employees e ON sr.assigned_technician_id = e.id
      WHERE sr.id = $1
    `, [serviceRequestId]);

    if (serviceRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    const serviceRequest = serviceRequestResult.rows[0];

    // Get work records
    const workRecordsResult = await query(`
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

    // Get activities
    const activitiesResult = await query(`
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
      assignedTechnicianId: serviceRequest.assigned_technician_id,
      technicianName: serviceRequest.technician_name,
      relatedJobId: serviceRequest.related_job_id,
      resolutionNotes: serviceRequest.resolution_notes,
      customerSatisfactionRating: serviceRequest.customer_satisfaction_rating,
      resolvedAt: serviceRequest.resolved_at,
      createdAt: serviceRequest.created_at,
      updatedAt: serviceRequest.updated_at,
      daysPending: serviceRequest.days_pending
    };

    // Format work records
    const workRecords = workRecordsResult.rows.map(record => ({
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
    const activities = activitiesResult.rows.map(activity => ({
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
    logger.error('Get service request details error', error);
    return NextResponse.json(
      { error: 'Failed to fetch service request details' },
      { status: 500 }
    );
  }
}