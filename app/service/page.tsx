'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ServicePortalRedirect() {
  const { internalUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect based on user's primary role after a short delay
    if (internalUser && internalUser.primaryRole !== 'service') {
      const timer = setTimeout(() => {
        router.push(`/${internalUser.primaryRole}`);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [internalUser, router]);

  if (!internalUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Service Portal Access
        </h1>
        <p className="text-gray-600 mt-2">
          Service requests are managed through other portals. Choose where you'd like to go:
        </p>
      </div>

      {/* Redirect Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {internalUser.roles.includes('employee') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/employee')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8z" />
                  </svg>
                </div>
                <span>Employee Portal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage daily tasks, jobs, and service requests</p>
              <Button className="mt-4 w-full" onClick={() => router.push('/employee')}>
                Go to Employee Portal
              </Button>
            </CardContent>
          </Card>
        )}

        {internalUser.roles.includes('sales') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/sales')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span>Sales Portal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Handle leads, opportunities, and customer service</p>
              <Button className="mt-4 w-full" onClick={() => router.push('/sales')}>
                Go to Sales Portal
              </Button>
            </CardContent>
          </Card>
        )}

        {internalUser.roles.includes('owner') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/owner')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span>Owner Portal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View business overview and manage service operations</p>
              <Button className="mt-4 w-full" onClick={() => router.push('/owner')}>
                Go to Owner Portal
              </Button>
            </CardContent>
          </Card>
        )}

        {internalUser.roles.includes('project') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/project')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span>Project Portal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coordinate projects and track service delivery</p>
              <Button className="mt-4 w-full" onClick={() => router.push('/project')}>
                Go to Project Portal
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Auto-redirect notification */}
      {internalUser.primaryRole !== 'service' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-700">
                You will be automatically redirected to your primary portal ({internalUser.primaryRole}) in a few seconds...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}