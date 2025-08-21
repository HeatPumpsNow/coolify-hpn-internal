'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { PortalRole } from '@/lib/types'

interface PortalSwitcherProps {
  currentPortal: PortalRole | null
}

// Portal configuration
const PORTAL_CONFIG: Record<PortalRole, {
  name: string
  description: string
  href: string
  icon: string
  color: string
}> = {
  employee: {
    name: 'Employee',
    description: 'Daily tasks and job management',
    href: '/employee',
    icon: '👨‍🔧',
    color: 'bg-blue-500'
  },
  owner: {
    name: 'Owner',
    description: 'Business overview and management',
    href: '/owner',
    icon: '🏢',
    color: 'bg-purple-500'
  },
  service: {
    name: 'Service',
    description: 'Service requests and scheduling',
    href: '/service',
    icon: '🔧',
    color: 'bg-green-500'
  },
  installer: {
    name: 'Installer',
    description: 'Installation projects and equipment',
    href: '/installer',
    icon: '⚡',
    color: 'bg-yellow-500'
  },
  supplier: {
    name: 'Supplier',
    description: 'Parts and inventory management',
    href: '/supplier',
    icon: '📦',
    color: 'bg-orange-500'
  },
  admin: {
    name: 'Admin',
    description: 'System administration and settings',
    href: '/admin',
    icon: '⚙️',
    color: 'bg-red-500'
  },
  partner: {
    name: 'Partner',
    description: 'Partner collaboration and projects',
    href: '/partner',
    icon: '🤝',
    color: 'bg-indigo-500'
  }
}

export function PortalSwitcher({ currentPortal }: PortalSwitcherProps) {
  const { internalUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!internalUser) return null

  // Get available portals for the user
  const availablePortals = internalUser.roles
    .filter(role => role in PORTAL_CONFIG)
    .map(role => ({
      role,
      ...PORTAL_CONFIG[role as PortalRole]
    }))

  if (availablePortals.length <= 1) {
    // Don't show switcher if user only has access to one portal
    return null
  }

  const currentPortalConfig = currentPortal ? PORTAL_CONFIG[currentPortal] : null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {currentPortalConfig ? (
          <>
            <span className="text-lg">{currentPortalConfig.icon}</span>
            <span className="hidden sm:block">{currentPortalConfig.name}</span>
          </>
        ) : (
          <span>Select Portal</span>
        )}
        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Available Portals
            </div>
            {availablePortals.map(({ role, name, description, href, icon, color }) => (
              <Link
                key={role}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  currentPortal === role ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    currentPortal === role ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {description}
                  </p>
                </div>
                {currentPortal === role && (
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </Link>
            ))}
          </div>
          
          {/* Quick actions */}
          <div className="border-t border-gray-100 py-2">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Portal Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}