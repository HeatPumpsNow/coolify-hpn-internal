import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const AuthService = await import('@/lib/supabase/server');
    const employee = await AuthService.default.validateSession(tokenCookie.value);
    if (!employee) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get employee profile data
    const result = await query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone_number,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        address_street,
        address_city,
        address_state,
        address_zip_code,
        notification_preferences,
        dashboard_preferences
      FROM employees 
      WHERE id = $1
    `, [employee.user?.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const emp = result.rows[0];
    
    // Format the profile data to match the form structure
    const profile = {
      firstName: emp.first_name || '',
      lastName: emp.last_name || '',
      email: emp.email || '',
      phoneNumber: emp.phone_number || '',
      emergencyContact: {
        name: emp.emergency_contact_name || '',
        phone: emp.emergency_contact_phone || '',
        relationship: emp.emergency_contact_relationship || ''
      },
      address: {
        street: emp.address_street || '',
        city: emp.address_city || '',
        state: emp.address_state || '',
        zipCode: emp.address_zip_code || ''
      },
      preferences: {
        notifications: {
          email: emp.notification_preferences?.email ?? true,
          sms: emp.notification_preferences?.sms ?? false,
          jobUpdates: emp.notification_preferences?.jobUpdates ?? true,
          achievements: emp.notification_preferences?.achievements ?? true
        },
        dashboard: {
          showEarnings: emp.dashboard_preferences?.showEarnings ?? true,
          showStats: emp.dashboard_preferences?.showStats ?? true
        }
      }
    };

    return NextResponse.json({ success: true, profile });

  } catch (error) {
    console.error('Get employee profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const AuthService = await import('@/lib/supabase/server');
    const employee = await AuthService.default.validateSession(tokenCookie.value);
    if (!employee) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const profileData = await request.json();

    // Update employee profile
    await query(`
      UPDATE employees SET
        first_name = $1,
        last_name = $2,
        email = $3,
        phone_number = $4,
        emergency_contact_name = $5,
        emergency_contact_phone = $6,
        emergency_contact_relationship = $7,
        address_street = $8,
        address_city = $9,
        address_state = $10,
        address_zip_code = $11,
        notification_preferences = $12::jsonb,
        dashboard_preferences = $13::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
    `, [
      profileData.firstName,
      profileData.lastName,
      profileData.email,
      profileData.phoneNumber,
      profileData.emergencyContact.name,
      profileData.emergencyContact.phone,
      profileData.emergencyContact.relationship,
      profileData.address.street,
      profileData.address.city,
      profileData.address.state,
      profileData.address.zipCode,
      JSON.stringify(profileData.preferences.notifications),
      JSON.stringify(profileData.preferences.dashboard),
      employee.user?.id
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update employee profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}