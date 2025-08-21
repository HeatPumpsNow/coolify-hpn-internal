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

// Export commonly needed functions
export const getAuthUser = getAuthenticatedUser
export const withAuth = requireAuth

// Placeholder functions to maintain compatibility
export function getUser() {
  return getAuthenticatedUser()
}

export function withMobileAuth(handler: any) {
  // Placeholder for mobile auth wrapper
  return handler
}

// Route handler auth wrapper for Next.js App Router
export function withAuthHandler(
  handler: (request: any, user: any, ...args: any[]) => Promise<Response>,
  options: { allowedUserTypes?: string[], allowedRoles?: string[] } = {}
) {
  return async (request: any, ...args: any[]) => {
    try {
      const { user, error, status } = await requireAuth()
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: error || 'Authentication required',
            timestamp: new Date().toISOString()
          }),
          { 
            status: status || 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Check user types if specified
      if (options.allowedUserTypes && options.allowedUserTypes.length > 0) {
        const hasValidUserType = options.allowedUserTypes.includes(user.user_type)
        if (!hasValidUserType) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Access denied - one of these user types required: ${options.allowedUserTypes.join(', ')}`,
              timestamp: new Date().toISOString()
            }),
            { 
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }

      return await handler(request, user, ...args)
    } catch (error) {
      console.error('Auth wrapper error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

export function generateOwnerToken(userId: string) {
  // Placeholder for owner token generation
  return { token: 'placeholder', userId }
}

export function verifyOwnerToken(token: string) {
  // Placeholder for owner token verification
  return { valid: true, userId: 'placeholder' }
}

// Default export for backward compatibility
const AuthService = {
  getAuthenticatedUser,
  requireAuth,
  withAuth: requireAuth,
  getAuthUser: getAuthenticatedUser,
  validateSession: async (token?: string) => {
    // For compatibility - ignore token parameter and use current session
    return await getAuthenticatedUser()
  }
}

export default AuthService