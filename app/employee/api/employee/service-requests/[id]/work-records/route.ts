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
    `, [serviceRequestId, employee.user?.id]);

    if (serviceRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Service request not found or not assigned to you' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const workType = formData.get('workType') as string;
    const description = formData.get('description') as string;
    const materials = formData.get('materials') as string;
    const timeSpent = formData.get('timeSpent') as string;

    if (!workType || !description) {
      return NextResponse.json({ error: 'Work type and description are required' }, { status: 400 });
    }

    // Handle photo uploads
    const photos = formData.getAll('photos') as File[];
    const photoUrls: string[] = [];

    if (photos.length > 0) {
      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'work-records');
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
          photoUrls.push(`/uploads/work-records/${filename}`);
        }
      }
    }

    // Parse materials into array
    const materialsArray = materials ? materials.split('\n').filter(m => m.trim()) : [];

    // Insert work record
    const workRecordResult = await query(`
      INSERT INTO service_request_work_records (
        service_request_id, performed_by, performed_by_type, work_type, 
        description, materials, time_spent, photos, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `, [
      serviceRequestId,
      employee.user?.id,
      'employee',
      workType,
      description,
      JSON.stringify(materialsArray),
      timeSpent ? parseFloat(timeSpent) : null,
      JSON.stringify(photoUrls)
    ]);

    // Create activity record
    await query(`
      INSERT INTO service_request_activities (
        service_request_id, activity_type, description, performed_by, 
        performed_by_type, photos, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      serviceRequestId,
      'work_record_added',
      `Work record added: ${workType} - ${description}`,
      employee.user?.id,
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
      employee.user?.id,
      'work_update',
      `Technician update: ${workType} - ${description}`
    ]);

    logger.info('Employee work record added', {
      serviceRequestId,
      workRecordId: workRecordResult.rows[0].id,
      performedBy: employee.user?.id,
      workType
    });

    return NextResponse.json({
      success: true,
      workRecord: {
        id: workRecordResult.rows[0].id,
        createdAt: workRecordResult.rows[0].created_at
      }
    });

  } catch (error) {
    logger.error('Add employee work record error', error as Error);
    return NextResponse.json(
      { error: 'Failed to add work record' },
      { status: 500 }
    );
  }
}