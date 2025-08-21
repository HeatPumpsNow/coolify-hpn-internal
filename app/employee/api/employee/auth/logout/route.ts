import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { user, error, status } = await requireAuth(['employee']);

    if (error || !user) {
      return NextResponse.json({ error }, { status: status || 401 });
    }

    // Get device ID from request body (optional)
    const body = await request.json().catch(() => ({}));
    const deviceId = body.deviceId;

    // Sign out from Supabase
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear auth cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0, // Expire immediately
    };

    response.cookies.set('auth_token', '', cookieOptions);
    response.cookies.set('auth_token_js', '', { ...cookieOptions, httpOnly: false });
    response.cookies.set('refresh_token', '', cookieOptions);

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if logout fails on the server, clear client cookies
    const response = NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0,
    };

    response.cookies.set('auth_token', '', cookieOptions);
    response.cookies.set('auth_token_js', '', { ...cookieOptions, httpOnly: false });
    response.cookies.set('refresh_token', '', cookieOptions);

    return response;
  }
}