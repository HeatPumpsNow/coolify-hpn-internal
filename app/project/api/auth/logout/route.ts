import { NextRequest, NextResponse } from 'next/server';
import { ProjectAuthService } from '@/lib/supabase/server-refactored';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      // Extract user ID from token for logging
      const { authService } = await import('@heat-pumps-now/auth');
      const user = authService.extractUserFromToken(token);
      
      if (user) {
        await ProjectAuthService.logout(user.id);
      }
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
