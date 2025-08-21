import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getInternalUserWithRoles } from './client'
import { InternalUser, PortalRole } from '@/lib/types'

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export function createSupabaseAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Admin client doesn't need cookies
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function getAuthenticatedUser(): Promise<{
  user: InternalUser | null
  error: string | null
}> {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get the current user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { user: null, error: 'No authenticated user' }
    }

    // Get internal user with roles
    const internalUser = await getInternalUserWithRoles(user.id)

    if (!internalUser) {
      return { user: null, error: 'User not found in internal system' }
    }

    return { user: internalUser, error: null }
  } catch (error) {
    console.error('Authentication error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

export async function requireAuth(allowedRoles?: PortalRole[]): Promise<{
  user: InternalUser | null
  error: string | null
  status?: number
}> {
  const { user, error } = await getAuthenticatedUser()

  if (error || !user) {
    return { user: null, error: error || 'Authentication required', status: 401 }
  }

  // Check if user has required roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some(role => user.roles.includes(role))
    if (!hasRole) {
      return { 
        user: null, 
        error: `Access denied - one of these roles required: ${allowedRoles.join(', ')}`, 
        status: 403 
      }
    }
  }

  return { user, error: null }
}