import { NextRequest, NextResponse } from 'next/server';

/**
 * Generic session endpoint - redirects to owner-specific session
 * This endpoint exists for compatibility with systems that expect /api/auth/session
 */
export async function GET(request: NextRequest) {
  try {
    // Forward to the owner-specific session endpoint
    const ownerSessionUrl = new URL('/api/owner/auth/session', request.url);
    
    const response = await fetch(ownerSessionUrl.toString(), {
      method: 'GET',
      headers: {
        // Forward relevant headers
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(([key]) => 
            ['authorization', 'cookie', 'user-agent'].includes(key.toLowerCase())
          )
        ),
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Generic session check error:', error);
    return NextResponse.json(
      { error: 'Session service temporarily unavailable' },
      { status: 503 }
    );
  }
}