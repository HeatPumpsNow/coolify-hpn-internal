'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Clock, 
  Smartphone, 
  Monitor, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Shield,
  Activity
} from 'lucide-react';

interface UserSession {
  id: string;
  userId: string;
  userEmail: string;
  userType: 'owner' | 'employee' | 'customer';
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress: string;
  location: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  isCurrentSession: boolean;
  riskScore: number;
}

export default function SessionManagement() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    
    // Refresh sessions every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    // Mock session data
    const mockSessions: UserSession[] = [
      {
        id: 'session-1',
        userId: 'user-owner-1',
        userEmail: 'owner@heatpumpsnow.com',
        userType: 'owner',
        deviceName: 'MacBook Pro',
        deviceType: 'desktop',
        ipAddress: '192.168.1.100',
        location: 'Austin, TX',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        lastActivity: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        isCurrentSession: true,
        riskScore: 0.1
      },
      {
        id: 'session-2',
        userId: 'user-emp-1',
        userEmail: 'test.master@heatpumpsnow.com',
        userType: 'employee',
        deviceName: 'iPhone 14',
        deviceType: 'mobile',
        ipAddress: '192.168.1.105',
        location: 'Austin, TX',
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        expiresAt: new Date(Date.now() + 79200000).toISOString(), // 22 hours from now
        lastActivity: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        isCurrentSession: false,
        riskScore: 0.2
      },
      {
        id: 'session-3',
        userId: 'user-emp-2',
        userEmail: 'test.technician@heatpumpsnow.com',
        userType: 'employee',
        deviceName: 'Chrome on Windows',
        deviceType: 'desktop',
        ipAddress: '192.168.1.88',
        location: 'Austin, TX',
        createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        expiresAt: new Date(Date.now() + 84600000).toISOString(), // 23.5 hours from now
        lastActivity: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        isCurrentSession: false,
        riskScore: 0.1
      },
      {
        id: 'session-4',
        userId: 'user-emp-3',
        userEmail: 'test.specialist@heatpumpsnow.com',
        userType: 'employee',
        deviceName: 'Safari on iPad',
        deviceType: 'tablet',
        ipAddress: '192.168.1.92',
        location: 'Austin, TX',
        createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        expiresAt: new Date(Date.now() + 75600000).toISOString(), // 21 hours from now
        lastActivity: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        isCurrentSession: false,
        riskScore: 0.3
      },
      {
        id: 'session-5',
        userId: 'user-emp-4',
        userEmail: 'test.apprentice@heatpumpsnow.com',
        userType: 'employee',
        deviceName: 'Unknown Device',
        deviceType: 'desktop',
        ipAddress: '203.0.113.45',
        location: 'Dallas, TX',
        createdAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        expiresAt: new Date(Date.now() + 72000000).toISOString(), // 20 hours from now
        lastActivity: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        isCurrentSession: false,
        riskScore: 0.7
      }
    ];

    setSessions(mockSessions);
    setLoading(false);
  };

  const terminateSession = async (sessionId: string) => {
    setTerminatingSession(sessionId);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // Show success message (in real app, you'd use a toast library)
      alert('Session terminated successfully');
    } catch (error) {
      alert('Failed to terminate session');
    } finally {
      setTerminatingSession(null);
    }
  };

  const terminateAllSessions = async () => {
    if (!confirm('This will terminate ALL active sessions except your current session. Continue?')) {
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSessions(prev => prev.filter(session => session.isCurrentSession));
      
      alert('All sessions terminated successfully');
    } catch (error) {
      alert('Failed to terminate sessions');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Smartphone className="h-4 w-4 rotate-90" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'employee':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore > 0.6) return 'text-red-600 bg-red-50';
    if (riskScore > 0.3) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatExpiresIn = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = time.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) return 'Expired';
    if (diffHours < 24) return `${diffHours}h left`;
    return `${diffDays}d left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading active sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="mr-3 h-6 w-6" />
          Active Session Management
        </h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{sessions.length}</span> active sessions
          </div>
          <button
            onClick={terminateAllSessions}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Terminate All
          </button>
        </div>
      </div>

      {/* Session Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{sessions.filter(s => s.userType === 'owner').length}</p>
              <p className="text-sm text-gray-600">Owner Sessions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{sessions.filter(s => s.userType === 'employee').length}</p>
              <p className="text-sm text-gray-600">Employee Sessions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{sessions.filter(s => s.riskScore > 0.5).length}</p>
              <p className="text-sm text-gray-600">High Risk</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Smartphone className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{sessions.filter(s => s.deviceType === 'mobile').length}</p>
              <p className="text-sm text-gray-600">Mobile Sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Active Sessions</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device & Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className={session.isCurrentSession ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {session.userEmail}
                        </div>
                        <div className="flex items-center mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${getUserTypeColor(session.userType)}`}>
                            {session.userType}
                          </span>
                          {session.isCurrentSession && (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getDeviceIcon(session.deviceType)}
                      <div className="ml-2">
                        <div className="text-sm text-gray-900">{session.deviceName}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {session.ipAddress} • {session.location}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Active: {formatTimeAgo(session.lastActivity)}
                      </div>
                      <div className="text-gray-500 mt-1">
                        Expires: {formatExpiresIn(session.expiresAt)}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(session.riskScore)}`}>
                      {session.riskScore > 0.6 ? (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {(session.riskScore * 100).toFixed(0)}%
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!session.isCurrentSession && (
                      <button
                        onClick={() => terminateSession(session.id)}
                        disabled={terminatingSession === session.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {terminatingSession === session.id ? (
                          <Activity className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
          <p className="text-gray-600">There are currently no active user sessions.</p>
        </div>
      )}
    </div>
  );
}