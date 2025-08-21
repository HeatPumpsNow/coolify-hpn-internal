'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServiceRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new Service Center page
    router.replace('/owner/service-center');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Redirecting to Service Center...</h2>
        <p className="text-gray-600 mt-2">Service Requests have moved to the Service Center</p>
      </div>
    </div>
  );
}