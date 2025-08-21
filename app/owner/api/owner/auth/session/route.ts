import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, error, status } = await requireAuth(['owner']);

    if (error || !user) {
      return NextResponse.json({ error }, { status: status || 401 });
    }

    return NextResponse.json({
      success: true,
      user: {  // Use 'user' to match shared auth system expectations
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.roles[0], // Primary role
        roles: user.roles
      }
    });

  } catch (error) {
    console.error('Session validation error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}