import { NextRequest, NextResponse } from 'next/server';
import { healthCheck as dbHealthCheck } from '@/lib/database';

export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // Check database connection
    const dbHealth = await dbHealthCheck();
    
    // Check Redis connection (optional for development)
    let redisHealth: { status: 'healthy' | 'unhealthy'; latency: number; error?: string } = { status: 'healthy', latency: 0 };
    
    if (process.env.ENABLE_REDIS !== 'false') {
      try {
        const { healthCheck: redisHealthCheck } = await import('@/lib/redis');
        const result = await redisHealthCheck();
        redisHealth = {
          status: result.status,
          latency: result.latency || 0,
          error: result.error
        };
      } catch (error) {
        console.warn('Redis health check failed, continuing without Redis:', error);
        redisHealth = { status: 'unhealthy', latency: 0, error: 'Redis unavailable' };
      }
    }
    
    // Calculate overall health (Redis is optional)
    const isHealthy = dbHealth.status === 'healthy';
    const totalLatency = Date.now() - start;
    
    const response = {
      success: true,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      portal: 'sales-portal',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      latency: totalLatency,
      services: {
        database: {
          status: dbHealth.status,
          latency: dbHealth.latency,
          error: dbHealth.error,
        },
        redis: {
          status: redisHealth.status,
          latency: redisHealth.latency,
          error: redisHealth.error,
        },
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse = {
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      portal: 'sales-portal',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}