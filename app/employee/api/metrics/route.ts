// Prometheus metrics endpoint for monitoring

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory metrics store (in production, use a proper metrics library)
const metrics = {
  requests_total: 0,
  requests_errors: 0,
  response_time_seconds: [] as number[],
  active_jobs: 0,
  completed_jobs: 0,
  active_users: new Set<string>(),
  db_connections: 0,
};

export async function GET(request: NextRequest) {
  try {
    // Calculate average response time
    const avgResponseTime = metrics.response_time_seconds.length > 0
      ? metrics.response_time_seconds.reduce((a, b) => a + b, 0) / metrics.response_time_seconds.length
      : 0;

    // Generate Prometheus format metrics
    const prometheusMetrics = `
# HELP employee_portal_requests_total Total number of HTTP requests
# TYPE employee_portal_requests_total counter
employee_portal_requests_total ${metrics.requests_total}

# HELP employee_portal_requests_errors_total Total number of HTTP request errors
# TYPE employee_portal_requests_errors_total counter
employee_portal_requests_errors_total ${metrics.requests_errors}

# HELP employee_portal_response_time_seconds Average response time in seconds
# TYPE employee_portal_response_time_seconds gauge
employee_portal_response_time_seconds ${avgResponseTime}

# HELP employee_portal_active_jobs Current number of active jobs
# TYPE employee_portal_active_jobs gauge
employee_portal_active_jobs ${metrics.active_jobs}

# HELP employee_portal_completed_jobs_total Total number of completed jobs
# TYPE employee_portal_completed_jobs_total counter
employee_portal_completed_jobs_total ${metrics.completed_jobs}

# HELP employee_portal_active_users Current number of active users
# TYPE employee_portal_active_users gauge
employee_portal_active_users ${metrics.active_users.size}

# HELP employee_portal_db_connections Current number of database connections
# TYPE employee_portal_db_connections gauge
employee_portal_db_connections ${metrics.db_connections}

# HELP nodejs_process_memory_usage_bytes Node.js process memory usage
# TYPE nodejs_process_memory_usage_bytes gauge
nodejs_process_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}
nodejs_process_memory_usage_bytes{type="heapTotal"} ${process.memoryUsage().heapTotal}
nodejs_process_memory_usage_bytes{type="heapUsed"} ${process.memoryUsage().heapUsed}
nodejs_process_memory_usage_bytes{type="external"} ${process.memoryUsage().external}

# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${process.uptime()}
`.trim();

    return new NextResponse(prometheusMetrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

// Move updateMetrics to a separate utility file in production
// Helper functions to update metrics (for internal use only)
const updateMetrics = {
  incrementRequests: () => metrics.requests_total++,
  incrementErrors: () => metrics.requests_errors++,
  addResponseTime: (time: number) => {
    metrics.response_time_seconds.push(time);
    // Keep only last 100 response times
    if (metrics.response_time_seconds.length > 100) {
      metrics.response_time_seconds.shift();
    }
  },
  setActiveJobs: (count: number) => metrics.active_jobs = count,
  incrementCompletedJobs: () => metrics.completed_jobs++,
  addActiveUser: (userId: string) => metrics.active_users.add(userId),
  removeActiveUser: (userId: string) => metrics.active_users.delete(userId),
  setDbConnections: (count: number) => metrics.db_connections = count,
};