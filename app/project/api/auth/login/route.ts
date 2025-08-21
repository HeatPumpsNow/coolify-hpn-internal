import { NextRequest, NextResponse } from 'next/server';
import { ProjectAuthService, ApiError } from '@/lib/auth-refactored';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Email and password are required' 
          } 
        },
        { status: 400 }
      );
    }

    const result = await ProjectAuthService.authenticate({ email, password });

    // Set HTTP-only cookies for tokens
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken, // Include token for client-side API calls
        expiresIn: result.tokens.expiresIn
      }
    });

    // Set access token cookie with enhanced security
    response.cookies.set('auth-token', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.tokens.expiresIn,
      path: '/'
    });

    // Set refresh token cookie with enhanced security
    response.cookies.set('refresh-token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
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

    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      },
      { status: 500 }
    );
  }
}