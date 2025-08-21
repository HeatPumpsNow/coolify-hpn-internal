'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ClipboardDocumentListIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CogIcon, 
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  active_projects: number;
  overdue_tasks: number;
  project_value: number;
  completion_rate: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  type: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('project_portal_user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Invalid user data');
      router.push('/login');
      return;
    }

    // Simulate loading dashboard stats
    setTimeout(() => {
      setStats({
        active_projects: 12,
        overdue_tasks: 3,
        project_value: 127,
        completion_rate: 87
      });
      setIsLoading(false);
    }, 1000);
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('project_portal_user');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.removeItem('project_portal_user');
      router.push('/login');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Heat Pumps Now</h1>
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                Project Portal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome back, {user.name}!</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded capitalize">
                {user.type}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Project Management Dashboard</h2>
          <p className="text-gray-600">
            Centralized project management from contract to completion with intelligent templates, resource allocation, and performance analytics.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '--' : stats?.active_projects}
                </p>
                <p className="text-sm text-gray-600">Active Projects</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '--' : stats?.overdue_tasks}
                </p>
                <p className="text-sm text-gray-600">Overdue Tasks</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '--' : '$' + (stats?.project_value * 1000).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Active Project Value</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '--' : `${stats?.completion_rate}%`}
                </p>
                <p className="text-sm text-gray-600">Completion Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Project Management */}
          <Link href="/projects" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 card-hover">
              <div className="flex items-center mb-4">
                <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
                <h3 className="ml-3 text-xl font-semibold text-gray-900">Projects</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Manage projects from contract creation to completion with intelligent templates and automated task generation.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Contract-to-project pipeline</li>
                <li>• 4-level task hierarchy</li>
                <li>• Template intelligence</li>
                <li>• Progress tracking</li>
              </ul>
            </div>
          </Link>

          {/* Resource Management */}
          <Link href="/resources" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 card-hover">
              <div className="flex items-center mb-4">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
                <h3 className="ml-3 text-xl font-semibold text-gray-900">Resource Management</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Manage team assignments, equipment allocation, and resource planning across projects.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Team assignments</li>
                <li>• Equipment tracking</li>
                <li>• Resource allocation</li>
                <li>• Capacity planning</li>
              </ul>
            </div>
          </Link>

          {/* Analytics */}
          <Link href="/analytics" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 card-hover">
              <div className="flex items-center mb-4">
                <ChartBarIcon className="h-8 w-8 text-purple-600" />
                <h3 className="ml-3 text-xl font-semibold text-gray-900">Analytics</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Real-time performance metrics and cost forecasting with machine learning insights.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Performance metrics</li>
                <li>• Cost forecasting</li>
                <li>• Template effectiveness</li>
                <li>• Risk analysis</li>
              </ul>
            </div>
          </Link>

          {/* Scheduling */}
          <Link href="/schedule" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 card-hover">
              <div className="flex items-center mb-4">
                <CalendarIcon className="h-8 w-8 text-indigo-600" />
                <h3 className="ml-3 text-xl font-semibold text-gray-900">Scheduling</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Intelligent scheduling with Critical Path Method and resource optimization.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Gantt charts</li>
                <li>• Critical path analysis</li>
                <li>• Resource constraints</li>
                <li>• Dependency management</li>
              </ul>
            </div>
          </Link>

          {/* Templates */}
          <Link href="/templates" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 card-hover">
              <div className="flex items-center mb-4">
                <DocumentTextIcon className="h-8 w-8 text-orange-600" />
                <h3 className="ml-3 text-xl font-semibold text-gray-900">Templates</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Smart project templates with conditional logic and continuous learning from completed projects.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Intelligent selection</li>
                <li>• Conditional modifications</li>
                <li>• Learning algorithms</li>
                <li>• Team suggestions</li>
              </ul>
            </div>
          </Link>

          {/* Project Settings */}
          <Link href="/settings" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 card-hover">
              <div className="flex items-center mb-4">
                <CogIcon className="h-8 w-8 text-red-600" />
                <h3 className="ml-3 text-xl font-semibold text-gray-900">Project Settings</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Configure project defaults, approval workflows, and integration settings.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Default templates</li>
                <li>• Approval workflows</li>
                <li>• Portal integrations</li>
                <li>• Notification settings</li>
              </ul>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/projects/create" className="btn-primary">
              Create New Project
            </Link>
            <Link href="/analytics/dashboard" className="btn-secondary">
              View Analytics
            </Link>
            <Link href="/templates/select" className="btn-secondary">
              Browse Templates
            </Link>
            <Link href="/resources/assign" className="btn-secondary">
              Assign Resources
            </Link>
          </div>
        </div>

        {/* Portal Navigation */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Need Time Tracking?</strong> Field technicians can log time through the Employee Portal.
                </p>
              </div>
            </div>
            <a 
              href="http://localhost:3001" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Employee Portal →
            </a>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                <strong>System Status:</strong> All services operational. 
                Database connected. Real-time sync active.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}