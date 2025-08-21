'use client';

import { LoginPage } from '@/shared/features/auth';

export default function anyLoginPage() {
  return (
    <LoginPage
      portalType="employee"
      portalName="any Portal"
      logoSrc="/logo.svg"
      apiEndpoint="/api/auth/login"
      redirectPath="/employee/dashboard"
      showRememberMe={true}
      showDemoUsers={false}
      customBranding={{
        primaryColor: '#059669',
        backgroundColor: 'linear-gradient(to bottom right, #ecfdf5, #ffffff)',
        cardBackground: '#ffffff'
      }}
      helpLink={{
        text: 'IT support',
        href: '/support'
      }}
    />
  );
}