'use client';

import { useEffect, useState } from 'react';
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  Activity, 
  Wifi,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Server
} from 'lucide-react';
import HealthIndicator from '../components/HealthIndicator';
import MetricsChart from '../components/MetricsChart';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime?: number;
  lastChecked: string;
  details?: Record<string, any>;
  message?: string;
}

export default function SystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: {
      usage: 23.5,
      cores: 4,
      loadAverage: [0.8, 0.9, 1.2]
    },
    memory: {
      total: 8589934592, // 8GB
      used: 3221225472,  // ~3GB
      free: 5368709120,  // ~5GB
      usagePercent: 37.5
    },
    disk: {
      total: 107374182400, // 100GB
      used: 32212254720,   // ~30GB
      free: 75161927680,   // ~70GB
      usagePercent: 30.0
    },
    network: {
      bytesIn: 1250000000,  // ~1.25GB
      bytesOut: 850000000,  // ~850MB
      packetsIn: 8500000,
      packetsOut: 7200000
    },
    uptime: 172800 // 2 days
  });

  const [services, setServices] = useState<ServiceHealth[]>([
    {
      name: 'Auth Service',
      status: 'healthy',
      responseTime: 45,
      lastChecked: new Date().toISOString(),
      details: {
        'Active Sessions': 24,
        'Memory Usage': '125MB',
        'CPU Usage': '8.5%'
      },
      message: 'All authentication services operational'
    },
    {
      name: 'Database (PostgreSQL)',
      status: 'healthy',
      responseTime: 12,
      lastChecked: new Date().toISOString(),
      details: {
        'Connections': '8/20',
        'Cache Hit Rate': '96.8%',
        'Disk Usage': '2.1GB'
      },
      message: 'Database performing optimally'
    },
    {
      name: 'Redis Cache',
      status: 'healthy',
      responseTime: 3,
      lastChecked: new Date().toISOString(),
      details: {
        'Memory Usage': '42MB',
        'Hit Rate': '94.2%',
        'Connected Clients': 5
      },
      message: 'Cache operating within normal parameters'
    },
    {
      name: 'Owner Portal',
      status: 'healthy',
      responseTime: 156,
      lastChecked: new Date().toISOString(),
      details: {
        'Active Users': 3,
        'Response Time': '156ms',
        'Error Rate': '0.1%'
      }
    },
    {
      name: 'Employee Portal',
      status: 'healthy',
      responseTime: 89,
      lastChecked: new Date().toISOString(),
      details: {
        'Active Users': 18,
        'Response Time': '89ms',
        'Error Rate': '0.3%'
      }
    },
    {
      name: 'Service Portal',
      status: 'warning',
      responseTime: 245,
      lastChecked: new Date().toISOString(),
      details: {
        'Active Users': 5,
        'Response Time': '245ms',
        'Error Rate': '1.2%'
      },
      message: 'Slightly elevated response time'
    }
  ]);

  // Mock historical data for CPU and Memory usage
  const systemHistoryData = Array.from({ length: 24 }, (_, i) => ({
    timestamp: `${String(i).padStart(2, '0')}:00`,
    cpu: Math.floor(Math.random() * 40) + 10,
    memory: Math.floor(Math.random() * 30) + 30,
    disk: 30 + Math.floor(Math.random() * 5)
  }));

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Monitor className="h-5 w-5 text-gray-500" />;
    }
  };

  const getOverallHealth = () => {
    const errorCount = services.filter(s => s.status === 'error').length;
    const warningCount = services.filter(s => s.status === 'warning').length;
    
    if (errorCount > 0) return 'error';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Monitor className="mr-3 h-6 w-6" />
          System Health Overview
        </h1>
        <div className="flex items-center space-x-4">
          {getStatusIcon(getOverallHealth())}
          <span className="text-sm text-gray-600">
            Overall Status: <span className="font-medium capitalize">{getOverallHealth()}</span>
          </span>
        </div>
      </div>

      {/* System Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                <Cpu className="mr-2 h-4 w-4" />
                CPU Usage
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.cpu.usage}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.cpu.cores} cores • Load: {metrics.cpu.loadAverage[0].toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                <HardDrive className="mr-2 h-4 w-4" />
                Memory Usage
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.memory.usagePercent}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                <Server className="mr-2 h-4 w-4" />
                Disk Usage
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.disk.usagePercent}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatBytes(metrics.disk.free)} free
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                System Uptime
              </p>
              <p className="text-2xl font-bold text-gray-900">{formatUptime(metrics.uptime)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Since last restart
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">System Performance (24h)</h3>
        <MetricsChart
          data={systemHistoryData}
          lines={[
            { key: 'cpu', label: 'CPU Usage (%)', color: '#3B82F6' },
            { key: 'memory', label: 'Memory Usage (%)', color: '#10B981' },
            { key: 'disk', label: 'Disk Usage (%)', color: '#F59E0B' },
          ]}
          height={300}
        />
      </div>

      {/* Service Health Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Service Health Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <HealthIndicator
              key={service.name}
              service={service.name}
              status={{
                healthy: service.status === 'healthy',
                message: service.message,
                responseTime: service.responseTime,
                lastChecked: service.lastChecked
              }}
              details={service.details}
            />
          ))}
        </div>
      </div>

      {/* Network Statistics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Wifi className="mr-2 h-5 w-5" />
          Network Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatBytes(metrics.network.bytesIn)}
            </div>
            <div className="text-sm text-gray-600">Bytes In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatBytes(metrics.network.bytesOut)}
            </div>
            <div className="text-sm text-gray-600">Bytes Out</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {metrics.network.packetsIn.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Packets In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {metrics.network.packetsOut.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Packets Out</div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">System Alerts</h3>
        {services.filter(s => s.status !== 'healthy').length > 0 ? (
          <div className="space-y-3">
            {services.filter(s => s.status !== 'healthy').map((service) => (
              <div 
                key={service.name}
                className={`p-3 rounded-lg border ${
                  service.status === 'error' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center">
                  {getStatusIcon(service.status)}
                  <div className="ml-3">
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>All systems operating normally</p>
          </div>
        )}
      </div>
    </div>
  );
}