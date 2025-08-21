import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/auth.service';

/**
 * Universal authentication handler for all portals
 * Each portal can use this handler in their API routes
 */
export async function handleLogin(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
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

    // Authenticate user
    const result = await AuthService.authenticate({ email, password });

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    // Create response with JWT token in cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });

    // Set HTTP-only cookie for token
    if (result.token) {
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60, // 8 hours
        path: '/'
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}

export async function handleLogout(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  // Clear auth cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });

  return response;
}

export async function handleVerify(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_TOKEN',
            message: 'No authentication token found'
          }
        },
        { status: 401 }
      );
    }

    const decoded = await AuthService.verifyToken(token);

    return NextResponse.json({
      success: true,
      data: {
        user: decoded
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      },
      { status: 401 }
    );
  }
}