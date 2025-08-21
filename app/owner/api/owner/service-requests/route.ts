import { NextRequest, NextResponse } from 'next/server';
import OwnerAuthService from '@/lib/supabase/server-owner';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const urgency = searchParams.get('urgency') || 'all';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for service requests
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    // Always exclude resolved requests from the main list unless specifically requested
    if (status !== 'resolved') {
      whereClause += ` AND sr.status != 'resolved'`;
    }

    if (status !== 'all' && status !== 'resolved') {
      whereClause += ` AND sr.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    if (urgency !== 'all') {
      whereClause += ` AND sr.urgency_level = $${queryParams.length + 1}`;
      queryParams.push(urgency);
    }

    if (search) {
      whereClause += ` AND (c.first_name ILIKE $${queryParams.length + 1} OR c.last_name ILIKE $${queryParams.length + 1} OR sr.title ILIKE $${queryParams.length + 1} OR sr.description ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }

    // Get service requests with customer details
    queryParams.push(limit, offset);
    const serviceRequestsResult = await query(`
      SELECT 
        sr.id,
        sr.customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        sr.equipment_id,
        ce.brand || ' ' || ce.model as equipment_name,
        sr.request_type,
        sr.urgency_level,
        sr.title,
        sr.description,
        sr.symptoms,
        sr.customer_photos,
        sr.voice_memo_path,
        sr.status,
        sr.assigned_technician_id,
        e.first_name || ' ' || e.last_name as technician_name,
        sr.related_job_id,
        j.status as job_status,
        sr.resolution_notes,
        sr.customer_satisfaction_rating,
        sr.resolved_at,
        sr.created_at,
        sr.updated_at,
        COUNT(*) OVER() as total_count,
        -- Calculate days since created
        EXTRACT(DAY FROM CURRENT_TIMESTAMP - sr.created_at)::INTEGER as days_pending,
        -- Count unread messages
        COUNT(cc.id) FILTER (WHERE cc.read_by_technician = false AND cc.sender_type = 'customer') as unread_messages
      FROM service_requests sr
      JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN customer_equipment ce ON sr.equipment_id = ce.id
      LEFT JOIN employees e ON sr.assigned_technician_id = e.id
      LEFT JOIN jobs j ON sr.related_job_id = j.id
      LEFT JOIN customer_communications cc ON sr.id = cc.service_request_id
      ${whereClause}
      GROUP BY sr.id, c.first_name, c.last_name, c.email, c.phone, c.address, 
               ce.brand, ce.model, e.first_name, e.last_name, j.status
      ORDER BY 
        CASE sr.urgency_level 
          WHEN 'emergency' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        sr.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    // Get service request statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_requests,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged_requests,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requests,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_requests,
        COUNT(CASE WHEN urgency_level = 'emergency' THEN 1 END) as emergency_requests,
        COUNT(CASE WHEN urgency_level = 'high' THEN 1 END) as high_priority_requests,
        COUNT(CASE WHEN related_job_id IS NULL AND status IN ('submitted', 'acknowledged') THEN 1 END) as pending_conversion,
        COUNT(CASE WHEN assigned_technician_id IS NULL AND status NOT IN ('resolved', 'closed') THEN 1 END) as unassigned_requests,
        AVG(EXTRACT(DAY FROM CASE WHEN resolved_at IS NOT NULL THEN resolved_at - created_at END))::INTEGER as avg_resolution_days
      FROM service_requests sr
      WHERE sr.created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    // Get recent activity
    const recentActivityResult = await query(`
      SELECT 
        sr.id,
        sr.title,
        c.first_name || ' ' || c.last_name as customer_name,
        sr.status,
        sr.urgency_level,
        sr.created_at,
        sr.updated_at,
        'service_request' as activity_type
      FROM service_requests sr
      JOIN customers c ON sr.customer_id = c.id
      WHERE sr.updated_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY sr.updated_at DESC
      LIMIT 10
    `);

    // Format service requests data
    const serviceRequests = serviceRequestsResult.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      customerAddress: row.customer_address,
      equipmentId: row.equipment_id,
      equipmentName: row.equipment_name,
      requestType: row.request_type,
      urgencyLevel: row.urgency_level,
      title: row.title,
      description: row.description,
      symptoms: row.symptoms || [],
      customerPhotos: row.customer_photos || [],
      voiceMemoPath: row.voice_memo_path,
      status: row.status,
      assignedTechnicianId: row.assigned_technician_id,
      technicianName: row.technician_name,
      relatedJobId: row.related_job_id,
      jobStatus: row.job_status,
      resolutionNotes: row.resolution_notes,
      customerSatisfactionRating: row.customer_satisfaction_rating,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      daysPending: row.days_pending,
      unreadMessages: parseInt(row.unread_messages) || 0
    }));

    // Format statistics
    const stats = statsResult.rows[0];
    const statistics = {
      totalRequests: parseInt(stats.total_requests) || 0,
      submittedRequests: parseInt(stats.submitted_requests) || 0,
      acknowledgedRequests: parseInt(stats.acknowledged_requests) || 0,
      inProgressRequests: parseInt(stats.in_progress_requests) || 0,
      resolvedRequests: parseInt(stats.resolved_requests) || 0,
      emergencyRequests: parseInt(stats.emergency_requests) || 0,
      highPriorityRequests: parseInt(stats.high_priority_requests) || 0,
      pendingConversion: parseInt(stats.pending_conversion) || 0,
      unassignedRequests: parseInt(stats.unassigned_requests) || 0,
      averageResolutionDays: parseInt(stats.avg_resolution_days) || 0
    };

    // Format recent activity
    const recentActivity = recentActivityResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      customerName: row.customer_name,
      status: row.status,
      urgencyLevel: row.urgency_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      activityType: row.activity_type
    }));

    return NextResponse.json({
      serviceRequests,
      statistics,
      recentActivity,
      totalCount: serviceRequestsResult.rows.length > 0 ? parseInt(serviceRequestsResult.rows[0].total_count) : 0,
      pagination: {
        limit,
        offset,
        hasMore: serviceRequestsResult.rows.length === limit
      }
    });

  } catch (error) {
    logger.error('Get service requests error', error);
    return NextResponse.json(
      { error: 'Failed to fetch service requests' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const { serviceRequestId, action, ...updateData } = await request.json();

    if (!serviceRequestId || !action) {
      return NextResponse.json(
        { error: 'Service request ID and action are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'assign_technician':
        if (!updateData.technicianId) {
          return NextResponse.json(
            { error: 'Technician ID is required for assignment' },
            { status: 400 }
          );
        }

        result = await query(`
          UPDATE service_requests 
          SET assigned_technician_id = $1, 
              status = CASE WHEN status = 'submitted' THEN 'acknowledged' ELSE status END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, title, status, assigned_technician_id
        `, [updateData.technicianId, serviceRequestId]);
        break;

      case 'reassign_technician':
        if (!updateData.newTechnicianId) {
          return NextResponse.json(
            { error: 'New technician ID is required for reassignment' },
            { status: 400 }
          );
        }

        // Get current service request info
        const currentServiceRequestResult = await query(`
          SELECT 
            sr.*,
            e.first_name || ' ' || e.last_name as current_technician_name,
            c.first_name || ' ' || c.last_name as customer_name
          FROM service_requests sr
          LEFT JOIN employees e ON sr.assigned_technician_id = e.id
          LEFT JOIN customers c ON sr.customer_id = c.id
          WHERE sr.id = $1
        `, [serviceRequestId]);

        if (currentServiceRequestResult.rows.length === 0) {
          return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
        }

        const serviceRequest = currentServiceRequestResult.rows[0];

        // Get new technician info
        const newTechnicianResult = await query(`
          SELECT id, first_name, last_name, role FROM employees WHERE id = $1 AND active = true
        `, [updateData.newTechnicianId]);

        if (newTechnicianResult.rows.length === 0) {
          return NextResponse.json({ error: 'New technician not found or inactive' }, { status: 404 });
        }

        const newTechnician = newTechnicianResult.rows[0];

        // Update service request assignment
        result = await query(`
          UPDATE service_requests 
          SET assigned_technician_id = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, title, status, assigned_technician_id
        `, [updateData.newTechnicianId, serviceRequestId]);

        // Log reassignment activity
        const reassignmentDescription = serviceRequest.assigned_technician_id 
          ? `Service request reassigned from ${serviceRequest.current_technician_name} to ${newTechnician.first_name} ${newTechnician.last_name}${updateData.reason ? ` - Reason: ${updateData.reason}` : ''}`
          : `Service request assigned to ${newTechnician.first_name} ${newTechnician.last_name}`;

        await query(`
          INSERT INTO business_activities (type, description, related_id, related_type, created_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `, ['service_request_reassigned', reassignmentDescription, serviceRequestId, 'service_request']);

        // Create communication record for reassignment
        await query(`
          INSERT INTO customer_communications (
            service_request_id, sender_type, sender_id, message_type, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
          serviceRequestId,
          'system',
          owner.id,
          'reassignment',
          `Service request has been ${serviceRequest.assigned_technician_id ? 'reassigned' : 'assigned'} to ${newTechnician.first_name} ${newTechnician.last_name}${updateData.reason ? ` - ${updateData.reason}` : ''}`
        ]);

        logger.info('Service request reassigned', {
          serviceRequestId,
          fromTechnician: serviceRequest.assigned_technician_id,
          toTechnician: updateData.newTechnicianId,
          reason: updateData.reason,
          reassignedBy: owner.id
        });

        return NextResponse.json({
          success: true,
          message: `Service request successfully ${serviceRequest.assigned_technician_id ? 'reassigned' : 'assigned'} to ${newTechnician.first_name} ${newTechnician.last_name}`,
          assignment: {
            serviceRequestId,
            technicianId: updateData.newTechnicianId,
            technicianName: `${newTechnician.first_name} ${newTechnician.last_name}`,
            technicianRole: newTechnician.role,
            assignedAt: new Date().toISOString()
          }
        });

      case 'unassign_technician':
        // Get current service request info
        const currentSRResult = await query(`
          SELECT 
            sr.*,
            e.first_name || ' ' || e.last_name as current_technician_name
          FROM service_requests sr
          LEFT JOIN employees e ON sr.assigned_technician_id = e.id
          WHERE sr.id = $1
        `, [serviceRequestId]);

        if (currentSRResult.rows.length === 0) {
          return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
        }

        const currentSR = currentSRResult.rows[0];

        if (!currentSR.assigned_technician_id) {
          return NextResponse.json({ error: 'Service request is not currently assigned' }, { status: 400 });
        }

        // Remove assignment
        result = await query(`
          UPDATE service_requests 
          SET assigned_technician_id = NULL,
              status = CASE WHEN status = 'in_progress' THEN 'acknowledged' ELSE status END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id, title, status, assigned_technician_id
        `, [serviceRequestId]);

        // Log unassignment activity
        await query(`
          INSERT INTO business_activities (type, description, related_id, related_type, created_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `, [
          'service_request_unassigned',
          `Service request unassigned from ${currentSR.current_technician_name}${updateData.reason ? ` - Reason: ${updateData.reason}` : ''}`,
          serviceRequestId,
          'service_request'
        ]);

        // Create communication record
        await query(`
          INSERT INTO customer_communications (
            service_request_id, sender_type, sender_id, message_type, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
          serviceRequestId,
          'system',
          owner.id,
          'unassignment',
          `Service request has been unassigned${updateData.reason ? ` - ${updateData.reason}` : ''}`
        ]);

        logger.info('Service request unassigned', {
          serviceRequestId,
          fromTechnician: currentSR.assigned_technician_id,
          reason: updateData.reason,
          unassignedBy: owner.id
        });

        return NextResponse.json({
          success: true,
          message: `Service request successfully unassigned from ${currentSR.current_technician_name}`
        });
        break;

      case 'update_status':
        if (!updateData.status) {
          return NextResponse.json(
            { error: 'Status is required for status update' },
            { status: 400 }
          );
        }

        result = await query(`
          UPDATE service_requests 
          SET status = $1, 
              updated_at = CURRENT_TIMESTAMP,
              resolved_at = CASE WHEN $1 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
          WHERE id = $2
          RETURNING id, title, status
        `, [updateData.status, serviceRequestId]);
        break;

      case 'add_notes':
        if (!updateData.notes) {
          return NextResponse.json(
            { error: 'Notes are required' },
            { status: 400 }
          );
        }

        result = await query(`
          UPDATE service_requests 
          SET resolution_notes = $1, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, title, resolution_notes
        `, [updateData.notes, serviceRequestId]);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    // Log the activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [
      `service_request_${action}`,
      `Service request "${result.rows[0].title}" ${action.replace('_', ' ')}`,
      serviceRequestId,
      'service_request'
    ]);

    logger.info('Service request updated', {
      serviceRequestId,
      action,
      updatedBy: owner.id
    });

    return NextResponse.json({
      success: true,
      serviceRequest: result.rows[0],
      message: `Service request ${action.replace('_', ' ')} successful`
    });

  } catch (error) {
    logger.error('Update service request error', error);
    return NextResponse.json(
      { error: 'Failed to update service request' },
      { status: 500 }
    );
  }
}