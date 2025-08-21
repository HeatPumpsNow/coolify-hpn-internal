import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${authServiceUrl}/api/admin/sessions/${sessionId}/terminate`, {
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
    console.error('Failed to terminate session:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to terminate session'
    }, { status: 500 });
  }
}