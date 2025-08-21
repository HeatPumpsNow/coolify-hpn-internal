import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import jwt, { SignOptions } from 'jsonwebtoken';

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/heatpumps',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[API] Login attempt for:', email);

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

    // Find employee from database
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await pool.query(query, [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      console.log('[API] Employee not found:', email);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        },
        { status: 401 }
      );
    }

    const employee = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, employee.password_hash);
    
    console.log('[API] Password verification for', email, '- Valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('[API] Invalid password for:', email);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        },
        { status: 401 }
      );
    }

    // Check if user has access to employee portal
    const rolesQuery = `
      SELECT role, portal 
      FROM user_roles 
      WHERE user_id = $1 
      AND (portal = 'employee' OR portal = '*')
    `;
    const rolesResult = await pool.query(rolesQuery, [employee.user?.id]);
    
    if (rolesResult.rows.length === 0) {
      console.log('[API] User has no access to employee portal:', email);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to the Employee Portal'
          }
        },
        { status: 403 }
      );
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [employee.user?.id]
    );

    // Get all user roles
    const userRoles = rolesResult.rows.map((r: any) => r.role);

    // Create user response (without password hash)
    const user = {
      id: employee.user?.id,
      email: employee.email,
      firstName: employee.first_name,
      lastName: employee.last_name,
      role: userRoles[0] || employee.role, // Primary role
      roles: userRoles, // All roles for this portal
      department: employee.department
    };

    // Generate JWT tokens
    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      JWT_SECRET,
      signOptions
    );

    const refreshSignOptions: SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN as any };
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      JWT_SECRET,
      refreshSignOptions
    );

    console.log('[API] Login successful for:', email);

    // Set HTTP-only cookies for tokens
    const response = NextResponse.json({
      success: true,
      data: {
        user,
        accessToken, // Also return in body for localStorage approach
        expiresIn: 8 * 60 * 60 // 8 hours in seconds
      }
    });

    // Set cookies (for future use)
    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 // 8 hours
    });

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
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