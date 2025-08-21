'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  Camera,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  FileText,
  Headphones,
  Wrench
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import NotificationToast from '@/components/notifications/NotificationToast';

interface OwnerLayoutProps {
  children: React.ReactNode;
}

export default function OwnerLayout({ children }: OwnerLayoutProps) {
  const { user: owner, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Skip authentication for login page
  const isLoginPage = pathname === '/owner/login';

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/owner/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/owner/login');
    }
  };

  // Redirect to login if not authenticated (except on login page)
  useEffect(() => {
    if (!isLoginPage && !isLoading && !owner && pathname !== '/owner/login') {
      console.log('OwnerLayout: Redirecting to login from', pathname);
      router.push('/owner/login');
    }
  }, [isLoginPage, isLoading, owner, router, pathname]);

  const navigation = [
    { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
    { name: 'Operations', href: '/owner/ops', icon: Wrench },
    { name: 'Service Center', href: '/owner/service-center', icon: Headphones },
    { name: 'Jobs & Scheduling', href: '/owner/jobs', icon: Calendar },
    { name: 'Customer Management', href: '/owner/customers', icon: UserCheck },
    { name: 'Employees', href: '/owner/employees', icon: Users },
    { name: 'Financial Analytics', href: '/owner/finances', icon: DollarSign },
    { name: 'Photo Approvals', href: '/owner/photos', icon: Camera },
    { name: 'Reports', href: '/owner/reports', icon: FileText },
  ];

  // For login page, render without authentication layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    console.log('OwnerLayout: Showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Owner Portal...</h2>
        </div>
      </div>
    );
  }

  if (!owner) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          <SidebarContent 
            navigation={navigation} 
            pathname={pathname} 
            owner={owner}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent 
          navigation={navigation} 
          pathname={pathname} 
          owner={owner}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white shadow-sm">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page header */}
        <header className="bg-white shadow-sm lg:static lg:overflow-y-visible">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex justify-between xl:grid xl:grid-cols-12 lg:gap-8">
              <div className="flex md:absolute md:left-0 md:inset-y-0 lg:static xl:col-span-2">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 lg:hidden">
                    Owner Portal
                  </h1>
                </div>
              </div>
              <div className="min-w-0 flex-1 md:px-8 lg:px-0 xl:col-span-8">
                <div className="flex items-center px-6 py-4 md:max-w-3xl md:mx-auto lg:max-w-none lg:mx-0 xl:px-0">
                  <div className="w-full">
                    <div className="text-sm font-medium text-gray-500">
                      Welcome back, {owner.firstName}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {getPageTitle(pathname)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex md:items-center md:justify-end xl:col-span-2">
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Development Preview
                  </span>
                  <NotificationCenter />
                  <span className="text-sm text-gray-500">
                    {owner.role === 'owner' ? 'Business Owner' : 'Manager'}
                  </span>
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {owner.firstName?.[0] || 'U'}{owner.lastName?.[0] || 'U'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* Notification Toasts */}
      <NotificationToast />
    </div>
  );
}

// Owner interface for compatibility
interface Owner {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

// Sidebar content component
function SidebarContent({ 
  navigation, 
  pathname, 
  owner, 
  onLogout 
}: { 
  navigation: any[], 
  pathname: string, 
  owner: Owner,
  onLogout: () => void 
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Owner Portal</h1>
            <p className="text-sm text-gray-500">Heat Pumps Now</p>
          </div>
        </div>
        
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium border-l-4 transition-colors`}
              >
                <item.icon
                  className={`${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 flex-shrink-0 h-6 w-6`}
                />
                {item.name}
              </a>
            );
          })}
        </nav>
      </div>
      
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex items-center w-full">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {owner.firstName?.[0] || 'U'}{owner.lastName?.[0] || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-700">
              {owner.firstName} {owner.lastName}
            </p>
            <p className="text-xs text-gray-500 capitalize">{owner.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="ml-3 flex-shrink-0 p-2 text-gray-400 hover:text-gray-500 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get page title from pathname
function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/owner/dashboard': 'executive dashboard',
    '/owner/employees': 'employee management',
    '/owner/jobs': 'job dispatch board',
    '/owner/finances': 'financial analytics',
    '/owner/customers': 'customer management',
    '/owner/photos': 'photo approvals',
    '/owner/reports': 'business reports',
  };
  
  return titles[pathname] || 'owner portal';
}