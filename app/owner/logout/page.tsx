'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        // Redirect to login page
        router.push('/owner/login');
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect to login even if logout fails
        router.push('/owner/login');
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Signing out...</h2>
        <p className="text-gray-500 mt-2">Please wait while we securely log you out.</p>
      </div>
    </div>
  );
}