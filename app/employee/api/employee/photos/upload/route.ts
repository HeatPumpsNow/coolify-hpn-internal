import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import AuthService from '@/lib/auth';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const jobId = formData.get('jobId') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    if (!file || !jobId || !category) {
      return NextResponse.json(
        { error: 'File, job ID, and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['before', 'during', 'after', 'problem', 'detail'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Verify job assignment
    const jobCheck = await query(
      `SELECT j.id FROM jobs j 
       INNER JOIN job_assignments ja ON j.id = ja.job_id 
       WHERE j.id = $1 AND ja.employee_id = $2`,
      [jobId, employee.id]
    );

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found or not assigned to you' },
        { status: 403 }
      );
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'storage', 'photos', 'jobs');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomId}.${fileExtension}`;
    const filePath = `/storage/photos/jobs/${filename}`;
    const absolutePath = join(uploadDir, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    // Save to database
    const result = await query(
      `INSERT INTO employee_photos 
       (employee_id, job_id, category, file_path, original_filename, file_size, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, uploaded_at`,
      [
        employee.id,
        jobId,
        category,
        filePath,
        file.name,
        file.size,
        JSON.stringify({ description: description || null })
      ]
    );

    const photo = result.rows[0];

    // Award points for photo upload
    await query(
      `INSERT INTO skill_points 
       (employee_id, category, points, source_type, source_id, notes)
       VALUES ($1, 'photography', 10, 'photo_upload', $2, $3)`,
      [
        employee.id,
        photo.id,
        `Photo uploaded: ${category} - ${file.name}`
      ]
    );

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        filePath,
        category,
        originalFilename: file.name,
        uploadedAt: photo.uploaded_at
      },
      pointsAwarded: 10
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}