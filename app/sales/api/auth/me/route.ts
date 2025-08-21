import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, error, status } = await requireAuth(['sales', 'owner']);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error || 'Authentication required' } },
        { status: status || 401 }
      );
    }

    // Return user profile using the data from requireAuth
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.roles[0], // Primary role
        roles: user.roles,
        territory: user.territory || [],
        commissionRate: user.commission_rate,
        hireDate: user.hire_date,
        active: user.active,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}