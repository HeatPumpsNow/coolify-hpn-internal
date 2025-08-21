import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Logout request received');

    // In a real implementation, you might want to:
    // 1. Invalidate the session in the database
    // 2. Add the token to a blacklist
    // 3. Log the logout event
    
    // For now, we'll just clear the cookies
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' }
    });

    // Clear authentication cookies
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    
    // Also set them to empty with maxAge 0 for extra safety
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });

    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });

    console.log('[API] Logout successful');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even if other operations fail
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out (with errors)' }
    });

    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');

    return response;
  }
}