'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';

interface anyLayoutProps {
  children: React.ReactNode;
}

function anyLayoutContent({ children }: anyLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Extract employee data from Supabase user
  const employee = user ? {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    role: user.primaryRole || 'employee'
  } : null;

  // Simple role-based permissions
  const permissions = {
    canUploadPhotos: true,
    canViewOwnanys: true,
    canContributeKnowledge: true,
    canViewFinancials: user?.roles?.includes('owner') || user?.roles?.includes('sales'),
  };

  // Handle authentication check AFTER component mounts
  useEffect(() => {
    // Skip auth check on login page
    if (pathname === '/employee/login') {
      setHasInitialized(true);
      return;
    }

    // Wait for auth context to initialize
    if (!isLoading && !hasInitialized) {
      setHasInitialized(true);
      
      // Check if user is authenticated
      if (!employee) {
        console.log('[LAYOUT] No employee found, redirecting to login from:', pathname);
        // Use replace to prevent back button issues
        router.replace('/employee/login');
      } else {
        console.log('[LAYOUT] any authenticated:', employee.email);
      }
    }
  }, [isLoading, employee, pathname, router, hasInitialized]);

  // Skip layout for login page
  if (pathname === '/employee/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await signOut();
      // Force a hard redirect to clear any cached state
      window.location.href = '/employee/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to login
      window.location.href = '/employee/login';
    }
  };

  // Show loading state while auth is being checked
  if (isLoading || !hasInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no employee after initialization, show redirect message
  if (!employee && hasInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If we don't have an employee at this point, return null to prevent render
  if (!employee) {
    return null;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/employee/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
        </svg>
      ),
      current: pathname === '/employee/dashboard',
    },
    {
      name: 'Time Clock',
      href: '/employee/timeclock',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      current: pathname === '/employee/timeclock',
      badge: 'Active', // Can show if currently clocked in
    },
    {
      name: 'Photos',
      href: '/employee/photos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      current: pathname.startsWith('/employee/photos'),
      show: permissions.canUploadPhotos,
    },
    {
      name: 'anys',
      href: '/employee/jobs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      current: pathname.startsWith('/employee/jobs'),
      show: permissions.canViewOwnanys,
    },
    {
      name: 'Service Requests',
      href: '/employee/service-requests',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      current: pathname.startsWith('/employee/service-requests'),
      show: permissions.canViewOwnanys, // Same permission as jobs
    },
    {
      name: 'Skills',
      href: '/employee/skills',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      current: pathname.startsWith('/employee/skills'),
    },
    {
      name: 'Knowledge',
      href: '/employee/knowledge',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      current: pathname.startsWith('/employee/knowledge'),
      show: permissions.canContributeKnowledge,
    },
    {
      name: 'Earnings',
      href: '/employee/earnings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      current: pathname.startsWith('/employee/earnings'),
      show: permissions.canViewFinancials,
    },
    {
      name: 'Profile',
      href: '/employee/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      current: pathname.startsWith('/employee/profile'),
    },
  ].filter(item => item.show !== false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <MobileSidebar 
              employee={employee} 
              navigation={navigation} 
              onLogout={handleLogout}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar employee={employee} navigation={navigation} onLogout={handleLogout} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white border-b border-gray-200">
          <button
            className="h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center justify-between px-4 py-2">
            <h1 className="text-lg font-semibold text-gray-900">
              {navigation.find(item => item.current)?.name || 'any Portal'}
            </h1>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Dev Preview
              </span>
              <span className={`level-${employee.role} text-xs`}>
                {employee.role}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ employee, navigation, onLogout }: any) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <Image
            src="/images/logo-primary.svg"
            alt="Heat Pumps Now"
            width={160}
            height={32}
          />
        </div>
        
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item: any) => (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                item.current
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`mr-3 flex-shrink-0 ${
                item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}>
                {item.icon}
              </span>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {employee.firstName} {employee.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {employee.email}
              </p>
              <div className="flex items-center mt-1">
                <span className={`level-${employee.role} text-xs mr-2`}>
                  {employee.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="ml-3 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              title="Logout"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSidebar({ employee, navigation, onLogout, onClose }: any) {
  return (
    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <Image
          src="/images/logo-primary.svg"
          alt="Heat Pumps Now"
          width={160}
          height={32}
        />
      </div>
      
      <nav className="mt-8 flex-1 px-2 space-y-1">
        {navigation.map((item: any) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClose}
            className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
              item.current
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={`mr-4 flex-shrink-0 ${
              item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
            }`}>
              {item.icon}
            </span>
            {item.name}
          </Link>
        ))}
      </nav>
      
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-gray-900 truncate">
                {employee.firstName} {employee.lastName}
              </p>
              <div className="flex items-center mt-1">
                <span className={`level-${employee.role} text-sm mr-2`}>
                  {employee.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="ml-3 p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target"
              title="Logout"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function anyLayout({ children }: anyLayoutProps) {
  return <anyLayoutContent>{children}</anyLayoutContent>;
}