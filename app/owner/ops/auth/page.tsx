'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import MetricsChart from '../components/MetricsChart';
import ActivityFeed from '../components/ActivityFeed';
import { 
  Shield, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  MapPin
} from 'lucide-react';

interface TokenMetrics {
  avgSigningTime: number;
  p95SigningTime: number;
  p99SigningTime: number;
  tokensPerSecond: number;
}

interface PasswordMetrics {
  avgHashTime: number;
  hashesPerSecond: number;
}

interface RateLimitEntry {
  key: string;
  identifier: string;
  points: number;
  maxPoints: number;
  resetIn: number;
}

export default function AuthMonitoring() {
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics>({
    avgSigningTime: 12,
    p95SigningTime: 18,
    p99SigningTime: 25,
    tokensPerSecond: 45
  });

  const [passwordMetrics, setPasswordMetrics] = useState<PasswordMetrics>({
    avgHashTime: 180,
    hashesPerSecond: 5.5
  });

  const [rateLimitedEntries, setRateLimitedEntries] = useState<RateLimitEntry[]>([
    {
      key: 'ip:203.0.113.45',
      identifier: '203.0.113.45',
      points: 8,
      maxPoints: 10,
      resetIn: 845
    },
    {
      key: 'user:failed@example.com',
      identifier: 'failed@example.com',
      points: 5,
      maxPoints: 5,
      resetIn: 1200
    }
  ]);

  // Mock session distribution data
  const sessionDistribution = [
    { label: 'Owner Portal', value: 3, color: '#3B82F6' },
    { label: 'Employee Portal', value: 18, color: '#10B981' },
    { label: 'Service Portal', value: 5, color: '#F59E0B' }
  ];

  // Mock failed login coordinates (for demo)
  const failedLoginCoordinates = [
    { lat: 30.2672, lng: -97.7431, count: 15, city: 'Austin, TX' },
    { lat: 32.7767, lng: -96.7970, count: 8, city: 'Dallas, TX' },
    { lat: 29.7604, lng: -95.3698, count: 12, city: 'Houston, TX' }
  ];

  const topFailedIPs = [
    { address: '203.0.113.45', attempts: 15, lastAttempt: '2 minutes ago' },
    { address: '198.51.100.123', attempts: 8, lastAttempt: '5 minutes ago' },
    { address: '192.0.2.88', attempts: 6, lastAttempt: '12 minutes ago' }
  ];

  // Mock JWT performance data
  const tokenGenMetrics = Array.from({ length: 24 }, (_, i) => ({
    timestamp: `${String(i).padStart(2, '0')}:00`,
    signing: Math.floor(Math.random() * 10) + 8,
    total: Math.floor(Math.random() * 15) + 12
  }));

  const clearRateLimit = async (key: string) => {
    setRateLimitedEntries(prev => prev.filter(entry => entry.key !== key));
    // In real implementation, make API call here
    console.log(`Cleared rate limit for ${key}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="mr-3 h-6 w-6" />
          Authentication System Monitor
        </h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Real-time monitoring</span>
        </div>
      </div>

      {/* JWT Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Token Generation Performance
        </h3>
        <MetricsChart
          data={tokenGenMetrics}
          lines={[
            { key: 'signing', label: 'JWT Signing (ms)', color: '#3B82F6' },
            { key: 'total', label: 'Total Time (ms)', color: '#10B981' },
          ]}
          height={250}
        />
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{tokenMetrics.avgSigningTime}ms</div>
            <div className="text-gray-600">Average</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{tokenMetrics.p95SigningTime}ms</div>
            <div className="text-gray-600">95th Percentile</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{tokenMetrics.p99SigningTime}ms</div>
            <div className="text-gray-600">99th Percentile</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{tokenMetrics.tokensPerSecond}</div>
            <div className="text-gray-600">Tokens/sec</div>
          </div>
        </div>
      </div>

      {/* Password Hashing Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Bcrypt Performance (12 rounds)</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{passwordMetrics.avgHashTime}ms</div>
            <div className="text-gray-600 mb-4">Average hash time</div>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              Processing <span className="font-semibold">{passwordMetrics.hashesPerSecond}</span> hashes/second
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Session Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sessionDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ label, value }) => `${label}: ${value}`}
              >
                {sessionDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rate Limiter Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
          Rate Limiter Activity
        </h3>
        {rateLimitedEntries.length > 0 ? (
          <div className="space-y-3">
            {rateLimitedEntries.map(entry => (
              <div key={entry.key} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="font-medium text-red-900">{entry.identifier}</div>
                    <div className="text-sm text-red-700">
                      {entry.points}/{entry.maxPoints} attempts • Resets in {Math.floor(entry.resetIn / 60)}:{String(entry.resetIn % 60).padStart(2, '0')}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => clearRateLimit(entry.key)}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No active rate limits</p>
          </div>
        )}
      </div>

      {/* Failed Login Analysis */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Failed Login Analysis</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Geographic Distribution */}
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              Geographic Distribution
            </h4>
            <div className="space-y-2">
              {failedLoginCoordinates.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{location.city}</span>
                  <span className="text-sm font-medium text-red-600">{location.count} attempts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Failed IPs */}
          <div>
            <h4 className="font-medium mb-3">Top Failed IP Addresses</h4>
            <div className="space-y-2">
              {topFailedIPs.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="text-sm font-mono">{ip.address}</div>
                    <div className="text-xs text-gray-500">{ip.lastAttempt}</div>
                  </div>
                  <span className="text-sm font-medium text-red-600">{ip.attempts} attempts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white p-6 rounded-lg shadow">
        <ActivityFeed events={[]} />
      </div>
    </div>
  );
}