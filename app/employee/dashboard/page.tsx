'use client';

import { useAuth } from '@/components/providers/AuthProvider';

export default function EmployeeDashboard() {
  const { user: employee, isLoading } = useAuth();

  // Debug logging
  console.log('[DASHBOARD] Rendering with:', { 
    employee: employee?.email, 
    isLoading,
    hasLocalStorage: typeof window !== 'undefined' ? localStorage.getItem('employee_user') : 'SSR'
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!employee) {
    console.error('[DASHBOARD] No employee found, redirecting to login');
    if (typeof window !== 'undefined') {
      window.location.href = '/employee/login';
    }
    return <div className="p-4">No session found. Redirecting to login...</div>;
  }

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {greeting}, {employee.firstName}!
            </h1>
            <p className="text-gray-600">
              Welcome to your employee dashboard
            </p>
          </div>
          
          {/* Level Badge */}
          <div className="mt-4 sm:mt-0">
            <div className={`level-${employee.role} inline-flex items-center px-4 py-2 text-sm font-semibold`}>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {employee.role}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-compact">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">0</h3>
              <p className="text-sm text-gray-600">Jobs Today</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {0}
              </h3>
              <p className="text-sm text-gray-600">Total Points</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">0h</h3>
              <p className="text-sm text-gray-600">Hours Today</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">0</h3>
              <p className="text-sm text-gray-600">Tasks Complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/employee/timeclock" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Time Clock</h3>
                <p className="text-sm text-green-700 mt-1">Clock in/out and track your hours</p>
              </div>
              <svg className="w-5 h-5 text-green-500 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a href="/employee/photos" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Photo Upload System</h3>
                <p className="text-sm text-blue-700 mt-1">Upload and manage job photos with gamification</p>
              </div>
              <svg className="w-5 h-5 text-blue-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a href="/employee/jobs" className="p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-indigo-900">Job Management</h3>
                <p className="text-sm text-indigo-700 mt-1">View and manage your assigned jobs</p>
              </div>
              <svg className="w-5 h-5 text-indigo-500 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a href="/employee/skills" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-purple-900">Skills Tree</h3>
                <p className="text-sm text-purple-700 mt-1">Track your professional development and unlock new skills</p>
              </div>
              <svg className="w-5 h-5 text-purple-500 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a href="/employee/knowledge" className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">Knowledge Base</h3>
                <p className="text-sm text-yellow-700 mt-1">Access technical guides and propose new articles</p>
              </div>
              <svg className="w-5 h-5 text-yellow-500 group-hover:text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a href="/employee/earnings" className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-900">Earnings Tracking</h3>
                <p className="text-sm text-red-700 mt-1">Monitor your payroll, bonuses, and earnings history</p>
              </div>
              <svg className="w-5 h-5 text-red-500 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a href="/employee/profile" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Profile Management</h3>
                <p className="text-sm text-gray-700 mt-1">Update your personal information and settings</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}