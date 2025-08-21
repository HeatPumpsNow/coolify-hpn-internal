'use client';

import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  MapPin
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: {
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    location?: string;
    userAgent?: string;
  };
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  maxItems?: number;
}

export default function ActivityFeed({ events = [], maxItems = 50 }: ActivityFeedProps) {
  const getEventIcon = (type: string, severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Shield className="h-4 w-4 text-blue-500" />;
    }
  };

  const getEventBgColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-100';
      case 'success':
        return 'bg-green-50 border-green-100';
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Mock data if no events provided
  const mockEvents: ActivityEvent[] = [
    {
      id: '1',
      type: 'login_success',
      message: 'Successful login from new device',
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      severity: 'success',
      metadata: {
        userEmail: 'sarah.martinez@heatpumpsnow.com',
        ipAddress: '192.168.1.105',
        location: 'Austin, TX'
      }
    },
    {
      id: '2',
      type: 'failed_login',
      message: 'Failed login attempt - invalid password',
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
      severity: 'warning',
      metadata: {
        userEmail: 'unknown@example.com',
        ipAddress: '203.0.113.45',
        location: 'Unknown'
      }
    },
    {
      id: '3',
      type: 'rate_limit',
      message: 'Rate limit triggered for IP address',
      timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      severity: 'error',
      metadata: {
        ipAddress: '198.51.100.123',
        location: 'Dallas, TX'
      }
    },
    {
      id: '4',
      type: 'session_created',
      message: 'New session created',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      severity: 'info',
      metadata: {
        userEmail: 'test.master@heatpumpsnow.com',
        ipAddress: '192.168.1.88'
      }
    }
  ];

  const displayEvents = events.length > 0 ? events : mockEvents;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Recent Security Events</h3>
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          Live feed
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto space-y-2">
        {displayEvents.slice(0, maxItems).map((event) => (
          <div
            key={event.id}
            className={`p-3 rounded-lg border ${getEventBgColor(event.severity)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getEventIcon(event.type, event.severity)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {event.message}
                  </p>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                
                {event.metadata && (
                  <div className="mt-2 space-y-1">
                    {event.metadata.userEmail && (
                      <div className="flex items-center text-xs text-gray-600">
                        <User className="h-3 w-3 mr-1" />
                        {event.metadata.userEmail}
                      </div>
                    )}
                    {event.metadata.ipAddress && (
                      <div className="flex items-center text-xs text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.metadata.ipAddress}
                        {event.metadata.location && ` • ${event.metadata.location}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {displayEvents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No recent security events</p>
        </div>
      )}
    </div>
  );
}