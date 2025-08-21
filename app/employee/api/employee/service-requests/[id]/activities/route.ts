import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
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

    // Verify service request exists and is assigned to this employee
    const serviceRequestResult = await query(`
      SELECT id FROM service_requests WHERE id = $1 AND assigned_technician_id = $2
    `, [serviceRequestId, employee.id]);

    if (serviceRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Service request not found or not assigned to you' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const description = formData.get('description') as string;

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Handle photo uploads
    const photos = formData.getAll('photos') as File[];
    const photoUrls: string[] = [];

    if (photos.length > 0) {
      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'activities');
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        // Directory already exists, ignore error
      }

      for (const photo of photos) {
        if (photo.size > 0) {
          const buffer = Buffer.from(await photo.arrayBuffer());
          const filename = `${uuidv4()}-${photo.name}`;
          const filepath = join(uploadDir, filename);
          
          await writeFile(filepath, buffer);
          photoUrls.push(`/uploads/activities/${filename}`);
        }
      }
    }

    // Insert activity record
    const activityResult = await query(`
      INSERT INTO service_request_activities (
        service_request_id, activity_type, description, performed_by, 
        performed_by_type, photos, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `, [
      serviceRequestId,
      'update',
      description,
      employee.id,
      'employee',
      JSON.stringify(photoUrls)
    ]);

    // Update service request timestamp
    await query(`
      UPDATE service_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [serviceRequestId]);

    // Create customer communication for transparency
    await query(`
      INSERT INTO customer_communications (
        service_request_id, sender_type, sender_id, message_type, message, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      serviceRequestId,
      'employee',
      employee.id,
      'update',
      `Technician update: ${description}`
    ]);

    logger.info('Employee activity added', {
      serviceRequestId,
      activityId: activityResult.rows[0].id,
      performedBy: employee.id
    });

    return NextResponse.json({
      success: true,
      activity: {
        id: activityResult.rows[0].id,
        createdAt: activityResult.rows[0].created_at
      }
    });

  } catch (error) {
    logger.error('Add employee activity error', error);
    return NextResponse.json(
      { error: 'Failed to add activity' },
      { status: 500 }
    );
  }
}