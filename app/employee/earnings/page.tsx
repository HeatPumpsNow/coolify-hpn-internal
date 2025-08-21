'use client';

import { useEffect, useState } from 'react';

interface PayrollEntry {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  regularHours: number;
  overtimeHours: number;
  regularRate: number;
  overtimeRate: number;
  grossPay: number;
  netPay: number;
  deductions: {
    federal: number;
    state: number;
    fica: number;
    medicare: number;
    health: number;
    dental: number;
    retirement: number;
  };
  bonuses: {
    description: string;
    amount: number;
  }[];
  jobCount: number;
  photoCount: number;
}

interface EarningsSummary {
  ytdGross: number;
  ytdNet: number;
  ytdTax: number;
  avgHoursPerWeek: number;
  totalJobsCompleted: number;
  totalBonuses: number;
  currentPayPeriod: {
    hoursWorked: number;
    estimatedGross: number;
    jobsCompleted: number;
  };
}

export default function EarningsPage() {
  const [employee, setEmployee] = useState<any | null>(null);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      // Load employee session
      const sessionResponse = await fetch('/api/employee/auth/session');
      const sessionData = await sessionResponse.json();
      setEmployee(sessionData.employee);

      // Load earnings data
      const earningsResponse = await fetch(`/api/employee/earnings?year=${selectedYear}`);
      const earningsData = await earningsResponse.json();
      
      setPayrollEntries(earningsData.payrollEntries || []);
      setSummary(earningsData.summary || null);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings & Payroll</h1>
          <p className="text-gray-600">
            Track your earnings, bonuses, and payroll history.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {[2024, 2023, 2022].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'summary' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'detailed' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Year-to-Date Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(summary.ytdGross)}</h3>
                <p className="text-sm text-gray-600">YTD Gross</p>
              </div>
            </div>
          </div>

          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(summary.ytdNet)}</h3>
                <p className="text-sm text-gray-600">YTD Net</p>
              </div>
            </div>
          </div>

          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{summary.avgHoursPerWeek.toFixed(1)}</h3>
                <p className="text-sm text-gray-600">Avg Hours/Week</p>
              </div>
            </div>
          </div>

          <div className="card-compact">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{summary.totalJobsCompleted}</h3>
                <p className="text-sm text-gray-600">Jobs Completed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Pay Period */}
      {summary?.currentPayPeriod && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Pay Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="text-2xl font-bold text-blue-900">
                {summary.currentPayPeriod.hoursWorked}
              </h3>
              <p className="text-blue-700">Hours Worked</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h3 className="text-2xl font-bold text-green-900">
                {formatCurrency(summary.currentPayPeriod.estimatedGross)}
              </h3>
              <p className="text-green-700">Estimated Gross</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h3 className="text-2xl font-bold text-purple-900">
                {summary.currentPayPeriod.jobsCompleted}
              </h3>
              <p className="text-purple-700">Jobs Completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Payroll History */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Payroll History - {selectedYear}</h2>
        
        {payrollEntries.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll records</h3>
            <p className="text-gray-600">No payroll data available for {selectedYear}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {payrollEntries.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pay Period: {formatDate(entry.payPeriodStart)} - {formatDate(entry.payPeriodEnd)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Pay Date: {formatDate(entry.payDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(entry.netPay)}
                      </p>
                      <p className="text-sm text-gray-600">Net Pay</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {viewMode === 'summary' ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Hours</h4>
                        <p>Regular: {entry.regularHours}</p>
                        <p>Overtime: {entry.overtimeHours}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Gross Pay</h4>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(entry.grossPay)}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Performance</h4>
                        <p>Jobs: {entry.jobCount}</p>
                        <p>Photos: {entry.photoCount}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Bonuses</h4>
                        {entry.bonuses.length > 0 ? (
                          entry.bonuses.map((bonus, index) => (
                            <p key={index} className="text-green-600">
                              +{formatCurrency(bonus.amount)}
                            </p>
                          ))
                        ) : (
                          <p className="text-gray-500">None</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Earnings</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Regular Hours ({entry.regularHours}h @ {formatCurrency(entry.regularRate)}/h)</span>
                            <span>{formatCurrency(entry.regularHours * entry.regularRate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overtime Hours ({entry.overtimeHours}h @ {formatCurrency(entry.overtimeRate)}/h)</span>
                            <span>{formatCurrency(entry.overtimeHours * entry.overtimeRate)}</span>
                          </div>
                          {entry.bonuses.map((bonus, index) => (
                            <div key={index} className="flex justify-between text-green-600">
                              <span>{bonus.description}</span>
                              <span>+{formatCurrency(bonus.amount)}</span>
                            </div>
                          ))}
                          <div className="border-t pt-2 flex justify-between font-semibold">
                            <span>Gross Pay</span>
                            <span>{formatCurrency(entry.grossPay)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Deductions</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Federal Tax</span>
                            <span>-{formatCurrency(entry.deductions.federal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>State Tax</span>
                            <span>-{formatCurrency(entry.deductions.state)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>FICA</span>
                            <span>-{formatCurrency(entry.deductions.fica)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Medicare</span>
                            <span>-{formatCurrency(entry.deductions.medicare)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Health Insurance</span>
                            <span>-{formatCurrency(entry.deductions.health)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dental Insurance</span>
                            <span>-{formatCurrency(entry.deductions.dental)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>401(k) Contribution</span>
                            <span>-{formatCurrency(entry.deductions.retirement)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-semibold text-green-600">
                            <span>Net Pay</span>
                            <span>{formatCurrency(entry.netPay)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}