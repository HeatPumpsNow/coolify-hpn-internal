// Sales portal header component
'use client';

import React from 'react';
import { TrendingUp, DollarSign, Users, Target } from 'lucide-react';

interface SalesPortalHeaderProps {
  title?: string;
  subtitle?: string;
  stats?: Array<{
    label: string;
    value: string;
    icon?: React.ComponentType<any>;
    color?: string;
  }>;
}

const SalesPortalHeader: React.FC<SalesPortalHeaderProps> = ({ 
  title = "Sales Dashboard",
  subtitle = "Manage estimates, quotes, and opportunities",
  stats = []
}) => {
  const defaultStats = [
    {
      label: "Active Estimates",
      value: "12",
      icon: Target,
      color: "text-blue-600"
    },
    {
      label: "Monthly Revenue",
      value: "$45,200",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      label: "Active Leads",
      value: "8",
      icon: Users,
      color: "text-purple-600"
    },
    {
      label: "Conversion Rate",
      value: "67%",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  const displayStats = stats.length > 0 ? stats : defaultStats;

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {subtitle}
              </p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayStats.map((stat, index) => {
              const Icon = stat.icon || Target;
              return (
                <div key={index} className="bg-white overflow-hidden rounded-lg border border-gray-200">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Icon className={`h-6 w-6 ${stat.color || 'text-gray-400'}`} />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {stat.label}
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stat.value}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPortalHeader;