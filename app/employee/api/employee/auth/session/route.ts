import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, error, status } = await requireAuth(['employee']);

    if (error || !user) {
      return NextResponse.json(
        { error },
        { status: status || 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
      permissions: user.permissions,
    });

  } catch (error) {
    console.error('Session validation error:', error);
    
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
  }
}