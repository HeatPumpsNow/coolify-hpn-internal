import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getInternalUserWithRoles } from '@/lib/supabase/client';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentials: LoginCredentials = body;

    // Validate input
    if (!credentials.email || !credentials.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate with Supabase
    const supabase = createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get internal user with roles
    const internalUser = await getInternalUserWithRoles(authData.user.id);
    
    if (!internalUser) {
      return NextResponse.json(
        { error: 'User not found in internal system' },
        { status: 401 }
      );
    }

    // Check if user has employee role
    if (!internalUser.roles.includes('employee')) {
      return NextResponse.json(
        { error: 'Access denied - employee role required' },
        { status: 403 }
      );
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      employee: {
        id: internalUser.id,
        email: internalUser.email,
        firstName: internalUser.firstName,
        lastName: internalUser.lastName,
        roles: internalUser.roles,
      },
      token: {
        accessToken: authData.session?.access_token,
        refreshToken: authData.session?.refresh_token,
      },
      permissions: internalUser.permissions,
    });

    // Set httpOnly cookies for security
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    // Set access token cookie (shorter expiry)
    if (authData.session?.access_token) {
      response.cookies.set('auth_token', authData.session.access_token, {
        ...cookieOptions,
        maxAge: 60 * 60, // 1 hour
      });

      // Set additional non-HttpOnly cookie for JavaScript access (cross-portal authentication)
      response.cookies.set('auth_token_js', authData.session.access_token, {
        httpOnly: false, // JavaScript can access this one
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 60 * 60, // 1 hour
      });
    }

    // Set refresh token cookie (longer expiry, only if remember me is enabled)
    if (authData.session?.refresh_token) {
      if (credentials.rememberMe) {
        response.cookies.set('refresh_token', authData.session.refresh_token, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
      } else {
        response.cookies.set('refresh_token', authData.session.refresh_token, {
          ...cookieOptions,
          maxAge: 60 * 60, // 1 hour for session-only login
        });
      }
    }

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    const statusCode = errorMessage.includes('Invalid') ? 401 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}