'use client'

import React, { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { PortalHeader } from './PortalHeader'
import { PortalSidebar } from './PortalSidebar'
import { PortalRole } from '@/lib/types'

interface PortalLayoutWrapperProps {
  children: ReactNode
}

// Routes that don't need the portal layout
const LAYOUT_EXCLUDED_ROUTES = [
  '/login',
  '/unauthorized',
  '/api',
]

// Get portal from pathname
function getPortalFromPath(pathname: string): PortalRole | null {
  if (pathname.startsWith('/employee')) return 'employee'
  if (pathname.startsWith('/owner')) return 'owner'
  if (pathname.startsWith('/service')) return 'service'
  if (pathname.startsWith('/installer')) return 'installer'
  if (pathname.startsWith('/supplier')) return 'supplier'
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/partner')) return 'partner'
  return null
}

export function PortalLayoutWrapper({ children }: PortalLayoutWrapperProps) {
  const pathname = usePathname()
  const { user, internalUser, loading } = useAuth()

  // Check if current route should exclude the portal layout
  const shouldExcludeLayout = LAYOUT_EXCLUDED_ROUTES.some(route => 
    pathname.startsWith(route)
  )

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Render without layout for excluded routes or when not authenticated
  if (shouldExcludeLayout || !user || !internalUser) {
    return <>{children}</>
  }

  const currentPortal = getPortalFromPath(pathname)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal Header */}
      <PortalHeader currentPortal={currentPortal} />
      
      <div className="flex">
        {/* Portal Sidebar */}
        <PortalSidebar currentPortal={currentPortal} />
        
        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}