import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { InternalUser, PortalRole, JWTPayload } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Authentication utilities
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return { user: data.user, session: data.session, error: null }
  } catch (error) {
    return { user: null, session: null, error: error as Error }
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error
    return { user, error: null }
  } catch (error) {
    return { user: null, error: error as Error }
  }
}

// Get user with roles from Supabase Auth user metadata
export async function getInternalUserWithRoles(supabaseUserId: string): Promise<InternalUser | null> {
  try {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId)

    if (authError) throw authError
    if (!authUser?.user) return null

    const user = authUser.user
    const metadata = user.user_metadata || {}
    const roles: PortalRole[] = metadata.roles || []
    const primaryRole: PortalRole = roles[0] || 'employee'

    return {
      id: user.id,
      email: user.email || '',
      firstName: metadata.first_name || '',
      lastName: metadata.last_name || '',
      phone: metadata.phone || '',
      roles,
      primaryRole,
      permissions: ['full_access'], // Default permissions for existing users
      status: 'active',
      lastLogin: user.last_sign_in_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  } catch (error) {
    console.error('Error fetching user from auth:', error)
    return null
  }
}

// Create a new user with roles in Auth metadata
export async function createInternalUser(userData: {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  roles: PortalRole[]
  primaryRole: PortalRole
}) {
  try {
    // Create Supabase auth user with metadata containing roles
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        roles: userData.roles,
        primary_role: userData.primaryRole
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create auth user')

    return { user: authData.user, error: null }
  } catch (error) {
    console.error('Error creating user:', error)
    return { user: null, error }
  }
}

// Auth state change listener
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

// JWT utilities for custom tokens (if needed)
export function createJWTPayload(user: InternalUser): JWTPayload {
  return {
    userId: user.id,
    email: user.email,
    roles: user.roles,
    primaryRole: user.primaryRole,
    type: 'internal_user',
  }
}