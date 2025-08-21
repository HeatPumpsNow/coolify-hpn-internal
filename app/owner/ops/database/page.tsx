'use client';

import { useState, useEffect } from 'react';
import { Database, Activity, AlertTriangle, CheckCircle, Play } from 'lucide-react';

interface ConnectionStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

interface SlowQuery {
  query: string;
  calls: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
}

interface TableStats {
  name: string;
  rows: number;
  size: number;
  indexHitRate: number;
  seqScans: number;
}

interface StatProps {
  label: string;
  value: number;
  status?: 'normal' | 'warning' | 'error';
}

function Stat({ label, value, status = 'normal' }: StatProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-900';
    }
  };

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${getStatusColor()}`}>
        {value}
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

export default function DatabaseMonitor() {
  const [connections, setConnections] = useState<ConnectionStats>({
    total: 20,
    active: 8,
    idle: 12,
    waiting: 0
  });

  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([
    {
      query: 'SELECT sr.*, c.first_name, c.last_name FROM service_requests sr JOIN customers c ON sr.customer_id = c.id WHERE sr.status = $1',
      calls: 1247,
      totalTime: 12450,
      avgTime: 9.9,
      maxTime: 156
    },
    {
      query: 'SELECT * FROM employees WHERE email = $1 AND active = true',
      calls: 2890,
      totalTime: 8934,
      avgTime: 3.1,
      maxTime: 45
    },
    {
      query: 'INSERT INTO auth_events (user_id, event_type, ip_address, created_at) VALUES ($1, $2, $3, $4)',
      calls: 15670,
      totalTime: 47010,
      avgTime: 3.0,
      maxTime: 89
    },
    {
      query: 'UPDATE user_sessions SET last_activity = $1 WHERE id = $2',
      calls: 8934,
      totalTime: 26802,
      avgTime: 3.0,
      maxTime: 67
    }
  ]);

  const [tableStats, setTableStats] = useState<TableStats[]>([
    {
      name: 'service_requests',
      rows: 15420,
      size: 5242880, // 5MB
      indexHitRate: 96.8,
      seqScans: 234
    },
    {
      name: 'employees',
      rows: 128,
      size: 32768, // 32KB
      indexHitRate: 99.2,
      seqScans: 12
    },
    {
      name: 'customers',
      rows: 8934,
      size: 2097152, // 2MB
      indexHitRate: 98.1,
      seqScans: 89
    },
    {
      name: 'user_sessions',
      rows: 2456,
      size: 1048576, // 1MB
      indexHitRate: 94.5,
      seqScans: 156
    },
    {
      name: 'auth_events',
      rows: 45621,
      size: 15728640, // 15MB
      indexHitRate: 92.3,
      seqScans: 445
    }
  ]);

  const [query, setQuery] = useState('SELECT COUNT(*) as total_users FROM employees WHERE active = true;');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const formatQuery = (queryText: string) => {
    return queryText.length > 80 ? queryText.substring(0, 80) + '...' : queryText;
  };

  const runQuery = async () => {
    setQueryLoading(true);
    setQueryResult(null);
    
    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock result based on query content
      if (query.toLowerCase().includes('count')) {
        setQueryResult({
          rows: [{ total_users: 8 }],
          rowCount: 1,
          executionTime: 12.5
        });
      } else if (query.toLowerCase().includes('select')) {
        setQueryResult({
          rows: [
            { id: 1, email: 'test@example.com', active: true },
            { id: 2, email: 'user@example.com', active: true }
          ],
          rowCount: 2,
          executionTime: 8.3
        });
      } else {
        setQueryResult({
          message: 'Query executed successfully',
          rowsAffected: 1,
          executionTime: 15.2
        });
      }
    } catch (error) {
      setQueryResult({
        error: 'Query execution failed',
        message: 'This is a read-only query analyzer for demonstration'
      });
    } finally {
      setQueryLoading(false);
    }
  };

  const explainQuery = async () => {
    setQueryLoading(true);
    setQueryResult(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setQueryResult({
        plan: [
          'Seq Scan on employees  (cost=0.00..2.28 rows=4 width=127)',
          '  Filter: active = true',
          'Planning Time: 0.234 ms',
          'Execution Time: 0.456 ms'
        ],
        explanation: 'Sequential scan with filter - consider adding index on active column'
      });
    } catch (error) {
      setQueryResult({
        error: 'Query explain failed'
      });
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Database className="mr-3 h-6 w-6" />
          Database Performance Monitor
        </h1>
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-sm text-gray-600">Connected to heat_pumps_now</span>
        </div>
      </div>

      {/* Connection Pool Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          Connection Pool Status
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <Stat label="Total Connections" value={connections.total} />
          <Stat 
            label="Active" 
            value={connections.active} 
            status={connections.active > 15 ? 'warning' : 'normal'} 
          />
          <Stat label="Idle" value={connections.idle} />
          <Stat 
            label="Waiting" 
            value={connections.waiting} 
            status={connections.waiting > 0 ? 'error' : 'normal'} 
          />
        </div>
        
        {connections.waiting > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-red-700">
                {connections.waiting} queries are waiting for available connections
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Slow Queries */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Slowest Queries (Last Hour)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Query</th>
                <th className="text-right py-2 px-3">Calls</th>
                <th className="text-right py-2 px-3">Total Time</th>
                <th className="text-right py-2 px-3">Avg Time</th>
                <th className="text-right py-2 px-3">Max Time</th>
              </tr>
            </thead>
            <tbody>
              {slowQueries.map((query, i) => (
                <tr 
                  key={i} 
                  className={`border-b ${query.avgTime > 100 ? 'bg-red-50' : query.avgTime > 50 ? 'bg-yellow-50' : ''}`}
                >
                  <td className="py-3 px-3">
                    <div className="font-mono text-xs text-gray-700 max-w-md">
                      {formatQuery(query.query)}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3">{formatNumber(query.calls)}</td>
                  <td className="text-right py-3 px-3">{query.totalTime.toFixed(1)}ms</td>
                  <td className={`text-right py-3 px-3 ${
                    query.avgTime > 100 ? 'text-red-600 font-semibold' : 
                    query.avgTime > 50 ? 'text-yellow-600 font-semibold' : ''
                  }`}>
                    {query.avgTime.toFixed(1)}ms
                  </td>
                  <td className="text-right py-3 px-3">{query.maxTime}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Statistics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Table Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Table</th>
                <th className="text-right py-2 px-3">Rows</th>
                <th className="text-right py-2 px-3">Size</th>
                <th className="text-right py-2 px-3">Index Hit Rate</th>
                <th className="text-right py-2 px-3">Sequential Scans</th>
              </tr>
            </thead>
            <tbody>
              {tableStats.map(table => (
                <tr key={table.name} className="border-b">
                  <td className="py-3 px-3 font-medium">{table.name}</td>
                  <td className="text-right py-3 px-3">{formatNumber(table.rows)}</td>
                  <td className="text-right py-3 px-3">{formatBytes(table.size)}</td>
                  <td className={`text-right py-3 px-3 ${
                    table.indexHitRate < 90 ? 'text-red-500 font-semibold' : 
                    table.indexHitRate < 95 ? 'text-yellow-500 font-semibold' : 
                    'text-green-500'
                  }`}>
                    {table.indexHitRate.toFixed(1)}%
                  </td>
                  <td className={`text-right py-3 px-3 ${
                    table.seqScans > 1000 ? 'text-red-500 font-semibold' : 
                    table.seqScans > 500 ? 'text-yellow-500' : ''
                  }`}>
                    {formatNumber(table.seqScans)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Query Runner */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Query Analyzer (Read-Only)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SQL Query
            </label>
            <textarea
              className="w-full h-32 font-mono text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="SELECT * FROM employees WHERE active = true LIMIT 10;"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={runQuery}
              disabled={queryLoading || !query.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {queryLoading ? (
                <Activity className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute
            </button>
            <button 
              onClick={explainQuery}
              disabled={queryLoading || !query.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Explain Plan
            </button>
          </div>

          {queryResult && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h4 className="font-medium flex items-center">
                  {queryResult.error ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      Query Error
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Query Result
                    </>
                  )}
                </h4>
                {queryResult.executionTime && (
                  <p className="text-sm text-gray-600">
                    Execution time: {queryResult.executionTime}ms
                  </p>
                )}
              </div>
              <div className="p-4">
                {queryResult.error ? (
                  <div className="text-red-600">
                    <p className="font-medium">{queryResult.error}</p>
                    {queryResult.message && <p className="text-sm mt-1">{queryResult.message}</p>}
                  </div>
                ) : (
                  <div className="overflow-auto max-h-64">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {queryResult.plan 
                        ? queryResult.plan.join('\n') + '\n\n' + (queryResult.explanation || '')
                        : JSON.stringify(queryResult, null, 2)
                      }
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}