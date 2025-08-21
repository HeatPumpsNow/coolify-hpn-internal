'use client';

import { LoginPage } from '@heat-pumps-now/features';

export default function SalesLoginPage() {
  return (
    <LoginPage
      portalType="sales"
      portalName="Sales Portal"
      logoSrc="/logo-horizontal.svg"
      apiEndpoint="/api/auth/login"
      redirectPath="/dashboard"
      showRememberMe={true}
      showDemoUsers={false}
      customBranding={{
        primaryColor: '#2563eb',
        backgroundColor: 'linear-gradient(to bottom right, #eff6ff, #ffffff)',
        cardBackground: '#ffffff'
      }}
      helpLink={{
        text: 'sales manager',
        href: '/support'
      }}
    />
  );
}