import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/supabase/server';
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

    // Get photos for this employee
    const result = await query(
      `SELECT 
        ep.id,
        ep.category,
        ep.file_path,
        ep.thumbnail_path,
        ep.original_filename,
        ep.file_size,
        ep.metadata,
        ep.uploaded_at,
        j.customer_name,
        j.scheduled_date,
        j.address
       FROM employee_photos ep
       INNER JOIN jobs j ON ep.job_id = j.id
       WHERE ep.employee_id = $1
       ORDER BY ep.uploaded_at DESC`,
      [employee.id]
    );

    const photos = result.rows.map((row: any) => ({
      id: row.id,
      category: row.category,
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path,
      originalFilename: row.original_filename,
      fileSize: row.file_size,
      metadata: row.metadata,
      uploadedAt: row.uploaded_at,
      job: {
        customerName: row.customer_name,
        scheduledDate: row.scheduled_date,
        address: row.address
      }
    }));

    return NextResponse.json({
      success: true,
      photos
    });

  } catch (error) {
    console.error('Fetch photos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}