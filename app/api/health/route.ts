import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Test Supabase connection
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('customers').select('count').limit(1);
    
    const dbStatus = error ? 'error' : 'healthy';
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: dbStatus === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          responseTime: `${responseTime}ms`,
          provider: 'Supabase'
        },
        authentication: {
          status: 'healthy',
          provider: 'Supabase Auth'
        }
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };
    
    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthData, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      services: {
        database: { status: 'error' },
        authentication: { status: 'unknown' }
      }
    }, { status: 503 });
  }
}