'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { PortalSwitcher } from './PortalSwitcher'
import { PortalRole } from '@/lib/types'

interface PortalHeaderProps {
  currentPortal: PortalRole | null
}

export function PortalHeader({ currentPortal }: PortalHeaderProps) {
  const { internalUser, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  if (!internalUser) return null

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Company Name */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/images/logos/logo-primary.svg"
                alt="Heat Pumps Now"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">Heat Pumps Now</h1>
                {currentPortal && (
                  <p className="text-sm text-gray-500 capitalize">
                    {currentPortal} Portal
                  </p>
                )}
              </div>
            </Link>
          </div>

          {/* Center - Portal Switcher */}
          <div className="hidden md:block">
            <PortalSwitcher currentPortal={currentPortal} />
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications (placeholder) */}
            <button className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a7 7 0 111.5-1.5L21 15H15z" />
              </svg>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {internalUser.firstName.charAt(0)}{internalUser.lastName.charAt(0)}
                  </span>
                </div>
                <span className="hidden md:block text-gray-700">
                  {internalUser.firstName} {internalUser.lastName}
                </span>
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{internalUser.firstName} {internalUser.lastName}</p>
                    <p className="text-xs">{internalUser.email}</p>
                    <p className="text-xs capitalize">
                      Roles: {internalUser.roles.join(', ')}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <Link
                    href="/help"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Help & Support
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Portal Switcher */}
      <div className="md:hidden border-t border-gray-200 px-4 py-2">
        <PortalSwitcher currentPortal={currentPortal} />
      </div>
    </header>
  )
}