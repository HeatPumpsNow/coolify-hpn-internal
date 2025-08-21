'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectPortalHome() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page immediately
    router.replace('/login');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}