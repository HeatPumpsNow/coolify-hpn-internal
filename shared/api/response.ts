/**
 * Unified API Response Module
 * Ensures consistent API responses across all 8 portals
 */

import { ApiResponse, SuccessResponse, ErrorResponse, ErrorCode } from '../errors';

export { ApiResponse, SuccessResponse, ErrorResponse, ErrorCode };

/**
 * Portal-specific response extensions
 */
export interface PortalApiResponse<T = any> extends ApiResponse<T> {
  portal?: string;
  version?: string;
}

/**
 * Create a portal-specific success response
 */
export function portalSuccess<T>(
  portal: string,
  data: T,
  metadata?: any
): PortalApiResponse<T> {
  return {
    ...SuccessResponse.create(data, metadata),
    portal,
    version: process.env.API_VERSION || '1.0.0'
  };
}

/**
 * Create a portal-specific error response
 */
export function portalError(
  portal: string,
  code: ErrorCode,
  message: string,
  details?: any
): PortalApiResponse {
  return {
    ...ErrorResponse.create({ code, message, details } as any),
    portal,
    version: process.env.API_VERSION || '1.0.0'
  };
}

/**
 * Standard health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  portal: string;
  version: string;
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    latency?: number;
  };
  redis?: {
    connected: boolean;
    latency?: number;
  };
}

/**
 * Create health check response
 */
export function healthCheckResponse(
  portal: string,
  dbConnected: boolean,
  redisConnected?: boolean,
  dbLatency?: number,
  redisLatency?: number
): ApiResponse<HealthCheckResponse> {
  const uptime = process.uptime();
  const status = dbConnected && (redisConnected !== false) ? 'healthy' : 
                 dbConnected ? 'degraded' : 'unhealthy';
  
  return SuccessResponse.create({
    status,
    portal,
    version: process.env.API_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime,
    database: {
      connected: dbConnected,
      latency: dbLatency
    },
    ...(redisConnected !== undefined && {
      redis: {
        connected: redisConnected,
        latency: redisLatency
      }
    })
  });
}

/**
 * Ready check response for Kubernetes
 */
export function readyCheckResponse(
  portal: string,
  isReady: boolean
): ApiResponse<{ ready: boolean; portal: string }> {
  if (isReady) {
    return SuccessResponse.create({ ready: true, portal });
  }
  return ErrorResponse.create({
    code: ErrorCode.SERVICE_UNAVAILABLE,
    message: 'Service not ready',
    portal
  } as any);
}