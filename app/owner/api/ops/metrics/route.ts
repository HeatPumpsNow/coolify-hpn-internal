import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Forward request to auth service admin API
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${authServiceUrl}/api/admin/metrics`, {
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
    console.error('Failed to fetch metrics from auth service:', error);
    
    // Return fallback mock data when auth service is unavailable
    return NextResponse.json({
      success: false,
      error: 'Auth service unavailable',
      fallback_data: {
        auth: {
          successRate: 0,
          avgResponseTime: 0,
          activeUsers: 0,
          loginAttemptsLastHour: 0
        },
        system: {
          uptime: 0,
          memoryUsage: { heapUsed: 0 },
          connections: {
            database: { healthy: false, message: 'Auth service unavailable' },
            redis: { healthy: false, message: 'Auth service unavailable' }
          }
        },
        security: {
          suspiciousActivity: [],
          rateLimitedIPs: 0,
          failedLogins: 0,
          lockedAccounts: 0
        }
      }
    }, { status: 503 });
  }
}