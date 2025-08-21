'use client';

import { LoginPage } from '@/shared/features/auth';

export default function OwnerLoginPage() {
  return (
    <LoginPage
      portalType="owner"
      portalName="Owner Portal"
      logoSrc="/logo.svg"
      apiEndpoint="/api/auth/login"
      redirectPath="/owner/dashboard"
      showRememberMe={true}
      showDemoUsers={false}
      customBranding={{
        primaryColor: '#7c3aed',
        backgroundColor: 'linear-gradient(to bottom right, #f3e8ff, #ffffff)',
        cardBackground: '#ffffff'
      }}
      helpLink={{
        text: 'executive support',
        href: '/support'
      }}
    />
  );
}