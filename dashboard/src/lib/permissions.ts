/**
 * Server-side authorization utilities
 *
 * Re-exports the single-source-of-truth role/permission definitions from roles.ts
 * and provides server-only helpers (authorize, authorizeLocation, getTenantFilter,
 * getDataScopeFilter) that depend on NextAuth's getServerSession.
 *
 * MULTI-TENANT NOTES:
 * - Every protected API route MUST scope its queries by tenantId.
 * - Use getDataScopeFilter(session) to get the correct where-clause filter.
 * - super_admin users with no tenantId can see all tenants (platform-level admin).
 * - super_admin users WITH a tenantId are scoped to their own tenant (tenant-level super_admin).
 * - All other roles are strictly scoped to their tenant.
 * - For creates, inject session.user.tenantId into the data payload.
 * - For updates/deletes, verify the resource belongs to the user's tenant before modifying.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

import {
  ROLE_HIERARCHY,
  PERMISSIONS as PERMISSION_MAP,
  hasPermission as checkPermission,
} from './roles'

import type { Permission, RoleType } from './roles'

export {
  Role,
  ROLES,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_BADGE_COLORS,
  NAV_ACCESS,
  PERMISSIONS,
  hasPermission,
  canAccessNav,
  canAssignRole,
  isValidRole,
  getAssignableRoles,
} from './roles'

export type { RoleType, Permission } from './roles'

// ---------------------------------------------------------------------------
// Server-only authorization functions
// ---------------------------------------------------------------------------

interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  locationId?: string
  tenantId?: string
}

interface AuthorizeDenied {
  authorized: false
  session: SessionUser | null
  statusCode: 401 | 403
  response: ReturnType<typeof NextResponse.json>
}

interface AuthorizeGranted {
  authorized: true
  session: { user: SessionUser }
  statusCode: 200
  response: null
}

type AuthorizeResult = AuthorizeDenied | AuthorizeGranted

/**
 * Authorize a request by checking the session user's role against a permission.
 * Returns a discriminated union — check `authorized` to determine the result.
 *
 * JWT ROLE STALENESS PROTECTION:
 * For mutation permissions (anything not ending in `_view` or `_analytics`),
 * we re-verify the user's role and isActive status from the database at the
 * time of the request. This catches the case where a user's role was demoted
 * or their account was deactivated after the JWT was issued — without this
 * check, a demoted user keeps their old permissions for up to 24 hours
 * (the JWT maxAge).
 *
 * View permissions trust the JWT for performance (the worst case is a
 * recently-demoted user seeing data they shouldn't for up to 24h — bad
 * but not catastrophic). Mutations are where staleness really hurts.
 *
 * The DB lookup is indexed by user.id (~1ms). For high-traffic deployments,
 * wrap this in a 30-second in-memory cache.
 */
export async function authorize(permission: Permission): Promise<AuthorizeResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      authorized: false,
      session: null,
      statusCode: 401,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const role = session.user.role as string
  if (!checkPermission(role, permission)) {
    return {
      authorized: false,
      session: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as string,
        locationId: session.user.locationId,
        tenantId: session.user.tenantId,
      },
      statusCode: 403,
      response: NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 }),
    }
  }

  // FRESH ROLE VERIFICATION for mutation permissions
  // Re-check the user's role + isActive from the DB to catch stale JWTs
  // (e.g., user was demoted or deactivated since the JWT was issued)
  const isMutation = !permission.endsWith('_view') && !permission.endsWith('_analytics')
  if (isMutation) {
    const { db } = await import('@/lib/db')
    const freshUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isActive: true, tenantId: true },
    })

    if (!freshUser || !freshUser.isActive) {
      return {
        authorized: false,
        session: null,
        statusCode: 401,
        response: NextResponse.json(
          { error: 'Session stale — your account is no longer active. Please log in again.' },
          { status: 401 }
        ),
      }
    }

    if (String(freshUser.role) !== role) {
      return {
        authorized: false,
        session: null,
        statusCode: 401,
        response: NextResponse.json(
          { error: 'Session stale — your role has changed. Please log in again.' },
          { status: 401 }
        ),
      }
    }

    // If the user's tenantId changed since the JWT was issued, also reject
    // (e.g., they were moved to a different tenant by an admin)
    if (freshUser.tenantId !== session.user.tenantId && session.user.tenantId !== undefined) {
      return {
        authorized: false,
        session: null,
        statusCode: 401,
        response: NextResponse.json(
          { error: 'Session stale — your tenant assignment has changed. Please log in again.' },
          { status: 401 }
        ),
      }
    }

    // Surface the fresh tenantId in case the session needs it downstream
    (session.user as any).tenantId = freshUser.tenantId ?? undefined
  }

  return {
    authorized: true,
    session: session as { user: SessionUser },
    statusCode: 200,
    response: null,
  }
}

