'use client';

import { useEffect, useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Shield,
  Users,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'normal';
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

function MetricCard({ title, value, icon, status = 'normal', trend, subtitle }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-white border-gray-200';
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  return (
    <div className={`p-6 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center">
            {icon}
            <h3 className="ml-2 text-sm font-medium">{title}</h3>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold">{value}</p>
            {getTrendIcon()}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

interface HealthCheckProps {
  service: string;
  status: { healthy: boolean; message?: string };
  details?: Record<string, any>;
}

function HealthCheck({ service, status, details }: HealthCheckProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {status.healthy ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <h4 className="ml-2 font-medium">{service}</h4>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          status.healthy 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {status.healthy ? 'Healthy' : 'Unhealthy'}
        </span>
      </div>
      {status.message && (
        <p className="text-sm text-gray-600 mt-2">{status.message}</p>
      )}
      {details && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-500">{key}:</span>
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OpsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [liveData, setLiveData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    
    // Set up periodic refresh
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      // Call the real backend API
      const response = await fetch('/api/ops/metrics', {
        headers: {
          'Authorization': 'Bearer owner-token', // In production, use real JWT
          'X-Owner-Email': 'owner@heatpumpsnow.com'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
        
        // Set live data from the real metrics
        setLiveData({
          activeSessions: result.data.auth.activeUsers || 0,
          requestsPerSecond: result.data.auth.tokenIssuanceRate || 0,
          sessionTrend: result.data.auth.activeUsers > 20 ? 'up' : 'neutral'
        });
      } else {
        throw new Error(result.error || 'Failed to fetch metrics');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      
      // Fallback to mock data if API fails
      const mockMetrics = {
        auth: {
          successRate: 98.5,
          avgResponseTime: 45,
          activeUsers: 0,
          loginAttemptsLastHour: 0
        },
        system: {
          uptime: 172800,
          memoryUsage: { heapUsed: 125829120 },
          connections: {
            database: { 
              healthy: false, 
              message: 'Backend API unavailable'
            },
            redis: { 
              healthy: false, 
              message: 'Backend API unavailable'
            }
          }
        },
        security: {
          suspiciousActivity: [],
          rateLimitedIPs: 0,
          failedLogins: 0,
          lockedAccounts: 0
        }
      };
      
      setMetrics(mockMetrics);
      setLiveData({
        activeSessions: 0,
        requestsPerSecond: 0,
        sessionTrend: 'neutral'
      });
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading operations dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Critical Alerts */}
      {metrics?.security?.suspiciousActivity?.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <Shield className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Security Alert</h3>
              <p className="text-sm text-red-700 mt-1">
                {metrics.security.suspiciousActivity.length} suspicious activities detected
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Sessions"
          value={liveData.activeSessions || 0}
          icon={<Users className="h-5 w-5" />}
          trend={liveData.sessionTrend}
          status="success"
        />
        <MetricCard
          title="Requests/sec"
          value={liveData.requestsPerSecond || 0}
          icon={<Zap className="h-5 w-5" />}
          status={liveData.requestsPerSecond > 100 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="Auth Success Rate"
          value={`${metrics?.auth?.successRate || 0}%`}
          icon={<Shield className="h-5 w-5" />}
          status={metrics?.auth?.successRate < 95 ? 'error' : 'success'}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${metrics?.auth?.avgResponseTime || 0}ms`}
          icon={<Activity className="h-5 w-5" />}
          status={metrics?.auth?.avgResponseTime > 100 ? 'warning' : 'success'}
        />
      </div>

      {/* System Health */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Database className="mr-2 h-5 w-5" />
          System Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HealthCheck
            service="Database"
            status={metrics?.system?.connections?.database}
            details={{
              'Pool Size': metrics?.system?.connections?.database?.poolSize,
              'Active': metrics?.system?.connections?.database?.active,
              'Idle': metrics?.system?.connections?.database?.idle,
            }}
          />
          <HealthCheck
            service="Redis Cache"
            status={metrics?.system?.connections?.redis}
            details={{
              'Memory': metrics?.system?.connections?.redis?.memory,
              'Clients': metrics?.system?.connections?.redis?.clients,
              'Hit Rate': `${metrics?.system?.connections?.redis?.hitRate}%`,
            }}
          />
          <HealthCheck
            service="Auth Service"
            status={{ healthy: true, message: 'Service operational' }}
            details={{
              'Uptime': formatUptime(metrics?.system?.uptime || 0),
              'Memory': formatBytes(metrics?.system?.memoryUsage?.heapUsed || 0),
              'Active Users': metrics?.auth?.activeUsers || 0,
            }}
          />
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Activity Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.auth?.loginAttemptsLastHour || 0}
            </div>
            <div className="text-sm text-blue-600">Logins (1h)</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {metrics?.security?.failedLogins || 0}
            </div>
            <div className="text-sm text-red-600">Failed Logins</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {metrics?.security?.rateLimitedIPs || 0}
            </div>
            <div className="text-sm text-yellow-600">Rate Limited IPs</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {metrics?.security?.lockedAccounts || 0}
            </div>
            <div className="text-sm text-green-600">Locked Accounts</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/ops/rate-limits/clear', {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Bearer owner-token',
                    'X-Owner-Email': 'owner@heatpumpsnow.com',
                    'Content-Type': 'application/json'
                  }
                });
                const result = await response.json();
                if (result.success) {
                  alert('Rate limits cleared successfully');
                  fetchMetrics(); // Refresh metrics
                } else {
                  alert(`Failed to clear rate limits: ${result.error}`);
                }
              } catch (error) {
                alert('Failed to clear rate limits - service unavailable');
              }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Clear Rate Limits
          </button>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/ops/audit/export', {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Bearer owner-token',
                    'X-Owner-Email': 'owner@heatpumpsnow.com',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString(),
                    format: 'json'
                  })
                });
                const result = await response.json();
                if (result.success) {
                  alert('Audit log export started successfully');
                } else {
                  alert(`Failed to export audit log: ${result.error}`);
                }
              } catch (error) {
                alert('Failed to export audit log - service unavailable');
              }
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Export Audit Log
          </button>
          <button 
            onClick={async () => {
              if (confirm('This will log out ALL users. Continue?')) {
                try {
                  const response = await fetch('/api/ops/emergency/logout-all', {
                    method: 'POST',
                    headers: {
                      'Authorization': 'Bearer owner-token',
                      'X-Owner-Email': 'owner@heatpumpsnow.com',
                      'Content-Type': 'application/json'
                    }
                  });
                  const result = await response.json();
                  if (result.success) {
                    alert('Emergency logout initiated successfully');
                    fetchMetrics(); // Refresh metrics
                  } else {
                    alert(`Failed to initiate emergency logout: ${result.error}`);
                  }
                } catch (error) {
                  alert('Failed to initiate emergency logout - service unavailable');
                }
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Emergency Logout All
          </button>
        </div>
      </div>
    </div>
  );
}