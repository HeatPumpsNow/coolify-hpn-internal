import { NextResponse } from 'next/server';

export async function GET() {
  const healthData = {
    status: 'healthy',
    service: 'employee-portal',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };

  return NextResponse.json(healthData, { status: 200 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}