/**
 * Authorize a request for a specific location.
 * super_admin can access all locations; other roles are scoped to their assigned location.
 */
export async function authorizeLocation(locationId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { authorized: false as const, session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // super_admin can access all locations
  if (session.user.role === 'super_admin') {
    return { authorized: true as const, session, response: null }
  }

  // Other roles can only access their assigned location
  if (session.user.locationId && session.user.locationId !== locationId) {
    return { authorized: false as const, session: null, response: NextResponse.json({ error: 'Forbidden — location access denied' }, { status: 403 }) }
  }

  return { authorized: true as const, session, response: null }
}

/**
 * MULTI-TENANT HELPER — get the tenant scope filter for Prisma queries.
 *
 * - Platform super_admin (no tenantId) sees all tenants → returns {} (no filter)
 * - All other users → returns { tenantId: session.user.tenantId }
 *
 * Use this for any query that should be tenant-scoped (which is nearly every query).
 */
export function getTenantFilter(session: { user: SessionUser }): Record<string, string> {
  // Platform super_admin (no tenantId) sees all tenants
  if (session.user.role === 'super_admin' && !session.user.tenantId) {
    return {}
  }
  // Everyone else is scoped to their own tenant
  if (session.user.tenantId) {
    return { tenantId: session.user.tenantId }
  }
  // Defensive fallback — if a non-super-admin user has no tenantId, return no matches
  return { tenantId: '__NO_TENANT__' }
}

/**
 * MULTI-TENANT HELPER — combined tenant + location scope for Prisma queries.
 *
 * Returns a where-clause fragment that scopes by:
 *   1. tenantId (always, except for platform super_admin)
 *   2. locationId (only if the user has a locationId AND is not super_admin)
 *
 * Platform super_admin → sees everything (returns {})
 * Tenant super_admin (has tenantId, role=super_admin) → sees all locations in their tenant
 * Owner/Receptionist with locationId → sees only their assigned location
 * Owner/Receptionist without locationId → sees all locations in their tenant
 *
 * Merge the result into your where clause: { ...getDataScopeFilter(session), ...otherFilters }
 */
export function getDataScopeFilter(session: { user: SessionUser }): Record<string, unknown> {
  const filter: Record<string, unknown> = {}

  // Platform super_admin (no tenantId) sees everything
  if (session.user.role === 'super_admin' && !session.user.tenantId) {
    return {}
  }

  // Tenant scope (always enforced for non-platform-admin users)
  if (session.user.tenantId) {
    filter.tenantId = session.user.tenantId
  } else {
    // Defensive fallback — shouldn't happen for non-super-admin
    filter.tenantId = '__NO_TENANT__'
  }

  // Location scope — only for non-super_admin users who have a locationId
  if (session.user.role !== 'super_admin' && session.user.locationId) {
    filter.locationId = session.user.locationId
  }

  return filter
}

/**
 * Verify that a resource belongs to the current user's tenant.
 * Use this before any update/delete operation.
 *
 * Usage:
 *   const owning = await verifyTenantOwnership('appointment', id, session!.user)
 *   if (!owning.ok) return owning.response
 *   // proceed with update/delete
 *
 * Note: pass session.user (the SessionUser) directly, NOT the wrapped session object.
 */
export async function verifyTenantOwnership(
  model: 'appointment' | 'customer' | 'stylist' | 'service' | 'inventoryItem' | 'expense' | 'location' | 'user',
  id: string,
  user: SessionUser,
): Promise<{ ok: true } | { ok: false; response: ReturnType<typeof NextResponse.json> }> {
  // Platform super_admin can access any resource
  if (user.role === 'super_admin' && !user.tenantId) {
    return { ok: true }
  }

  const { db } = await import('@/lib/db')
  const record = await (db as any)[model].findUnique({
    where: { id },
    select: { tenantId: true },
  }).catch(() => null)

  if (!record) {
    return { ok: false, response: NextResponse.json({ error: 'Resource not found' }, { status: 404 }) }
  }

  if (record.tenantId && record.tenantId !== user.tenantId) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden — cross-tenant access denied' }, { status: 403 }) }
  }

  return { ok: true }
}
