'use client';

import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface HealthStatus {
  healthy: boolean;
  message?: string;
  responseTime?: number;
  lastChecked?: string;
}

interface HealthIndicatorProps {
  service: string;
  status: HealthStatus;
  details?: Record<string, any>;
  size?: 'sm' | 'md' | 'lg';
}

export default function HealthIndicator({ 
  service, 
  status, 
  details, 
  size = 'md' 
}: HealthIndicatorProps) {
  const getStatusIcon = () => {
    if (!status.healthy) {
      return <XCircle className={`${getSizeClass()} text-red-500`} />;
    }
    
    if (status.responseTime && status.responseTime > 1000) {
      return <AlertTriangle className={`${getSizeClass()} text-yellow-500`} />;
    }
    
    return <CheckCircle className={`${getSizeClass()} text-green-500`} />;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'lg': return 'h-6 w-6';
      default: return 'h-5 w-5';
    }
  };

  const getStatusColor = () => {
    if (!status.healthy) return 'text-red-600 bg-red-50 border-red-200';
    if (status.responseTime && status.responseTime > 1000) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusText = () => {
    if (!status.healthy) return 'Unhealthy';
    if (status.responseTime && status.responseTime > 1000) return 'Slow';
    return 'Healthy';
  };

  const formatValue = (key: string, value: any) => {
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('time') || key.toLowerCase().includes('ms')) {
        return `${value}ms`;
      }
      if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percent')) {
        return `${value}%`;
      }
      if (key.toLowerCase().includes('byte') || key.toLowerCase().includes('memory')) {
        return formatBytes(value);
      }
      return value.toLocaleString();
    }
    return value;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {getStatusIcon()}
          <h4 className={`ml-2 font-medium ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
            {service}
          </h4>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          status.healthy 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {status.message && (
        <p className="text-sm mb-2">{status.message}</p>
      )}

      {status.responseTime && (
        <div className="flex items-center text-xs mb-2">
          <Clock className="h-3 w-3 mr-1" />
          Response time: {status.responseTime}ms
        </div>
      )}

      {details && (
        <div className="mt-3 space-y-1">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-gray-600">{key}:</span>
              <span className="font-mono">{formatValue(key, value)}</span>
            </div>
          ))}
        </div>
      )}

      {status.lastChecked && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}