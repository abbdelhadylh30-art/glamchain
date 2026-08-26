import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { ROLE_HIERARCHY } from '@/lib/roles'
import type { RoleType } from '@/lib/roles'

/**
 * Route-level minimum role requirements.
 * These are enforced at the middleware layer for early rejection,
 * before the request even reaches the API route handler.
 *
 * The route handlers still perform fine-grained permission checks
 * (e.g., distinguishing create vs. update vs. delete) and
 * multi-tenant scoping (every query is filtered by tenantId).
 */
const ROUTE_ROLE_ACCESS: Record<string, RoleType> = {
  '/api/dashboard': 'staff',
  '/api/appointments': 'staff',
  '/api/stylists': 'staff',
  '/api/customers': 'receptionist',
  '/api/services': 'staff',
  '/api/inventory': 'staff',
  '/api/financials': 'owner',
  '/api/expenses': 'owner',
  '/api/settings': 'owner',
}

// ---------------------------------------------------------------------------
// CORS — required for the standalone booking widget to call the public
// booking endpoints cross-origin (e.g. widget served from
// https://glamchain.com/widget/... calling https://api.glamchain.com/api/public/...).
//
// Authenticated dashboard routes do NOT get CORS — they're protected by
// NextAuth httpOnly cookies, which don't compose safely with cross-origin.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.WIDGET_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .concat([
    // Booking widget served via python -m http.server
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    // Landing page (separate Next.js app — calls dashboard API cross-origin)
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    // Same-origin dashboard dev server (won't hurt)
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    // Production landing (Vercel)
    'https://glamchain.vercel.app',
  ])

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  if (!allowOrigin) return null
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export async function middleware(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const origin = request.headers.get('origin')

  // ---- CORS preflight for public routes ----
  const isPublicRoute = pathname.startsWith('/api/public/') || pathname === '/api/config' || pathname.startsWith('/api/whatsapp/')
  if (request.method === 'OPTIONS' && isPublicRoute) {
    const cors = corsHeaders(origin)
    if (!cors) return new NextResponse(null, { status: 204 })
    return new NextResponse(null, { status: 204, headers: cors })
  }

  // ---- Add CORS headers to actual responses on public routes ----
  if (isPublicRoute && request.method !== 'OPTIONS') {
    const response = NextResponse.next()
    const cors = corsHeaders(origin)
    if (cors) {
      Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v))
    }
    // Public routes do NOT require auth — let them through
    return response
  }

  // ---- Auth + RBAC for protected routes ----
  const token = await getToken({ req: request as any })

  // Step 1: Check authentication — must have a valid token
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', url.origin))
  }

  // Step 2: Check authorization — role must meet the minimum for the route
  let requiredRole: RoleType | null = null
  for (const [prefix, role] of Object.entries(ROUTE_ROLE_ACCESS)) {
    if (pathname.startsWith(prefix)) {
      requiredRole = role
      break
    }
  }

  // If no route rule found, allow through
  if (!requiredRole) return NextResponse.next()

  // Hierarchical check: user level must be >= required level
  const userRole = token.role as string
  const userLevel = ROLE_HIERARCHY[userRole as RoleType] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0

  if (userLevel < requiredLevel) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Public routes (CORS + preflight)
    '/api/public/:path*',
    '/api/config',
    // Protected routes (auth + RBAC)
    '/api/dashboard/:path*',
    '/api/appointments/:path*',
    '/api/stylists/:path*',
    '/api/customers/:path*',
    '/api/services/:path*',
    '/api/inventory/:path*',
    '/api/financials/:path*',
    '/api/expenses/:path*',
    '/api/settings/:path*',
  ],
}
