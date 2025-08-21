'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { LineChart, BarChart } from '@/components/charts';

interface DashboardData {
  kpis: {
    totalRevenue: number;
    revenueChange: number;
    activeEmployees: number;
    employeeChange: number;
    jobsCompleted: number;
    jobsChange: number;
    customerSatisfaction: number;
    satisfactionChange: number;
  };
  recentJobs: {
    id: string;
    customerName: string;
    employeeName: string;
    status: string;
    value: number;
    date: string;
  }[];
  topEmployees: {
    id: string;
    name: string;
    jobsCompleted: number;
    revenue: number;
    rating: number;
  }[];
  pendingApprovals: {
    photos: number;
    jobs: number;
    expenses: number;
  };
}

export default function OwnerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data for now - in real implementation, this would call APIs
      setTimeout(() => {
        setData({
          kpis: {
            totalRevenue: 89750,
            revenueChange: 12.5,
            activeEmployees: 8,
            employeeChange: 0,
            jobsCompleted: 34,
            jobsChange: 8.2,
            customerSatisfaction: 4.8,
            satisfactionChange: 2.1
          },
          recentJobs: [
            {
              id: '1',
              customerName: 'Johnson Family',
              employeeName: 'Mike Rodriguez',
              status: 'completed',
              value: 4500,
              date: '2024-01-30'
            },
            {
              id: '2',
              customerName: 'Smith Residence',
              employeeName: 'Sarah Chen',
              status: 'in-progress',
              value: 3200,
              date: '2024-01-30'
            },
            {
              id: '3',
              customerName: 'Brown House',
              employeeName: 'David Kim',
              status: 'scheduled',
              value: 5800,
              date: '2024-01-31'
            }
          ],
          topEmployees: [
            {
              id: '1',
              name: 'Mike Rodriguez',
              jobsCompleted: 12,
              revenue: 28500,
              rating: 4.9
            },
            {
              id: '2',
              name: 'Sarah Chen',
              jobsCompleted: 10,
              revenue: 24200,
              rating: 4.8
            },
            {
              id: '3',
              name: 'David Kim',
              jobsCompleted: 8,
              revenue: 19800,
              rating: 4.7
            }
          ],
          pendingApprovals: {
            photos: 7,
            jobs: 3,
            expenses: 2
          }
        });
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`$${data.kpis.totalRevenue.toLocaleString()}`}
          change={data.kpis.revenueChange}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <KPICard
          title="Active Employees"
          value={data.kpis.activeEmployees.toString()}
          change={data.kpis.employeeChange}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <KPICard
          title="Jobs Completed"
          value={data.kpis.jobsCompleted.toString()}
          change={data.kpis.jobsChange}
          icon={CheckCircle}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <KPICard
          title="Customer Rating"
          value={`${data.kpis.customerSatisfaction}/5.0`}
          change={data.kpis.satisfactionChange}
          icon={TrendingUp}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      {/* Performance Overview Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Business Performance Overview</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <LineChart
          data={[
            { month: '2024-07', revenue: 45000, jobs: 28, employees: 6 },
            { month: '2024-08', revenue: 52000, jobs: 32, employees: 7 },
            { month: '2024-09', revenue: 48000, jobs: 30, employees: 7 },
            { month: '2024-10', revenue: 58000, jobs: 35, employees: 8 },
            { month: '2024-11', revenue: 65000, jobs: 38, employees: 8 },
            { month: '2024-12', revenue: data.kpis.totalRevenue, jobs: data.kpis.jobsCompleted, employees: data.kpis.activeEmployees }
          ]}
          xKey="month"
          lines={[
            { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
            { key: 'jobs', name: 'Jobs Completed', color: '#10b981' }
          ]}
          height={250}
          formatXAxis={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
          formatTooltip={(value, name) => {
            if (name === 'Revenue') return [`$${value.toLocaleString()}`, name];
            return [value.toString(), name];
          }}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{job.customerName}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Assigned to: {job.employeeName}</p>
                    <p className="text-sm text-gray-500">{new Date(job.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900">${job.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <Camera className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Photo Reviews</span>
                </div>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                  {data.pendingApprovals.photos}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Job Approvals</span>
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  {data.pendingApprovals.jobs}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Expenses</span>
                </div>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {data.pendingApprovals.expenses}
                </span>
              </div>
            </div>
          </div>

          {/* Top Employees */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {data.topEmployees.map((employee, index) => (
                  <div key={employee.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{employee.name}</p>
                      <p className="text-xs text-gray-500">
                        {employee.jobsCompleted} jobs • ${employee.revenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs font-medium text-green-600">{employee.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickActionButton
              href="/owner/jobs"
              icon={Calendar}
              title="Schedule Job"
              description="Create new job assignment"
            />
            <QuickActionButton
              href="/owner/employees"
              icon={Users}
              title="Manage Team"
              description="View employee performance"
            />
            <QuickActionButton
              href="/owner/photos"
              icon={Camera}
              title="Review Photos"
              description="Approve job photos"
            />
            <QuickActionButton
              href="/owner/reports"
              icon={TrendingUp}
              title="View Reports"
              description="Business analytics"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ 
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
          <div className="flex items-center mt-2">
            <TrendingUp className={`h-4 w-4 mr-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// Quick Action Button Component
function QuickActionButton({ 
  href, 
  icon: Icon, 
  title, 
  description 
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </a>
  );
}

// Helper function for status colors
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800';
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}