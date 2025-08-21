'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface OverviewData {
  total_leads: number;
  qualified_leads: number;
  total_quotes: number;
  accepted_quotes: number;
  pending_quotes: number;
  total_revenue: number;
  pipeline_value: number;
  total_activities: number;
}

interface TrendData {
  month: string;
  leads_count: number;
  quotes_count: number;
  closed_deals: number;
  revenue: number;
}

interface TopRepData {
  first_name: string;
  last_name: string;
  leads_count: number;
  quotes_count: number;
  deals_closed: number;
  revenue: number;
}

interface PipelineStageData {
  stage: string;
  count: number;
  avg_value: number;
  total_value: number;
}

interface ActivityTypeData {
  activity_type: string;
  icon: string;
  color: string;
  count: number;
  avg_duration: number;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'overview' | 'pipeline' | 'activities' | 'performance'>('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Report data states
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [topRepsData, setTopRepsData] = useState<TopRepData[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineStageData[]>([]);
  const [activitiesData, setActivitiesData] = useState<ActivityTypeData[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchReportData();
    }
  }, [reportType, dateFrom, dateTo]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        report_type: reportType,
        date_from: dateFrom,
        date_to: dateTo,
      });

      const response = await fetch(`/api/reports?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        switch (reportType) {
          case 'overview':
            setOverviewData(data.data.overview);
            setTrendsData(data.data.trends);
            setTopRepsData(data.data.top_reps);
            break;
          case 'pipeline':
            setPipelineData(data.data.pipeline_stages);
            break;
          case 'activities':
            setActivitiesData(data.data.activities_by_type);
            break;
          case 'performance':
            setPerformanceData(data.data.performance_metrics);
            break;
        }
      } else {
        setError(data.error?.message || 'Failed to fetch report data');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  const calculateConversionRate = (converted: number, total: number) => {
    return total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';
  };

  const getStageDisplayName = (stage: string) => {
    const stageNames: Record<string, string> = {
      new: 'New Leads',
      contacted: 'Contacted',
      qualified: 'Qualified',
      quoted: 'Quoted',
      closed_won: 'Closed Won',
      closed_lost: 'Closed Lost',
    };
    return stageNames[stage] || stage;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports & Analytics</h1>
          <p className="text-gray-600">Analyze your sales performance and pipeline</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back to Dashboard
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="overview">Overview</option>
                <option value="pipeline">Pipeline Analysis</option>
                <option value="activities">Activities Report</option>
                <option value="performance">Performance Metrics</option>
              </select>
            </div>

            <Input
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <div className="flex items-end">
              <Button onClick={fetchReportData} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Refresh Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Overview Report */}
      {reportType === 'overview' && overviewData && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                      <dd className="text-lg font-medium text-gray-900">{overviewData.total_leads}</dd>
                      <dd className="text-xs text-gray-500">
                        {calculateConversionRate(overviewData.qualified_leads, overviewData.total_leads)}% qualified
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">📄</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Quotes Created</dt>
                      <dd className="text-lg font-medium text-gray-900">{overviewData.total_quotes}</dd>
                      <dd className="text-xs text-gray-500">
                        {calculateConversionRate(overviewData.accepted_quotes, overviewData.total_quotes)}% accepted
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                      <dd className="text-lg font-medium text-gray-900">{formatCurrency(overviewData.total_revenue)}</dd>
                      <dd className="text-xs text-gray-500">From {overviewData.accepted_quotes} deals</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pipeline Value</dt>
                      <dd className="text-lg font-medium text-gray-900">{formatCurrency(overviewData.pipeline_value)}</dd>
                      <dd className="text-xs text-gray-500">{overviewData.pending_quotes} pending quotes</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trends */}
          {trendsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 text-sm font-medium text-gray-900">Month</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-900">Leads</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-900">Quotes</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-900">Deals</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-900">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {trendsData.map((trend, index) => (
                        <tr key={index}>
                          <td className="py-3 text-sm text-gray-900">{formatDate(trend.month)}</td>
                          <td className="py-3 text-center text-sm text-gray-900">{trend.leads_count}</td>
                          <td className="py-3 text-center text-sm text-gray-900">{trend.quotes_count}</td>
                          <td className="py-3 text-center text-sm text-gray-900">{trend.closed_deals}</td>
                          <td className="py-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(trend.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Performers */}
          {topRepsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Sales Reps (Last 3 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topRepsData.map((rep, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{rep.first_name} {rep.last_name}</h4>
                          <p className="text-sm text-gray-600">
                            {rep.leads_count} leads • {rep.quotes_count} quotes • {rep.deals_closed} deals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(rep.revenue)}</div>
                        <div className="text-sm text-gray-500">
                          {rep.deals_closed > 0 ? calculateConversionRate(rep.deals_closed, rep.quotes_count) : '0'}% close rate
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pipeline Report */}
      {reportType === 'pipeline' && pipelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Analysis by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pipelineData.map((stage, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{getStageDisplayName(stage.stage)}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Count:</span>
                      <span className="text-sm font-medium">{stage.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Value:</span>
                      <span className="text-sm font-medium">{formatCurrency(stage.avg_value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Value:</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(stage.total_value)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities Report */}
      {reportType === 'activities' && activitiesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activities Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activitiesData.map((activity, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">
                      {activity.icon === 'phone' && '📞'}
                      {activity.icon === 'mail' && '📧'}
                      {activity.icon === 'users' && '👥'}
                      {activity.icon === 'map-pin' && '📍'}
                      {activity.icon === 'file-text' && '📄'}
                      {activity.icon === 'clock' && '⏰'}
                      {activity.icon === 'edit' && '✍️'}
                      {activity.icon === 'calendar' && '📅'}
                      {activity.icon === 'help-circle' && '❓'}
                      {activity.icon === 'share' && '🔗'}
                    </span>
                    <h3 className="font-medium text-gray-900 capitalize">
                      {activity.activity_type.replace('_', ' ')}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Count:</span>
                      <span className="text-sm font-medium">{activity.count}</span>
                    </div>
                    {activity.avg_duration && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Duration:</span>
                        <span className="text-sm font-medium">{Math.round(activity.avg_duration)}min</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Report */}
      {reportType === 'performance' && performanceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activities Completed:</span>
                  <span className="font-medium">{performanceData.activities_completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Duration:</span>
                  <span className="font-medium">{Math.round(performanceData.avg_activity_duration)}min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Deals Closed:</span>
                  <span className="font-medium">{performanceData.deals_closed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Deal Size:</span>
                  <span className="font-medium">{formatCurrency(performanceData.avg_deal_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Revenue:</span>
                  <span className="font-medium text-green-600">{formatCurrency(performanceData.revenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Times</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Days to Quote:</span>
                  <span className="font-medium">
                    {performanceData.avg_days_to_quote ? Math.round(performanceData.avg_days_to_quote) : 0} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Days to Close:</span>
                  <span className="font-medium">
                    {performanceData.avg_days_to_close ? Math.round(performanceData.avg_days_to_close) : 0} days
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading report data...</p>
        </div>
      )}
    </div>
  );
}