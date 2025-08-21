import { NextRequest, NextResponse } from 'next/server';
import { ProjectAuthService } from '@/lib/supabase/server-refactored';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      // Clear session - simplified logout without external dependencies
      console.log('Clearing auth session');
    }

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' }
    });

    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even if logging fails
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' }
    });

    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');

    return response;
  }
}
