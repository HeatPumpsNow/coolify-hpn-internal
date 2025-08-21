import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const tokenCookie = request.cookies.get('auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await AuthService.validateSession(tokenCookie.value);
    if (!employee) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for service requests assigned to this employee
    let whereClause = 'WHERE sr.assigned_technician_id = $1';
    const queryParams: any[] = [employee.id];

    if (status !== 'all') {
      whereClause += ` AND sr.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }


    // Get service requests assigned to this employee
    queryParams.push(limit, offset);
    const result = await query(`
      SELECT 
        sr.id,
        sr.customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address || CASE 
          WHEN c.city IS NOT NULL THEN ', ' || c.city || ', ' || c.state
          ELSE ''
        END as customer_address,
        sr.equipment_id,
        ce.equipment_type,
        ce.brand || ' ' || ce.model as equipment_name,
        ce.location_description,
        sr.request_type,
        sr.urgency_level,
        sr.title,
        sr.description,
        sr.symptoms,
        sr.customer_photos,
        sr.voice_memo_path,
        sr.status,
        sr.related_job_id,
        j.status as job_status,
        j.scheduled_date as job_scheduled_date,
        sr.resolution_notes,
        sr.customer_satisfaction_rating,
        sr.resolved_at,
        sr.created_at,
        sr.updated_at,
        COUNT(*) OVER() as total_count,
        -- Count unread messages from customer
        COUNT(cc.id) FILTER (WHERE cc.read_by_technician = false AND cc.sender_type = 'customer') as unread_messages,
        -- Get latest message preview
        (SELECT cc.message 
         FROM customer_communications cc 
         WHERE cc.service_request_id = sr.id 
           AND cc.is_internal_note = false
         ORDER BY cc.created_at DESC 
         LIMIT 1) as latest_message,
        (SELECT cc.created_at 
         FROM customer_communications cc 
         WHERE cc.service_request_id = sr.id 
           AND cc.is_internal_note = false
         ORDER BY cc.created_at DESC 
         LIMIT 1) as latest_message_time
      FROM service_requests sr
      JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN customer_equipment ce ON sr.equipment_id = ce.id
      LEFT JOIN jobs j ON sr.related_job_id = j.id
      LEFT JOIN customer_communications cc ON sr.id = cc.service_request_id
      ${whereClause}
      GROUP BY sr.id, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.state,
               ce.equipment_type, ce.brand, ce.model, ce.location_description, j.status, j.scheduled_date
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

    // Format service requests
    const serviceRequests = result.rows.map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      customerAddress: row.customer_address,
      equipmentId: row.equipment_id,
      equipmentType: row.equipment_type,
      equipmentName: row.equipment_name,
      equipmentLocation: row.location_description,
      requestType: row.request_type,
      urgencyLevel: row.urgency_level,
      title: row.title,
      description: row.description,
      symptoms: row.symptoms || [],
      customerPhotos: row.customer_photos || [],
      voiceMemoPath: row.voice_memo_path,
      status: row.status,
      relatedJobId: row.related_job_id,
      jobStatus: row.job_status,
      jobScheduledDate: row.job_scheduled_date,
      resolutionNotes: row.resolution_notes,
      customerSatisfactionRating: row.customer_satisfaction_rating,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      unreadMessages: parseInt(row.unread_messages) || 0,
      latestMessage: row.latest_message,
      latestMessageTime: row.latest_message_time
    }));


    return NextResponse.json({
      success: true,
      serviceRequests,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      pagination: {
        limit,
        offset,
        hasMore: result.rows.length === limit
      }
    });

  } catch (error) {
    console.error('Fetch service requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service requests' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const tokenCookie = request.cookies.get('auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await AuthService.validateSession(tokenCookie.value);
    if (!employee) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { serviceRequestId, action, ...updateData } = await request.json();

    if (!serviceRequestId || !action) {
      return NextResponse.json(
        { error: 'Service request ID and action are required' },
        { status: 400 }
      );
    }

    // Verify the service request is assigned to this employee
    const assignmentCheck = await query(`
      SELECT id, title, status, assigned_technician_id
      FROM service_requests 
      WHERE id = $1 AND assigned_technician_id = $2
    `, [serviceRequestId, employee.id]);

    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found or not assigned to you' },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
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
          WHERE id = $2 AND assigned_technician_id = $3
          RETURNING id, title, status
        `, [updateData.status, serviceRequestId, employee.id]);
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
          WHERE id = $2 AND assigned_technician_id = $3
          RETURNING id, title, resolution_notes
        `, [updateData.notes, serviceRequestId, employee.id]);
        break;

      case 'acknowledge':
        result = await query(`
          UPDATE service_requests 
          SET status = 'acknowledged', 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND assigned_technician_id = $2 AND status = 'submitted'
          RETURNING id, title, status
        `, [serviceRequestId, employee.id]);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found or no changes made' },
        { status: 404 }
      );
    }

    // Create a system communication about the update
    if (action === 'update_status' && updateData.status) {
      const statusMessages = {
        'acknowledged': 'Your service request has been acknowledged by our technician.',
        'in_progress': 'Work has started on your service request.',
        'resolved': 'Your service request has been resolved. Please let us know if you need anything else.'
      };

      const message = statusMessages[updateData.status as keyof typeof statusMessages];
      
      if (message) {
        await query(`
          INSERT INTO customer_communications (
            customer_id,
            employee_id,
            service_request_id,
            thread_id,
            message_type,
            sender_type,
            message,
            read_by_customer,
            read_by_technician
          )
          SELECT 
            sr.customer_id,
            $1,
            sr.id,
            COALESCE(
              (SELECT thread_id FROM customer_communications WHERE service_request_id = sr.id LIMIT 1),
              uuid_generate_v4()
            ),
            'status_update',
            'technician',
            $2,
            false,
            true
          FROM service_requests sr
          WHERE sr.id = $3
        `, [employee.id, message, serviceRequestId]);
      }
    }

    console.log('Service request updated by employee', {
      serviceRequestId,
      action,
      employeeId: employee.id
    });

    return NextResponse.json({
      success: true,
      serviceRequest: result.rows[0],
      message: `Service request ${action.replace('_', ' ')} successful`
    });

  } catch (error) {
    console.error('Update service request error:', error);
    return NextResponse.json(
      { error: 'Failed to update service request' },
      { status: 500 }
    );
  }
}