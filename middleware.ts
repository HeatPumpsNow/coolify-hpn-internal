import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PortalRole } from '@/lib/types'

// Portal route mappings
const PORTAL_ROUTES: Record<string, PortalRole[]> = {
  '/employee': ['employee', 'admin'],
  '/owner': ['owner', 'admin'],
  '/service': ['service', 'employee', 'admin'],
  '/installer': ['installer', 'employee', 'admin'],
  '/supplier': ['supplier', 'admin'],
  '/admin': ['admin'],
  '/partner': ['partner', 'admin'],
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth',
  '/api/health',
  '/favicon.ico',
  '/_next',
  '/images',
]

// API routes that bypass portal role checking
const API_ROUTES = [
  '/api/auth',
  '/api/health',
  '/api/user',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for public routes and static assets
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Skip portal role checking for API routes (they handle their own auth)
  if (API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  try {
    // Get Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get session from cookies
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has access to the requested portal
    const portalPath = getPortalFromPath(pathname)
    if (portalPath) {
      const hasAccess = await checkPortalAccess(session.user.id, portalPath)
      
      if (!hasAccess) {
        // Redirect to unauthorized page or default portal
        const unauthorizedUrl = new URL('/unauthorized', request.url)
        return NextResponse.redirect(unauthorizedUrl)
      }
    }

    // Add user info to headers for downstream components
    const response = NextResponse.next()
    response.headers.set('x-user-id', session.user.id)
    response.headers.set('x-user-email', session.user.email || '')
    
    return response

  } catch (error) {
    console.error('Middleware error:', error)
    
    // Redirect to login on any error
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

function getPortalFromPath(pathname: string): PortalRole | null {
  for (const [route, roles] of Object.entries(PORTAL_ROUTES)) {
    if (pathname.startsWith(route)) {
      return roles[0] // Return the primary role for this route
    }
  }
  return null
}

async function checkPortalAccess(supabaseUserId: string, requiredPortal: PortalRole): Promise<boolean> {
  try {
    // This would normally query your database
    // For now, we'll create a simplified version
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query user roles from internal_users table
    const { data, error } = await supabase
      .from('internal_users')
      .select(`
        user_roles (
          role
        )
      `)
      .eq('supabase_user_id', supabaseUserId)
      .single()

    if (error || !data) {
      console.error('Failed to fetch user roles:', error)
      return false
    }

    const userRoles: PortalRole[] = data.user_roles?.map((r: any) => r.role) || []
    
    // Check if user has the required role or admin role
    return userRoles.includes(requiredPortal) || userRoles.includes('admin')

  } catch (error) {
    console.error('Error checking portal access:', error)
    return false
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)(?!/api.*)',
  ],
}