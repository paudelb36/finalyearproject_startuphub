import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/terms',
    '/privacy',
    '/about',
    '/contact'
  ]

  // Routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/messages',
    '/profile',
    '/settings'
  ]

  // Admin-only routes
  const adminRoutes = [
    '/admin'
  ]

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Check if the current path is admin-only
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Allow access to public routes and static files
  if (isPublicRoute || pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return res
  }

  // Redirect to signin if trying to access protected routes without session
  if (!session && (isProtectedRoute || isAdminRoute)) {
    const redirectUrl = new URL('/auth/signin', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated, get their profile to check role
  if (session) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single()

      // Check if user account is active
      if (profile?.status !== 'active') {
        const suspendedUrl = new URL('/account-suspended', req.url)
        return NextResponse.redirect(suspendedUrl)
      }

      // Check admin routes
      if (isAdminRoute && profile?.role !== 'admin') {
        const dashboardUrl = new URL('/dashboard', req.url)
        return NextResponse.redirect(dashboardUrl)
      }

      // Redirect authenticated users away from auth pages
      if (pathname.startsWith('/auth/')) {
        const dashboardUrl = new URL('/dashboard', req.url)
        return NextResponse.redirect(dashboardUrl)
      }

      // Check if user needs to complete their profile
      if (pathname !== '/onboarding' && !profile) {
        const onboardingUrl = new URL('/onboarding', req.url)
        return NextResponse.redirect(onboardingUrl)
      }

    } catch (error) {
      console.error('Error fetching user profile in middleware:', error)
      // If there's an error fetching the profile, redirect to signin
      const signinUrl = new URL('/auth/signin', req.url)
      return NextResponse.redirect(signinUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}