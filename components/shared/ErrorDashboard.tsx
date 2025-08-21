'use client';

/**
 * Centralized Error Tracking Dashboard
 * Unified dashboard for monitoring and analyzing errors across all 8 portals
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Portal, ErrorSeverity, UnifiedError, ErrorAggregator } from '../errors/error-format';

/**
 * Dashboard filter state
 */
interface DashboardFilters {
  portals: Portal[];
  severities: ErrorSeverity[];
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  searchQuery: string;
  errorCode?: string;
  userId?: string;
}

/**
 * Error statistics
 */
interface ErrorStatistics {
  totalErrors: number;
  errorRate: number;
  errorsByPortal: Record<Portal, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  topErrors: Array<{
    code: string;
    message: string;
    count: number;
    lastOccurrence: string;
  }>;
  recentErrors: UnifiedError[];
  errorTrend: Array<{
    timestamp: number;
    count: number;
  }>;
}

/**
 * Real-time alert configuration
 */
interface AlertConfig {
  enabled: boolean;
  criticalThreshold: number;
  highThreshold: number;
  rateThreshold: number;
  channels: ('email' | 'slack' | 'pagerduty')[];
}

/**
 * Main Error Dashboard Component
 */
export const ErrorDashboard: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    portals: Object.values(Portal),
    severities: Object.values(ErrorSeverity),
    timeRange: '24h',
    searchQuery: '',
  });
  
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [selectedError, setSelectedError] = useState<UnifiedError | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    enabled: true,
    criticalThreshold: 1,
    highThreshold: 10,
    rateThreshold: 100,
    channels: ['email', 'slack']
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch error data
  const fetchErrorData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        portals: filters.portals.join(','),
        severities: filters.severities.join(','),
        timeRange: filters.timeRange,
        search: filters.searchQuery,
      });
      
      if (filters.errorCode) params.append('errorCode', filters.errorCode);
      if (filters.userId) params.append('userId', filters.userId);
      
      const response = await fetch(`/api/errors/dashboard?${params}`);
      const data = await response.json();
      
      setStatistics(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch error data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!isRealtime) return;
    
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3008/errors');
    
    ws.onmessage = (event) => {
      const error: UnifiedError = JSON.parse(event.data);
      
      // Check if error matches filters
      if (
        filters.portals.includes(error.context.portal) &&
        filters.severities.includes(error.severity)
      ) {
        // Update statistics with new error
        setStatistics(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            totalErrors: prev.totalErrors + 1,
            recentErrors: [error, ...prev.recentErrors.slice(0, 49)]
          };
        });
        
        // Check for alerts
        checkAlerts(error);
      }
    };
    
    return () => {
      ws.close();
    };
  }, [isRealtime, filters, alertConfig]);

  // Initial data fetch
  useEffect(() => {
    fetchErrorData();
  }, [fetchErrorData]);

  // Auto-refresh
  useEffect(() => {
    if (!isRealtime) {
      const interval = setInterval(fetchErrorData, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isRealtime, fetchErrorData]);

  // Check for alerts
  const checkAlerts = (error: UnifiedError) => {
    if (!alertConfig.enabled) return;
    
    if (error.severity === ErrorSeverity.CRITICAL) {
      sendAlert('critical', error);
    } else if (error.severity === ErrorSeverity.HIGH && statistics) {
      const highErrorCount = statistics.errorsBySeverity[ErrorSeverity.HIGH] || 0;
      if (highErrorCount >= alertConfig.highThreshold) {
        sendAlert('threshold', error);
      }
    }
  };

  // Send alert
  const sendAlert = async (type: 'critical' | 'threshold', error: UnifiedError) => {
    const alertData = {
      type,
      error,
      channels: alertConfig.channels,
      timestamp: new Date().toISOString()
    };
    
    try {
      await fetch('/api/errors/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      });
    } catch (err) {
      console.error('Failed to send alert:', err);
    }
  };

  // Portal color mapping
  const portalColors: Record<Portal, string> = {
    [Portal.ADMIN]: 'bg-purple-500',
    [Portal.SALES]: 'bg-blue-500',
    [Portal.CUSTOMER]: 'bg-green-500',
    [Portal.PROJECT]: 'bg-yellow-500',
    [Portal.EMPLOYEE]: 'bg-orange-500',
    [Portal.SERVICE]: 'bg-red-500',
    [Portal.PARTNER]: 'bg-indigo-500',
    [Portal.ANALYTICS]: 'bg-pink-500'
  };

  // Severity color mapping
  const severityColors: Record<ErrorSeverity, string> = {
    [ErrorSeverity.LOW]: 'text-gray-600 bg-gray-100',
    [ErrorSeverity.MEDIUM]: 'text-yellow-600 bg-yellow-100',
    [ErrorSeverity.HIGH]: 'text-orange-600 bg-orange-100',
    [ErrorSeverity.CRITICAL]: 'text-red-600 bg-red-100'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading error dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Error Tracking Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitoring {Object.keys(filters.portals).length} portals • Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time toggle */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isRealtime}
                onChange={(e) => setIsRealtime(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Real-time</span>
            </label>
            
            {/* Alert status */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              alertConfig.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              Alerts {alertConfig.enabled ? 'ON' : 'OFF'}
            </div>
            
            {/* Refresh button */}
            <button
              onClick={fetchErrorData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Time range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          
          {/* Portal filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portals
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(Portal).map(portal => (
                <button
                  key={portal}
                  onClick={() => {
                    const newPortals = filters.portals.includes(portal)
                      ? filters.portals.filter(p => p !== portal)
                      : [...filters.portals, portal];
                    setFilters({ ...filters, portals: newPortals });
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    filters.portals.includes(portal)
                      ? `${portalColors[portal]} text-white`
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {portal}
                </button>
              ))}
            </div>
          </div>
          
          {/* Severity filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(ErrorSeverity).map(severity => (
                <button
                  key={severity}
                  onClick={() => {
                    const newSeverities = filters.severities.includes(severity)
                      ? filters.severities.filter(s => s !== severity)
                      : [...filters.severities, severity];
                    setFilters({ ...filters, severities: newSeverities });
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    filters.severities.includes(severity)
                      ? severityColors[severity]
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>
          
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Error message, code, user ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Errors */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Errors</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {statistics.totalErrors.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Error Rate */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {statistics.errorRate.toFixed(2)}/min
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Critical Errors */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {statistics.errorsBySeverity[ErrorSeverity.CRITICAL] || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* High Errors */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {statistics.errorsBySeverity[ErrorSeverity.HIGH] || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Error by Portal */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Errors by Portal</h3>
          {statistics && (
            <div className="space-y-3">
              {Object.entries(statistics.errorsByPortal).map(([portal, count]) => (
                <div key={portal} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${portalColors[portal as Portal]} mr-2`} />
                    <span className="text-sm font-medium capitalize">{portal}</span>
                  </div>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Top Errors */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Top Errors</h3>
          {statistics && (
            <div className="space-y-3">
              {statistics.topErrors.map((error, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setFilters({ ...filters, errorCode: error.code })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {error.code}
                        </span>
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {error.count} occurrences
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{error.message}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(error.lastOccurrence).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
        {statistics && statistics.recentErrors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Portal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trace ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics.recentErrors.map((error) => (
                  <tr
                    key={error.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedError(error)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded text-white ${portalColors[error.context.portal]}`}>
                        {error.context.portal}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${severityColors[error.severity]}`}>
                        {error.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <span className="font-mono text-xs">{error.code}</span>
                        <p className="text-gray-600 truncate max-w-xs">{error.message}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {error.context.userId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {error.context.traceId.substring(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No errors found matching the current filters.</p>
        )}
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <ErrorDetailModal
          error={selectedError}
          onClose={() => setSelectedError(null)}
        />
      )}

      {/* Alert Configuration Modal */}
      <AlertConfigModal
        config={alertConfig}
        onSave={setAlertConfig}
      />
    </div>
  );
};

/**
 * Error Detail Modal Component
 */
interface ErrorDetailModalProps {
  error: UnifiedError;
  onClose: () => void;
}

const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({ error, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'stack' | 'context' | 'timeline'>('details');
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Error Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['details', 'stack', 'context', 'timeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Error ID</label>
                <p className="mt-1 text-sm font-mono">{error.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Code</label>
                <p className="mt-1 text-sm font-mono">{error.code}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Message</label>
                <p className="mt-1 text-sm">{error.message}</p>
              </div>
              
              {error.userMessage && (
                <div>
                  <label className="text-sm font-medium text-gray-500">User Message</label>
                  <p className="mt-1 text-sm">{error.userMessage}</p>
                </div>
              )}
              
              {error.developerMessage && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Developer Message</label>
                  <p className="mt-1 text-sm">{error.developerMessage}</p>
                </div>
              )}
              
              {error.suggestedActions && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Suggested Actions</label>
                  <ul className="mt-1 list-disc list-inside text-sm">
                    {error.suggestedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'stack' && (
            <div>
              {error.stack ? (
                <pre className="text-xs font-mono bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
                  {error.stack}
                </pre>
              ) : (
                <p className="text-gray-500">No stack trace available</p>
              )}
            </div>
          )}
          
          {activeTab === 'context' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Trace ID</label>
                  <p className="mt-1 text-sm font-mono">{error.context.traceId}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Request ID</label>
                  <p className="mt-1 text-sm font-mono">{error.context.requestId}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Portal</label>
                  <p className="mt-1 text-sm">{error.context.portal}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Environment</label>
                  <p className="mt-1 text-sm">{error.context.environment}</p>
                </div>
                
                {error.context.userId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">User ID</label>
                    <p className="mt-1 text-sm font-mono">{error.context.userId}</p>
                  </div>
                )}
                
                {error.context.sessionId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Session ID</label>
                    <p className="mt-1 text-sm font-mono">{error.context.sessionId}</p>
                  </div>
                )}
                
                {error.context.requestPath && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Path</label>
                    <p className="mt-1 text-sm">
                      {error.context.requestMethod} {error.context.requestPath}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'timeline' && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium">Error Time:</span>
                <span>{new Date(error.timestamp).toLocaleString()}</span>
              </div>
              
              {error.context.processingDuration && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">Processing Duration:</span>
                  <span>{error.context.processingDuration}ms</span>
                </div>
              )}
              
              {error.firstOccurrence && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">First Occurrence:</span>
                  <span>{new Date(error.firstOccurrence).toLocaleString()}</span>
                </div>
              )}
              
              {error.lastOccurrence && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">Last Occurrence:</span>
                  <span>{new Date(error.lastOccurrence).toLocaleString()}</span>
                </div>
              )}
              
              {error.errorCount && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">Total Occurrences:</span>
                  <span>{error.errorCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Alert Configuration Modal
 */
interface AlertConfigModalProps {
  config: AlertConfig;
  onSave: (config: AlertConfig) => void;
}

const AlertConfigModal: React.FC<AlertConfigModalProps> = ({ config, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);
  
  const handleSave = () => {
    onSave(localConfig);
    setIsOpen(false);
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Alert Configuration</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localConfig.enabled}
                onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium">Enable Alerts</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Critical Threshold
            </label>
            <input
              type="number"
              value={localConfig.criticalThreshold}
              onChange={(e) => setLocalConfig({ ...localConfig, criticalThreshold: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              High Threshold
            </label>
            <input
              type="number"
              value={localConfig.highThreshold}
              onChange={(e) => setLocalConfig({ ...localConfig, highThreshold: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Threshold (errors/min)
            </label>
            <input
              type="number"
              value={localConfig.rateThreshold}
              onChange={(e) => setLocalConfig({ ...localConfig, rateThreshold: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Channels
            </label>
            <div className="space-y-2">
              {(['email', 'slack', 'pagerduty'] as const).map(channel => (
                <label key={channel} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localConfig.channels.includes(channel)}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...localConfig.channels, channel]
                        : localConfig.channels.filter(c => c !== channel);
                      setLocalConfig({ ...localConfig, channels });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;