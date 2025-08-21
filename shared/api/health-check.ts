/**
 * Unified Health Check Module
 * Provides consistent health check endpoints for all portals
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { healthCheckResponse, readyCheckResponse } from './response';
import { DATABASE_CONFIG, REDIS_CONFIG } from '../config/ports';

let dbPool: Pool | null = null;

/**
 * Initialize database pool if not already initialized
 */
function getDbPool(): Pool {
  if (!dbPool) {
    dbPool = new Pool(DATABASE_CONFIG);
  }
  return dbPool;
}

/**
 * Check database connectivity and measure latency
 */
async function checkDatabase(): Promise<{ connected: boolean; latency: number }> {
  const startTime = Date.now();
  try {
    const pool = getDbPool();
    const result = await pool.query('SELECT 1');
    const latency = Date.now() - startTime;
    return { connected: true, latency };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { connected: false, latency: -1 };
  }
}

/**
 * Check Redis connectivity and measure latency (optional)
 */
async function checkRedis(): Promise<{ connected: boolean; latency: number } | null> {
  // Skip Redis check if not configured
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    return null;
  }

  try {
    // Dynamic import to avoid dependency issues if Redis is not used
    const redis = await import('redis').catch(() => null);
    if (!redis) return null;

    const startTime = Date.now();
    const client = redis.createClient({
      url: process.env.REDIS_URL || `redis://${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`,
      password: REDIS_CONFIG.password
    });

    await client.connect();
    await client.ping();
    await client.disconnect();
    
    const latency = Date.now() - startTime;
    return { connected: true, latency };
  } catch (error) {
    console.error('Redis health check failed:', error);
    return { connected: false, latency: -1 };
  }
}

/**
 * Create health check handler for a portal
 */
export function createHealthCheckHandler(portalName: string) {
  return async (req: NextRequest) => {
    try {
      const dbCheck = await checkDatabase();
      const redisCheck = await checkRedis();
      
      const response = healthCheckResponse(
        portalName,
        dbCheck.connected,
        redisCheck?.connected,
        dbCheck.latency,
        redisCheck?.latency
      );

      const status = response.data?.status === 'healthy' ? 200 : 
                     response.data?.status === 'degraded' ? 206 : 503;

      return NextResponse.json(response, { status });
    } catch (error) {
      console.error('Health check error:', error);
      return NextResponse.json(
        healthCheckResponse(portalName, false, false),
        { status: 503 }
      );
    }
  };
}

/**
 * Create ready check handler for a portal (Kubernetes readiness probe)
 */
export function createReadyCheckHandler(portalName: string) {
  return async (req: NextRequest) => {
    try {
      const dbCheck = await checkDatabase();
      const isReady = dbCheck.connected;
      
      const response = readyCheckResponse(portalName, isReady);
      const status = isReady ? 200 : 503;

      return NextResponse.json(response, { status });
    } catch (error) {
      console.error('Ready check error:', error);
      return NextResponse.json(
        readyCheckResponse(portalName, false),
        { status: 503 }
      );
    }
  };
}

/**
 * Create metrics endpoint handler for Prometheus
 */
export function createMetricsHandler(portalName: string) {
  return async (req: NextRequest) => {
    const metrics = [
      `# HELP portal_info Portal information`,
      `# TYPE portal_info gauge`,
      `portal_info{name="${portalName}",version="${process.env.API_VERSION || '1.0.0'}"} 1`,
      ``,
      `# HELP process_uptime_seconds Process uptime in seconds`,
      `# TYPE process_uptime_seconds counter`,
      `process_uptime_seconds ${process.uptime()}`,
      ``,
      `# HELP nodejs_heap_size_total_bytes Process heap size`,
      `# TYPE nodejs_heap_size_total_bytes gauge`,
      `nodejs_heap_size_total_bytes ${process.memoryUsage().heapTotal}`,
      ``,
      `# HELP nodejs_heap_size_used_bytes Process heap used`,
      `# TYPE nodejs_heap_size_used_bytes gauge`,
      `nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}`,
      ``,
      `# HELP nodejs_external_memory_bytes Process external memory`,
      `# TYPE nodejs_external_memory_bytes gauge`,
      `nodejs_external_memory_bytes ${process.memoryUsage().external}`,
    ].join('\n');

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    });
  };
}

/**
 * Cleanup database pool on process exit
 */
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    if (dbPool) {
      await dbPool.end();
      dbPool = null;
    }
  });
}