import { NextRequest, NextResponse } from 'next/server'

// Simple metrics collection for Prometheus
let metrics = {
  http_requests_total: 0,
  http_request_duration_seconds: [] as number[],
  active_connections: 0,
  database_queries_total: 0,
  errors_total: 0
}

export async function GET(request: NextRequest) {
  try {
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    // Generate Prometheus format metrics
    const prometheusMetrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.http_requests_total}

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_count ${metrics.http_request_duration_seconds.length}
http_request_duration_seconds_sum ${metrics.http_request_duration_seconds.reduce((a, b) => a + b, 0)}

# HELP active_connections Number of active connections
# TYPE active_connections gauge
active_connections ${metrics.active_connections}

# HELP database_queries_total Total number of database queries
# TYPE database_queries_total counter
database_queries_total ${metrics.database_queries_total}

# HELP errors_total Total number of errors
# TYPE errors_total counter
errors_total ${metrics.errors_total}

# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}
nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}

# HELP nodejs_uptime_seconds Node.js uptime in seconds
# TYPE nodejs_uptime_seconds gauge
nodejs_uptime_seconds ${uptime}

# HELP owner_portal_info Information about the owner portal
# TYPE owner_portal_info gauge
owner_portal_info{version="${process.env.npm_package_version || '1.0.0'}",environment="${process.env.NODE_ENV || 'development'}"} 1
`.trim()

    return new NextResponse(prometheusMetrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    })
    
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json({ error: 'Failed to generate metrics' }, { status: 500 })
  }
}

// Note: Helper functions for updating metrics should be moved to a separate metrics utility file
// if needed by other parts of the application