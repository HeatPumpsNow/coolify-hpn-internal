import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check database connectivity
    const dbResult = await pool.query('SELECT 1 as health_check')
    const dbHealthy = dbResult.rows[0]?.health_check === 1
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    const health = {
      status: 'healthy',
      service: 'owner-portal',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime,
      checks: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          responseTime: responseTime
        },
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        }
      }
    }
    
    const statusCode = dbHealthy ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
    
  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Database connection failed'
        }
      }
    }, { status: 503 })
  }
}