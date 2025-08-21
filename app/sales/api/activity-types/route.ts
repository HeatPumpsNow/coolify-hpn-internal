import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const activityTypesQuery = `
      SELECT id, name, description, icon, color, requires_outcome
      FROM activity_types
      ORDER BY name
    `;

    const result = await query(activityTypesQuery);

    return NextResponse.json({
      success: true,
      data: {
        activity_types: result.rows,
      },
    });
  } catch (error) {
    console.error('Activity types fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}