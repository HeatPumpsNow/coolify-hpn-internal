'use client';

import { LoginPage } from '@heat-pumps-now/features';

export default function ProjectLoginPage() {
  return (
    <LoginPage
      portalType="project"
      portalName="Project Management Portal"
      logoSrc="/logo.svg"
      apiEndpoint="/api/auth/login"
      redirectPath="/dashboard"
      showRememberMe={true}
      showDemoUsers={false}
      customBranding={{
        primaryColor: '#dc2626',
        backgroundColor: 'linear-gradient(to bottom right, #fef2f2, #ffffff)',
        cardBackground: '#ffffff'
      }}
      helpLink={{
        text: 'project support',
        href: '/support'
      }}
    />
  );
}