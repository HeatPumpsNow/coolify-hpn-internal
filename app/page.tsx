'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from "next/image"
import Link from "next/link"

export default function Home() {
  const { user, internalUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && internalUser) {
      // Redirect to primary portal if authenticated
      router.push(`/${internalUser.primaryRole}`)
    } else if (!loading && !user) {
      // Redirect to login if not authenticated
      router.push('/login')
    }
  }, [user, internalUser, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/images/logos/logo-primary.svg"
              alt="Heat Pumps Now"
              width={120}
              height={120}
              className="h-24 w-auto"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Heat Pumps Now
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Unified internal portal for managing operations, employees, customers, and business insights.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Access Portal
            </Link>
            
            <Link
              href="/help"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Get Help
            </Link>
          </div>
        </div>
        
        {/* Feature overview */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-4">👨‍🔧</div>
            <h3 className="text-lg font-semibold mb-2">Employee Portal</h3>
            <p className="text-gray-600">Manage daily tasks, jobs, and timesheet tracking</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold mb-2">Owner Portal</h3>
            <p className="text-gray-600">Business overview, employee management, and reports</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-4">🔧</div>
            <h3 className="text-lg font-semibold mb-2">Service Portal</h3>
            <p className="text-gray-600">Customer service, requests, and communication</p>
          </div>
        </div>
      </div>
    </div>
  )
}
