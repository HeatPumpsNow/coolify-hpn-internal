import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    // Forward the request body if present
    const body = await request.json().catch(() => ({}));
    
    const response = await fetch(`${authServiceUrl}/api/admin/rate-limits/clear`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'X-Owner-Email': request.headers.get('x-owner-email') || 'owner@heatpumpsnow.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Auth service responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to clear rate limits:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Rate limit clear failed',
      message: 'Auth service unavailable - cannot clear rate limits'
    }, { status: 503 });
  }
}