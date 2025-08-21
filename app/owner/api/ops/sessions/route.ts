import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${authServiceUrl}/api/admin/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'X-Owner-Email': request.headers.get('x-owner-email') || 'owner@heatpumpsnow.com',
        'X-Session-Id': request.headers.get('x-session-id') || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Auth service responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to fetch sessions from auth service:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Auth service unavailable',
      data: [],
      total: 0
    }, { status: 503 });
  }
}