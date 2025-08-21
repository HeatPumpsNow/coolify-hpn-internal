import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    // Forward query parameters if any
    const url = new URL(request.url);
    const queryString = url.search;
    
    const response = await fetch(`${authServiceUrl}/api/admin/security/events${queryString}`, {
      method: 'GET',
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
    console.error('Failed to fetch security events:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Auth service unavailable',
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      }
    }, { status: 503 });
  }
}