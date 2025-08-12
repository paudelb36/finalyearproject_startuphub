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

  // If user is authenticated, avoid heavy DB checks here to keep middleware fast
  // Do only minimal routing logic that cannot be done client-side.
  if (session) {
    // Redirect authenticated users away from auth pages
    if (pathname.startsWith('/auth/')) {
      const dashboardUrl = new URL('/dashboard', req.url)
      return NextResponse.redirect(dashboardUrl)
    }

    // Optionally, admin route checks can be done in the page/API to avoid slowing all navigations
  }

  return res
}

export const config = {
  matcher: [
    // Only run middleware on protected and auth routes to avoid slowing down all pages
    '/dashboard/:path*',
    '/messages/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/auth/:path*'
  ],
}