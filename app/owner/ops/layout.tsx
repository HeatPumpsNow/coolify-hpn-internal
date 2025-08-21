'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Activity, 
  Database, 
  Shield, 
  Monitor, 
  FileText,
  BarChart3
} from 'lucide-react';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Overview',
      href: '/owner/ops',
      icon: BarChart3,
      current: pathname === '/owner/ops'
    },
    {
      name: 'Authentication',
      href: '/owner/ops/auth',
      icon: Shield,
      current: pathname?.startsWith('/owner/ops/auth') ?? false
    },
    {
      name: 'Database',
      href: '/owner/ops/database',
      icon: Database,
      current: pathname?.startsWith('/owner/ops/database') ?? false
    },
    {
      name: 'System Health',
      href: '/owner/ops/system',
      icon: Monitor,
      current: pathname?.startsWith('/owner/ops/system') ?? false
    },
    {
      name: 'Live Logs',
      href: '/owner/ops/system/logs',
      icon: FileText,
      current: pathname === '/owner/ops/system/logs'
    }
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Operations Center
          </h2>
          <p className="text-sm text-gray-400 mt-1">Technical Monitoring</p>
        </div>
        
        <nav className="mt-4">
          <div className="px-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                    ${item.current
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Quick Stats */}
        <div className="mt-8 px-3">
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Quick Stats
          </h3>
          <div className="mt-2 space-y-1">
            <div className="px-2 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Uptime</span>
                <span className="text-green-400">99.9%</span>
              </div>
            </div>
            <div className="px-2 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Users</span>
                <span className="text-blue-400">24</span>
              </div>
            </div>
            <div className="px-2 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Response Time</span>
                <span className="text-yellow-400">45ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}