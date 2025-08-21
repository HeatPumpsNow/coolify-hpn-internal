import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { generateOwnerToken } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query for owner in the shared database
    const result = await pool.query(
      'SELECT * FROM owners WHERE email = $1 AND status = $2',
      [email.toLowerCase(), 'active']
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const ownerData = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, ownerData.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create owner object
    const owner = {
      id: ownerData.id,
      email: ownerData.email,
      firstName: ownerData.first_name,
      lastName: ownerData.last_name,
      role: ownerData.role
    };

    // Generate JWT token
    const token = generateOwnerToken(owner);

    console.log('Owner login successful', { ownerId: owner.id, email: owner.email });

    // Create response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: owner  // Use 'user' to match shared auth system expectations
    });

    // Set secure HTTP-only cookie
    response.cookies.set('owner_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Set additional non-HttpOnly cookie for JavaScript access (cross-portal authentication)
    response.cookies.set('owner_token_js', token, {
      httpOnly: false, // JavaScript can access this one
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Owner login error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}