/**
 * Error Reporting and Dashboard API Endpoints
 * Handles error collection, aggregation, and dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedError, ErrorSeverity, Portal, ErrorAggregator } from '../errors/error-format';
import { ServerTracing, TRACING_HEADERS } from '../lib/request-tracing';

// In-memory storage for demo (replace with database in production)
const errorStore: UnifiedError[] = [];
const aggregator = new ErrorAggregator();

// WebSocket connections for real-time updates
const wsConnections = new Set<any>();

/**
 * Report an error to the tracking system
 */
export async function reportError(req: NextRequest): Promise<NextResponse> {
  try {
    const error: UnifiedError = await req.json();
    
    // Extract trace context from headers
    const traceContext = ServerTracing.extractContext(req.headers);
    
    // Enhance error with server-side context
    error.context = {
      ...error.context,
      ...traceContext,
      hostname: process.env.HOSTNAME || 'unknown',
      version: process.env.APP_VERSION || '1.0.0'
    };
    
    // Store error
    errorStore.push(error);
    aggregator.addError(error);
    
    // Broadcast to WebSocket clients
    broadcastError(error);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR REPORTED]', {
        id: error.id,
        code: error.code,
        severity: error.severity,
        portal: error.context.portal,
        traceId: error.context.traceId
      });
    }
    
    // Send to external monitoring service (if configured)
    await sendToMonitoring(error);
    
    return NextResponse.json({
      success: true,
      errorId: error.id,
      traceId: error.context.traceId
    });
  } catch (err) {
    console.error('Failed to report error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to report error' },
      { status: 500 }
    );
  }
}

/**
 * Get dashboard data
 */
export async function getDashboardData(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const filters = {
      portals: searchParams.get('portals')?.split(',') as Portal[] || Object.values(Portal),
      severities: searchParams.get('severities')?.split(',') as ErrorSeverity[] || Object.values(ErrorSeverity),
      timeRange: searchParams.get('timeRange') || '24h',
      search: searchParams.get('search') || '',
      errorCode: searchParams.get('errorCode'),
      userId: searchParams.get('userId')
    };
    
    // Calculate time range
    const now = Date.now();
    const timeRanges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    const cutoffTime = now - timeRanges[filters.timeRange];
    
    // Filter errors
    const filteredErrors = errorStore.filter(error => {
      // Time filter
      if (error.timestampMs < cutoffTime) return false;
      
      // Portal filter
      if (!filters.portals.includes(error.context.portal)) return false;
      
      // Severity filter
      if (!filters.severities.includes(error.severity)) return false;
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !error.message.toLowerCase().includes(searchLower) &&
          !error.code.toLowerCase().includes(searchLower) &&
          !error.context.userId?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      
      // Error code filter
      if (filters.errorCode && error.code !== filters.errorCode) return false;
      
      // User ID filter
      if (filters.userId && error.context.userId !== filters.userId) return false;
      
      return true;
    });
    
    // Calculate statistics
    const stats = calculateStatistics(filteredErrors, filters.timeRange);
    
    return NextResponse.json(stats);
  } catch (err) {
    console.error('Failed to get dashboard data:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to get dashboard data' },
      { status: 500 }
    );
  }
}

/**
 * Send alert
 */
export async function sendAlert(req: NextRequest): Promise<NextResponse> {
  try {
    const alertData = await req.json();
    
    // Process alert based on channels
    for (const channel of alertData.channels) {
      switch (channel) {
        case 'email':
          await sendEmailAlert(alertData);
          break;
        case 'slack':
          await sendSlackAlert(alertData);
          break;
        case 'pagerduty':
          await sendPagerDutyAlert(alertData);
          break;
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to send alert:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to send alert' },
      { status: 500 }
    );
  }
}

/**
 * Get error details
 */
export async function getErrorDetails(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const errorId = searchParams.get('id');
    
    if (!errorId) {
      return NextResponse.json(
        { success: false, message: 'Error ID required' },
        { status: 400 }
      );
    }
    
    const error = errorStore.find(e => e.id === errorId);
    
    if (!error) {
      return NextResponse.json(
        { success: false, message: 'Error not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(error);
  } catch (err) {
    console.error('Failed to get error details:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to get error details' },
      { status: 500 }
    );
  }
}

/**
 * Get error trace
 */
export async function getErrorTrace(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const traceId = searchParams.get('traceId');
    
    if (!traceId) {
      return NextResponse.json(
        { success: false, message: 'Trace ID required' },
        { status: 400 }
      );
    }
    
    const traceErrors = errorStore.filter(e => e.context.traceId === traceId);
    
    return NextResponse.json({
      traceId,
      errors: traceErrors,
      count: traceErrors.length
    });
  } catch (err) {
    console.error('Failed to get error trace:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to get error trace' },
      { status: 500 }
    );
  }
}

/**
 * Calculate statistics from filtered errors
 */
