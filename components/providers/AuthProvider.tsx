'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getInternalUserWithRoles } from '@/lib/supabase/client'
import { InternalUser } from '@/lib/types'
import { logger } from '@/lib/utils'

interface AuthContextType {
  user: User | null
  internalUser: InternalUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [internalUser, setInternalUser] = useState<InternalUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state changed', { event, userId: session?.user?.id })
        
        if (session?.user) {
          setUser(session.user)
          await loadInternalUser(session.user.id)
        } else {
          setUser(null)
          setInternalUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function getInitialSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        logger.error('Error getting session', error)
        return
      }

      if (session?.user) {
        setUser(session.user)
        await loadInternalUser(session.user.id)
      }
    } catch (error) {
      logger.error('Error in getInitialSession', error as Error)
    } finally {
      setLoading(false)
    }
  }

  async function loadInternalUser(supabaseUserId: string) {
    try {
      const userData = await getInternalUserWithRoles(supabaseUserId)
      setInternalUser(userData)
      
      if (userData) {
        logger.debug('Internal user loaded', { 
          userId: userData.id, 
          roles: userData.roles,
          primaryRole: userData.primaryRole 
        })
      }
    } catch (error) {
      logger.error('Error loading internal user', error as Error)
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        logger.error('Error signing out', error)
        throw error
      }
      
      setUser(null)
      setInternalUser(null)
      logger.info('User signed out')
    } catch (error) {
      logger.error('Sign out error', error as Error)
      throw error
    }
  }

  async function refreshUser() {
    if (user) {
      await loadInternalUser(user.id)
    }
  }

  const value = {
    user,
    internalUser,
    loading,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}