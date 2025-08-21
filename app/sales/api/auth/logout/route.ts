import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { user, error, status } = await requireAuth(['sales']);

    if (error || !user) {
      return NextResponse.json({ error }, { status: status || 401 });
    }

    // Sign out from Supabase
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' }
    });

    // Clear all possible cookie variations
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0, // Expire immediately
    };

    response.cookies.set('auth-token', '', cookieOptions);
    response.cookies.set('auth_token', '', cookieOptions);
    response.cookies.set('refresh-token', '', cookieOptions);
    response.cookies.set('refresh_token', '', cookieOptions);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even if logging fails
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' }
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0,
    };

    response.cookies.set('auth-token', '', cookieOptions);
    response.cookies.set('auth_token', '', cookieOptions);
    response.cookies.set('refresh-token', '', cookieOptions);
    response.cookies.set('refresh_token', '', cookieOptions);

    return response;
  }
}