function calculateStatistics(errors: UnifiedError[], timeRange: string): any {
  const now = Date.now();
  
  // Group errors by portal
  const errorsByPortal: Record<Portal, number> = {} as any;
  for (const portal of Object.values(Portal)) {
    errorsByPortal[portal] = 0;
  }
  
  // Group errors by severity
  const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
  for (const severity of Object.values(ErrorSeverity)) {
    errorsBySeverity[severity] = 0;
  }
  
  // Count errors and group by code
  const errorCounts: Record<string, { count: number; message: string; lastOccurrence: string }> = {};
  
  for (const error of errors) {
    // By portal
    errorsByPortal[error.context.portal]++;
    
    // By severity
    errorsBySeverity[error.severity]++;
    
    // By code
    if (!errorCounts[error.code]) {
      errorCounts[error.code] = {
        count: 0,
        message: error.message,
        lastOccurrence: error.timestamp
      };
    }
    errorCounts[error.code].count++;
    if (error.timestamp > errorCounts[error.code].lastOccurrence) {
      errorCounts[error.code].lastOccurrence = error.timestamp;
    }
  }
  
  // Top errors
  const topErrors = Object.entries(errorCounts)
    .map(([code, data]) => ({ code, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Recent errors (last 50)
  const recentErrors = errors
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, 50);
  
  // Calculate error rate (errors per minute)
  const timeRangeMinutes = {
    '1h': 60,
    '6h': 360,
    '24h': 1440,
    '7d': 10080,
    '30d': 43200
  };
  const errorRate = errors.length / timeRangeMinutes[timeRange as keyof typeof timeRangeMinutes];
  
  // Error trend (hourly buckets for last 24 hours)
  const hourlyBuckets: Record<number, number> = {};
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  for (const error of errors) {
    if (error.timestampMs >= oneDayAgo) {
      const hour = Math.floor(error.timestampMs / (60 * 60 * 1000));
      hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;
    }
  }
  
  const errorTrend = Object.entries(hourlyBuckets)
    .map(([hour, count]) => ({
      timestamp: parseInt(hour) * 60 * 60 * 1000,
      count
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
  
  return {
    totalErrors: errors.length,
    errorRate,
    errorsByPortal,
    errorsBySeverity,
    topErrors,
    recentErrors,
    errorTrend
  };
}

/**
 * Broadcast error to WebSocket clients
 */
function broadcastError(error: UnifiedError): void {
  const message = JSON.stringify(error);
  
  for (const ws of wsConnections) {
    try {
      ws.send(message);
    } catch (err) {
      // Remove dead connections
      wsConnections.delete(ws);
    }
  }
}

/**
 * Send error to external monitoring service
 */
async function sendToMonitoring(error: UnifiedError): Promise<void> {
  // Integration with services like Sentry, DataDog, New Relic, etc.
  if (process.env.SENTRY_DSN) {
    // Send to Sentry
    try {
      await fetch(process.env.SENTRY_DSN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: error.id,
          timestamp: error.timestamp,
          level: mapSeverityToSentryLevel(error.severity),
          message: error.message,
          tags: {
            portal: error.context.portal,
            environment: error.context.environment,
            trace_id: error.context.traceId
          },
          user: error.context.userId ? { id: error.context.userId } : undefined,
          extra: {
            details: error.details,
            context: error.context
          }
        })
      });
    } catch (err) {
      console.error('Failed to send to Sentry:', err);
    }
  }
  
  if (process.env.DATADOG_API_KEY) {
    // Send to DataDog
    try {
      await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY
        },
        body: JSON.stringify({
          message: error.message,
          severity: error.severity,
          service: 'heatpumpsnow',
          ddsource: 'nodejs',
          ddtags: `portal:${error.context.portal},env:${error.context.environment}`,
          error_id: error.id,
          trace_id: error.context.traceId,
          user_id: error.context.userId
        })
      });
    } catch (err) {
      console.error('Failed to send to DataDog:', err);
    }
  }
}

/**
 * Send email alert
 */
async function sendEmailAlert(alertData: any): Promise<void> {
  // Implement email sending logic
  console.log('Sending email alert:', alertData);
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(alertData: any): Promise<void> {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  
  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Error Alert: ${alertData.type}`,
        attachments: [{
          color: alertData.type === 'critical' ? 'danger' : 'warning',
          fields: [
            {
              title: 'Error Code',
              value: alertData.error.code,
              short: true
            },
            {
              title: 'Severity',
              value: alertData.error.severity,
              short: true
            },
            {
              title: 'Portal',
              value: alertData.error.context.portal,
              short: true
            },
            {
              title: 'Message',
              value: alertData.error.message,
              short: false
            }
          ],
          footer: `Trace ID: ${alertData.error.context.traceId}`,
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });
  } catch (err) {
    console.error('Failed to send Slack alert:', err);
  }
}

/**
 * Send PagerDuty alert
 */
async function sendPagerDutyAlert(alertData: any): Promise<void> {
  if (!process.env.PAGERDUTY_INTEGRATION_KEY) return;
  
  try {
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token token=${process.env.PAGERDUTY_INTEGRATION_KEY}`
      },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
        event_action: 'trigger',
        dedup_key: alertData.error.id,
        payload: {
          summary: `${alertData.error.severity} error in ${alertData.error.context.portal} portal: ${alertData.error.message}`,
          severity: mapSeverityToPagerDuty(alertData.error.severity),
          source: alertData.error.context.portal,
          custom_details: {
            error_id: alertData.error.id,
            trace_id: alertData.error.context.traceId,
            error_code: alertData.error.code,
            user_id: alertData.error.context.userId
          }
        }
      })
    });
  } catch (err) {
    console.error('Failed to send PagerDuty alert:', err);
  }
}

/**
 * Map severity to Sentry level
 */
function mapSeverityToSentryLevel(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'fatal';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Map severity to PagerDuty severity
 */
function mapSeverityToPagerDuty(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'critical';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'error';
  }
}

/**
 * WebSocket handler for real-time updates
 */
export function handleWebSocket(ws: any): void {
  wsConnections.add(ws);
  
  ws.on('close', () => {
    wsConnections.delete(ws);
  });
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to error tracking system'
  }));
}

// Export API route handlers
export const errorHandlers = {
  report: reportError,
  dashboard: getDashboardData,
  alert: sendAlert,
  details: getErrorDetails,
  trace: getErrorTrace,
  websocket: handleWebSocket
};