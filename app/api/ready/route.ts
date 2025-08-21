import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Readiness check - ensure all critical dependencies are available
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        missing_environment_variables: missingVars,
        message: 'Required environment variables are missing'
      }, { status: 503 });
    }
    
    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to accept traffic',
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    console.error('Readiness check failed:', error);
    
    return NextResponse.json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    }, { status: 503 });
  }
}