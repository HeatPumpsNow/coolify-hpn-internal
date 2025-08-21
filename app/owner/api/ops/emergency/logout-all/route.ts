import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${authServiceUrl}/api/admin/emergency/logout-all`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'X-Owner-Email': request.headers.get('x-owner-email') || 'owner@heatpumpsnow.com',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Auth service responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to execute emergency logout:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Emergency logout failed',
      message: 'Auth service unavailable - emergency logout not executed'
    }, { status: 503 });
  }
}