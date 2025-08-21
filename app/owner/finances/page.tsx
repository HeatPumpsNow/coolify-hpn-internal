'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  RefreshCw,
  Target,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LineChart, BarChart, PieChart, AreaChart } from '@/components/charts';

interface FinancialSummary {
  totalRevenue: number;
  revenueGrowth: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  completedJobs: number;
  averageJobValue: number;
  recentRevenue: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  jobsCount: number;
  averageJobValue: number;
}

interface ServiceTypeBreakdown {
  serviceType: string;
  revenue: number;
  jobsCount: number;
  averageValue: number;
}

interface EmployeeRevenue {
  id: string;
  name: string;
  role: string;
  revenue: number;
  jobsCompleted: number;
  averageJobValue: number;
  averageRating?: string;
}

interface ExpenseBreakdown {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
}

interface PendingExpense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
}

interface CashFlow {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export default function FinancesPage() {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [serviceTypeBreakdown, setServiceTypeBreakdown] = useState<ServiceTypeBreakdown[]>([]);
  const [employeeRevenue, setEmployeeRevenue] = useState<EmployeeRevenue[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');
  const [selectedView, setSelectedView] = useState<'overview' | 'revenue' | 'expenses' | 'employees'>('overview');

  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod]);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        period: selectedPeriod,
        comparison: 'previous'
      });

      const response = await fetch(`/api/owner/finances?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setFinancialSummary(data.financialSummary);
        setMonthlyTrend(data.monthlyTrend);
        setServiceTypeBreakdown(data.serviceTypeBreakdown);
        setEmployeeRevenue(data.employeeRevenue);
        setExpenseBreakdown(data.expenseBreakdown);
        setPendingExpenses(data.pendingExpenses);
        setCashFlow(data.cashFlow);
      } else {
        console.error('Failed to fetch financial data');
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'materials': 'bg-blue-100 text-blue-800',
      'payroll': 'bg-green-100 text-green-800',
      'overhead': 'bg-yellow-100 text-yellow-800',
      'marketing': 'bg-purple-100 text-purple-800',
      'equipment': 'bg-red-100 text-red-800',
      'maintenance': 'bg-orange-100 text-orange-800'
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Financial Analytics</h1>
          <button
            onClick={fetchFinancialData}
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
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="12months">Last 12 months</option>
          </select>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setSelectedView('overview')}
          className={`px-4 py-2 text-sm rounded ${selectedView === 'overview' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedView('revenue')}
          className={`px-4 py-2 text-sm rounded ${selectedView === 'revenue' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Revenue
        </button>
        <button
          onClick={() => setSelectedView('expenses')}
          className={`px-4 py-2 text-sm rounded ${selectedView === 'expenses' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Expenses
        </button>
        <button
          onClick={() => setSelectedView('employees')}
          className={`px-4 py-2 text-sm rounded ${selectedView === 'employees' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Employee Performance
        </button>
      </div>

      {/* Financial Summary Cards */}
      {financialSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Revenue"
            value={formatCurrency(financialSummary.totalRevenue)}
            change={formatPercentage(financialSummary.revenueGrowth)}
            changeType={financialSummary.revenueGrowth >= 0 ? 'positive' : 'negative'}
            icon={DollarSign}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <SummaryCard
            title="Total Expenses"
            value={formatCurrency(financialSummary.totalExpenses)}
            change=""
            changeType="neutral"
            icon={CreditCard}
            color="text-red-600"
            bgColor="bg-red-100"
          />
          <SummaryCard
            title="Net Profit"
            value={formatCurrency(financialSummary.netProfit)}
            change={`${financialSummary.profitMargin.toFixed(1)}% margin`}
            changeType={financialSummary.netProfit >= 0 ? 'positive' : 'negative'}
            icon={TrendingUp}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <SummaryCard
            title="Avg Job Value"
            value={formatCurrency(financialSummary.averageJobValue)}
            change={`${financialSummary.completedJobs} jobs`}
            changeType="neutral"
            icon={Target}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
        </div>
      )}

      {/* Pending Expenses Alert */}
      {pendingExpenses.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-orange-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Pending Expense Approvals ({pendingExpenses.length})
            </h3>
            <button className="text-orange-600 hover:text-orange-800 text-sm">
              Review All
            </button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {pendingExpenses.slice(0, 3).map(expense => (
              <div key={expense.id} className="flex items-center justify-between bg-white p-2 rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium">{expense.description}</div>
                  <div className="text-xs text-gray-500">
                    {expense.category} • {new Date(expense.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatCurrency(expense.amount)}</div>
                  <div className="flex space-x-2">
                    <button className="text-green-600 hover:text-green-800 text-xs">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800 text-xs">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Based on Selected View */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            {monthlyTrend.length > 0 ? (
              <LineChart
                data={monthlyTrend.map(item => ({
                  month: item.month,
                  revenue: item.revenue,
                  jobs: item.jobsCount
                }))}
                xKey="month"
                lines={[
                  { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
                  { key: 'jobs', name: 'Jobs Count', color: '#10b981' }
                ]}
                height={280}
                formatXAxis={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                formatTooltip={(value, name) => {
                  if (name === 'Revenue') return [`$${value.toLocaleString()}`, name];
                  return [value.toString(), name];
                }}
              />
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No revenue data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Cash Flow Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cash Flow</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            {cashFlow.length > 0 ? (
              <AreaChart
                data={cashFlow.map(item => ({
                  month: item.month,
                  revenue: item.revenue,
                  expenses: item.expenses,
                  netProfit: item.netProfit
                }))}
                xKey="month"
                areas={[
                  { key: 'revenue', name: 'Revenue', color: '#10b981', fillOpacity: 0.3 },
                  { key: 'expenses', name: 'Expenses', color: '#ef4444', fillOpacity: 0.3 },
                  { key: 'netProfit', name: 'Net Profit', color: '#3b82f6', fillOpacity: 0.4 }
                ]}
                height={280}
                formatXAxis={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              />
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No cash flow data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedView === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Type Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service Type</h3>
            <div className="space-y-3">
              {serviceTypeBreakdown.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{service.serviceType}</div>
                    <div className="text-xs text-gray-500">{service.jobsCount} jobs</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatCurrency(service.revenue)}</div>
                    <div className="text-xs text-gray-500">
                      Avg: {formatCurrency(service.averageValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Revenue Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyTrend.slice(-6).map((month, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Date(month.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(month.revenue)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-right">
                        {month.jobsCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h3>
            <div className="space-y-3">
              {expenseBreakdown.map((expense, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center flex-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(expense.category)} mr-3`}>
                      {expense.category}
                    </span>
                    <div className="text-xs text-gray-500">{expense.transactionCount} transactions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatCurrency(expense.totalAmount)}</div>
                    <div className="text-xs text-gray-500">
                      Avg: {formatCurrency(expense.averageAmount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Breakdown Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            {expenseBreakdown.length > 0 ? (
              <PieChart
                data={expenseBreakdown.map(expense => ({
                  name: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
                  value: expense.totalAmount
                }))}
                height={280}
                colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']}
              />
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <PieChartIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No expense data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedView === 'employees' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Employee Revenue Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jobs Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Job Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employeeRevenue.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{employee.role}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(employee.revenue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{employee.jobsCompleted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatCurrency(employee.averageJobValue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.averageRating ? (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">{employee.averageRating}</span>
                          <span className="text-yellow-400 ml-1">★</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No ratings</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color, 
  bgColor 
}: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: any;
  color: string;
  bgColor: string;
}) {
  const changeColor = changeType === 'positive' ? 'text-green-600' : 
                     changeType === 'negative' ? 'text-red-600' : 'text-gray-600';
  
  const ChangeIcon = changeType === 'positive' ? ArrowUpRight : 
                     changeType === 'negative' ? ArrowDownRight : null;

  return (
    <div className="bg-white p-6 rounded-lg shadow card-hover">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className={`flex items-center mt-1 text-sm ${changeColor}`}>
              {ChangeIcon && <ChangeIcon className="h-4 w-4 mr-1" />}
              <span>{change}</span>
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