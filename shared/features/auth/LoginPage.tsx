'use client';

import React, { useState } from 'react';
import { Button } from '../../ui/components/Button';
import { Input } from '../../ui/components/Input';
import { Card, CardContent } from '../../ui/components/Card';

export interface DemoUser {
  id: string;
  name: string;
  role: string;
  email: string;
  password: string;
  description?: string;
}

export interface LoginPageProps {
  portalType: 'sales' | 'employee' | 'owner' | 'customer' | 'service' | 'project';
  portalName?: string;
  logoSrc?: string;
  apiEndpoint?: string;
  redirectPath?: string;
  demoUsers?: DemoUser[];
  onLogin?: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  customBranding?: {
    primaryColor?: string;
    backgroundColor?: string;
    cardBackground?: string;
  };
  showRememberMe?: boolean;
  showDemoUsers?: boolean;
  helpLink?: {
    text: string;
    href: string;
  };
}

export function LoginPage({
  portalType,
  portalName,
  logoSrc = '/logo-horizontal.svg',
  apiEndpoint = '/api/auth/login',
  redirectPath = '/dashboard',
  demoUsers = [],
  onLogin,
  customBranding = {},
  showRememberMe = true,
  showDemoUsers = true,
  helpLink,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine portal display name
  const displayName = portalName || `${portalType.charAt(0).toUpperCase() + portalType.slice(1)} Portal`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (onLogin) {
        // Use custom login handler if provided
        await onLogin(email, password, rememberMe);
      } else {
        // Default API call
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            password, 
            rememberMe,
            portalType 
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || 'Login failed');
        }

        // Store auth data (using secure httpOnly cookies is preferred)
        if (data.token) {
          sessionStorage.setItem('authToken', data.token);
        }
        
        // Redirect to dashboard
        window.location.href = redirectPath;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (user: DemoUser) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: customBranding.backgroundColor || 'linear-gradient(to bottom right, #eff6ff, #ffffff)',
      }}
    >
      <Card 
        className="w-full max-w-md"
        style={{
          backgroundColor: customBranding.cardBackground || 'white',
        }}
      >
        <div className="text-center p-6">
          <div className="mb-4">
            <img 
              src={logoSrc}
              alt="Logo" 
              className="mx-auto h-16 w-auto mb-4"
            />
            <p 
              className="font-medium"
              style={{ color: customBranding.primaryColor || '#2563eb' }}
            >
              {displayName}
            </p>
          </div>
          <h2 className="text-xl font-semibold">Welcome Back</h2>
          <p className="text-gray-600 text-sm">Sign in to your account</p>
        </div>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              required
              disabled={loading}
              autoComplete="email"
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            
            {showRememberMe && (
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  style={{ accentColor: customBranding.primaryColor || '#2563eb' }}
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-900">
                  Remember me
                </label>
              </div>
            )}
            
            <Button
              type="submit"
              fullWidth={true}
              isLoading={loading}
              disabled={!email || !password || loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          
          {helpLink && (
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Need help? Contact your{' '}
                <a 
                  href={helpLink.href}
                  className="font-medium hover:underline"
                  style={{ color: customBranding.primaryColor || '#2563eb' }}
                >
                  {helpLink.text}
                </a>
              </p>
            </div>
          )}
          
          {showDemoUsers && demoUsers.length > 0 && (
            <div 
              className="mt-6 p-4 rounded-lg"
              style={{ backgroundColor: customBranding.primaryColor ? `${customBranding.primaryColor}10` : '#eff6ff' }}
            >
              <h3 
                className="text-sm font-medium mb-3"
                style={{ color: customBranding.primaryColor || '#1e40af' }}
              >
                Demo Credentials
              </h3>
              <div className="space-y-2">
                {demoUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => fillDemoCredentials(user)}
                    className="w-full text-left p-3 bg-white rounded-md border hover:shadow-sm transition-all text-sm group"
                    disabled={loading}
                    style={{ 
                      borderColor: customBranding.primaryColor ? `${customBranding.primaryColor}40` : '#bfdbfe'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium" style={{ color: customBranding.primaryColor || '#1e40af' }}>
                          {user.role}
                        </div>
                        <div className="text-gray-600">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                      <div className="text-gray-400 group-hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div 
                className="mt-3 p-2 rounded-md"
                style={{ backgroundColor: customBranding.primaryColor ? `${customBranding.primaryColor}20` : '#dbeafe' }}
              >
                <p className="text-xs" style={{ color: customBranding.primaryColor || '#1e40af' }}>
                  💡 <strong>Click any demo user</strong> to automatically fill the login form
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}