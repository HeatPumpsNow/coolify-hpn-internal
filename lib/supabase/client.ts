import { createClient } from '@supabase/supabase-js'
import { InternalUser, PortalRole, JWTPayload } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    return { user: null, session: null, error }
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
    return { user: null, error }
  }
}

// Get user with roles from our internal users table
export async function getInternalUserWithRoles(supabaseUserId: string): Promise<InternalUser | null> {
  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('internal_users')
      .select(`
        *,
        user_roles (
          role,
          is_primary,
          permissions
        )
      `)
      .eq('supabase_user_id', supabaseUserId)
      .single()

    if (userError) throw userError
    if (!userData) return null

    const roles: PortalRole[] = userData.user_roles.map((r: any) => r.role)
    const primaryRole: PortalRole = userData.user_roles.find((r: any) => r.is_primary)?.role || roles[0]
    const permissions = userData.user_roles.flatMap((r: any) => r.permissions || [])

    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      phone: userData.phone,
      roles,
      primaryRole,
      permissions,
      status: userData.status,
      lastLogin: userData.last_login,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    }
  } catch (error) {
    console.error('Error fetching internal user:', error)
    return null
  }
}

// Create a new internal user
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
    // Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create auth user')

    // Create internal user record
    const { data: internalUser, error: userError } = await supabaseAdmin
      .from('internal_users')
      .insert({
        supabase_user_id: authData.user.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        status: 'active',
      })
      .select()
      .single()

    if (userError) throw userError

    // Create user roles
    const roleInserts = userData.roles.map(role => ({
      user_id: internalUser.id,
      role,
      is_primary: role === userData.primaryRole,
      permissions: {},
    }))

    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert(roleInserts)

    if (rolesError) throw rolesError

    return { user: internalUser, error: null }
  } catch (error) {
    console.error('Error creating internal user:', error)
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