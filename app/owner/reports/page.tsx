'use client';

import { useState, useEffect } from 'react';
import { 
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Star,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Filter,
  Eye
} from 'lucide-react';
import { LineChart, BarChart, PieChart, AreaChart } from '@/components/charts';

interface ReportData {
  businessOverview: {
    totalRevenue: number;
    revenueGrowth: number;
    totalJobs: number;
    jobsGrowth: number;
    activeEmployees: number;
    averageRating: number;
    profitMargin: number;
  };
  monthlyPerformance: {
    month: string;
    revenue: number;
    jobs: number;
    expenses: number;
    profit: number;
  }[];
  employeePerformance: {
    name: string;
    revenue: number;
    jobs: number;
    rating: number;
    efficiency: number;
  }[];
  serviceTypeAnalysis: {
    type: string;
    revenue: number;
    jobs: number;
    margin: number;
  }[];
  customerAnalysis: {
    segment: string;
    count: number;
    value: number;
    retention: number;
  }[];
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');
  const [selectedReport, setSelectedReport] = useState('overview');

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      // Simulate API call with sample data
      setTimeout(() => {
        setReportData({
          businessOverview: {
            totalRevenue: 489750,
            revenueGrowth: 12.5,
            totalJobs: 156,
            jobsGrowth: 8.3,
            activeEmployees: 8,
            averageRating: 4.7,
            profitMargin: 23.8
          },
          monthlyPerformance: [
            { month: '2024-01', revenue: 35000, jobs: 18, expenses: 26000, profit: 9000 },
            { month: '2024-02', revenue: 38000, jobs: 20, expenses: 28000, profit: 10000 },
            { month: '2024-03', revenue: 42000, jobs: 22, expenses: 30000, profit: 12000 },
            { month: '2024-04', revenue: 39000, jobs: 19, expenses: 29000, profit: 10000 },
            { month: '2024-05', revenue: 45000, jobs: 25, expenses: 32000, profit: 13000 },
            { month: '2024-06', revenue: 48000, jobs: 28, expenses: 35000, profit: 13000 },
            { month: '2024-07', revenue: 52000, jobs: 30, expenses: 38000, profit: 14000 },
            { month: '2024-08', revenue: 49000, jobs: 27, expenses: 36000, profit: 13000 },
            { month: '2024-09', revenue: 55000, jobs: 32, expenses: 40000, profit: 15000 },
            { month: '2024-10', revenue: 58000, jobs: 34, expenses: 42000, profit: 16000 },
            { month: '2024-11', revenue: 62000, jobs: 36, expenses: 45000, profit: 17000 },
            { month: '2024-12', revenue: 66750, jobs: 38, expenses: 48000, profit: 18750 }
          ],
          employeePerformance: [
            { name: 'Mike Rodriguez', revenue: 85000, jobs: 32, rating: 4.9, efficiency: 95 },
            { name: 'Sarah Chen', revenue: 78000, jobs: 28, rating: 4.8, efficiency: 92 },
            { name: 'David Kim', revenue: 72000, jobs: 26, rating: 4.7, efficiency: 88 },
            { name: 'Lisa Wang', revenue: 69000, jobs: 24, rating: 4.6, efficiency: 85 },
            { name: 'Tom Johnson', revenue: 65000, jobs: 22, rating: 4.5, efficiency: 82 },
            { name: 'Emily Davis', revenue: 58000, jobs: 20, rating: 4.4, efficiency: 78 },
            { name: 'Alex Brown', revenue: 52000, jobs: 18, rating: 4.3, efficiency: 75 }
          ],
          serviceTypeAnalysis: [
            { type: 'Heat Pump Installation', revenue: 245000, jobs: 42, margin: 28.5 },
            { type: 'HVAC Maintenance', revenue: 125000, jobs: 68, margin: 35.2 },
            { type: 'System Repair', revenue: 89000, jobs: 34, margin: 22.8 },
            { type: 'Ductwork', revenue: 67000, jobs: 18, margin: 31.4 },
            { type: 'Energy Audit', revenue: 32000, jobs: 24, margin: 45.6 }
          ],
          customerAnalysis: [
            { segment: 'New Customers', count: 45, value: 4500, retention: 0 },
            { segment: 'Returning Customers', count: 38, value: 6200, retention: 85 },
            { segment: 'VIP Customers', count: 12, value: 12500, retention: 95 },
            { segment: 'At-Risk Customers', count: 23, value: 2800, retention: 45 }
          ]
        });
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    // Placeholder for export functionality
    alert('Export functionality would be implemented here');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load report data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
          <button
            onClick={fetchReportData}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
            <option value="12months">Last 12 months</option>
            <option value="ytd">Year to date</option>
          </select>
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setSelectedReport('overview')}
          className={`px-4 py-2 text-sm rounded ${selectedReport === 'overview' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedReport('financial')}
          className={`px-4 py-2 text-sm rounded ${selectedReport === 'financial' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Financial
        </button>
        <button
          onClick={() => setSelectedReport('performance')}
          className={`px-4 py-2 text-sm rounded ${selectedReport === 'performance' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Performance
        </button>
        <button
          onClick={() => setSelectedReport('customers')}
          className={`px-4 py-2 text-sm rounded ${selectedReport === 'customers' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Customers
        </button>
      </div>

      {/* Overview Report */}
      {selectedReport === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`$${reportData.businessOverview.totalRevenue.toLocaleString()}`}
              change={reportData.businessOverview.revenueGrowth}
              icon={DollarSign}
              color="text-green-600"
              bgColor="bg-green-100"
            />
            <MetricCard
              title="Jobs Completed"
              value={reportData.businessOverview.totalJobs.toString()}
              change={reportData.businessOverview.jobsGrowth}
              icon={Target}
              color="text-blue-600"
              bgColor="bg-blue-100"
            />
            <MetricCard
              title="Avg Rating"
              value={reportData.businessOverview.averageRating.toString()}
              change={0}
              icon={Star}
              color="text-yellow-600"
              bgColor="bg-yellow-100"
            />
            <MetricCard
              title="Profit Margin"
              value={`${reportData.businessOverview.profitMargin}%`}
              change={0}
              icon={TrendingUp}
              color="text-purple-600"
              bgColor="bg-purple-100"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Profit Trend</h3>
              <AreaChart
                data={reportData.monthlyPerformance}
                xKey="month"
                areas={[
                  { key: 'revenue', name: 'Revenue', color: '#3b82f6', fillOpacity: 0.3 },
                  { key: 'profit', name: 'Profit', color: '#10b981', fillOpacity: 0.4 }
                ]}
                height={300}
                formatXAxis={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
              />
            </div>

            {/* Service Type Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service Type</h3>
              <PieChart
                data={reportData.serviceTypeAnalysis.map(service => ({
                  name: service.type,
                  value: service.revenue
                }))}
                height={300}
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Report */}
      {selectedReport === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly P&L */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly P&L</h3>
              <BarChart
                data={reportData.monthlyPerformance.slice(-6)}
                xKey="month"
                bars={[
                  { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
                  { key: 'expenses', name: 'Expenses', color: '#ef4444' },
                  { key: 'profit', name: 'Profit', color: '#10b981' }
                ]}
                height={300}
                formatXAxis={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
              />
            </div>

            {/* Service Profitability */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Profitability</h3>
              <BarChart
                data={reportData.serviceTypeAnalysis.map(service => ({
                  service: service.type.replace(' ', '\n'),
                  margin: service.margin,
                  revenue: service.revenue / 1000 // Scale for better visualization
                }))}
                xKey="service"
                bars={[
                  { key: 'margin', name: 'Profit Margin %', color: '#8b5cf6' },
                  { key: 'revenue', name: 'Revenue (K)', color: '#06b6d4' }
                ]}
                height={300}
                layout="horizontal"
              />
            </div>
          </div>
        </div>
      )}

      {/* Performance Report */}
      {selectedReport === 'performance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Employee Performance Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jobs Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Efficiency Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.employeePerformance.map((employee, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${employee.revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.jobs}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          {employee.rating}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${employee.efficiency}%` }}
                            ></div>
                          </div>
                          {employee.efficiency}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Report */}
      {selectedReport === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Segments */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
              <PieChart
                data={reportData.customerAnalysis.map(segment => ({
                  name: segment.segment,
                  value: segment.count
                }))}
                height={300}
              />
            </div>

            {/* Customer Value */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Value Analysis</h3>
              <BarChart
                data={reportData.customerAnalysis}
                xKey="segment"
                bars={[
                  { key: 'value', name: 'Avg Value', color: '#3b82f6' },
                  { key: 'retention', name: 'Retention %', color: '#10b981' }
                ]}
                height={300}
                layout="vertical"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  bgColor 
}: {
  title: string;
  value: string;
  change: number;
  icon: any;
  color: string;
  bgColor: string;
}) {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== 0 && (
            <div className="flex items-center mt-2">
              <TrendingUp className={`h-4 w-4 mr-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}