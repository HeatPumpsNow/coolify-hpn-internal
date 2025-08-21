import { NextRequest, NextResponse } from 'next/server';
import { EmployeeAuthService, ApiError } from '@/lib/supabase/server-refactored';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'Refresh token not found'
          }
        },
        { status: 401 }
      );
    }

    const tokens = await EmployeeAuthService.refreshTokens(refreshToken);

    // Set new cookies
    const response = NextResponse.json({
      success: true,
      data: {
        expiresIn: tokens.expiresIn
      }
    });

    // Update access token cookie
    response.cookies.set('auth-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiresIn
    });

    // Update refresh token cookie
    response.cookies.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: error.statusCode }
      );
    }

    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refresh token'
        }
      },
      { status: 500 }
    );
  }
}