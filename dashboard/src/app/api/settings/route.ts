import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authorize, getDataScopeFilter, verifyTenantOwnership } from '@/lib/permissions'
import { logUnauthorizedAccess, logUserManagement, logPasswordChange } from '@/lib/audit'
import { locationCreateSchema, locationUpdateSchema, userCreateSchema, userUpdateSchema, formatZodError } from '@/lib/validations'

export async function GET(request: Request) {
  const { authorized, response, session, statusCode } = await authorize('settings_view')
  if (!authorized) {
    logUnauthorizedAccess({
      userId: session?.id,
      userEmail: session?.email,
      userRole: session?.role,
      resource: 'settings',
      method: 'GET',
      path: '/api/settings',
      statusCode,
    })
    return response
  }

  try {
    // MULTI-TENANT SCOPE — every query in this handler is tenant-scoped
    const scope = getDataScopeFilter(session!)

    const [locations, users] = await Promise.all([
      db.location.findMany({
        where: scope,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { users: true, stylists: true }
          }
        }
      }),
      db.user.findMany({
        where: scope,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          avatar: true,
          locationId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          location: { select: { name: true } },
        }
      }),
    ])

    // Enrich locations with stats — tenant-scoped counts
    const locationsWithStats = await Promise.all(
      locations.map(async (loc) => {
        const [staffCount, stylistCount] = await Promise.all([
          db.user.count({ where: { ...scope, locationId: loc.id, isActive: true } }),
          db.stylist.count({ where: { ...scope, locationId: loc.id, isActive: true } }),
        ])
        return { ...loc, staffCount, stylistCount }
      })
    )

    // Enrich users with location names — already included
    const usersWithLocation = users.map(u => ({
      ...u,
      locationName: u.location?.name || null,
    }))

    return NextResponse.json({ locations: locationsWithStats, users: usersWithLocation })
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// Create new location or user
export async function POST(request: Request) {
  const outerSession = await getServerSession(authOptions)
  if (!outerSession?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const type = body.type || 'location'

    if (type === 'location') {
      // Creating a location requires settings_locations_manage permission
      const { authorized, response, session } = await authorize('settings_locations_manage')
      if (!authorized) return response

      // Validate input with Zod
      const result = locationCreateSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: formatZodError(result.error) },
          { status: 400 }
        )
      }

      const { name, address, city, phone, email, openTime, closeTime } = result.data

      // MULTI-TENANT: inject tenantId from session — never trust request body.
      // Location.tenantId is required in the schema, so a platform super_admin
      // without a tenantId cannot create locations (would fail at DB level).
      // The 403 fallback below gives a clear error message instead of an opaque DB error.
      const tenantId = session!.user.tenantId
      if (!tenantId) {
        return NextResponse.json({ error: 'No tenant context for this user' }, { status: 403 })
      }

      const location = await db.location.create({
        data: {
          tenantId,
          name,
          address,
          city,
          phone,
          email,
          openTime,
          closeTime,
          isActive: true,
        }
      })

      return NextResponse.json({ location }, { status: 201 })
    } else if (type === 'user') {
      // Creating a user requires settings_users_manage permission
      const { authorized, response, session } = await authorize('settings_users_manage')
      if (!authorized) return response

      // Validate input with Zod
      const result = userCreateSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: formatZodError(result.error) },
          { status: 400 }
        )
      }

      const { name, email, role, password, locationId } = result.data

      // Hash password with bcrypt
      const bcrypt = await import('bcryptjs')
      // Generate a random password if none provided
      const generatedPassword = password || Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6).toUpperCase()
      const hashedPassword = await bcrypt.hash(generatedPassword, 10)

      // MULTI-TENANT: inject tenantId from session — never trust request body.
      // User.tenantId is nullable to support platform-level super_admin accounts.
      // Platform super_admin (role=super_admin, no tenantId in session) may create
      // platform-level users (no tenantId). All other users inject their own tenantId.
      const sessionTenantId = session!.user.tenantId
      const isPlatformSuperAdmin = session!.user.role === 'super_admin' && !sessionTenantId
      if (!isPlatformSuperAdmin && !sessionTenantId) {
        return NextResponse.json({ error: 'No tenant context for this user' }, { status: 403 })
      }

      const user = await db.user.create({
        data: {
          ...(sessionTenantId ? { tenantId: sessionTenantId } : {}),
          name,
          email,
          password: hashedPassword,
          role,
          locationId: locationId || null,
          isActive: true,
        },
        include: {
          location: { select: { name: true } },
        }
      })

      // Audit log after successful user creation
      logUserManagement({
        actorId: outerSession.user.id,
        actorEmail: outerSession.user.email!,
        actorRole: outerSession.user.role,
        action: 'user_created',
        targetUserId: user.id,
        targetUserEmail: user.email,
        targetUserRole: user.role,
      })

      return NextResponse.json({ user, generatedPassword: password ? undefined : generatedPassword }, { status: 201 })
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "location" or "user"' }, { status: 400 })
    }
  } catch (error) {
    console.error('Create settings error:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}

// Update location or user
export async function PUT(request: Request) {
  const outerSession = await getServerSession(authOptions)
  if (!outerSession?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, id, ...updateData } = body

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required fields: type (location/user), id' }, { status: 400 })
    }

    if (type === 'location') {
      // Updating a location requires settings_general permission
      const { authorized, response, session } = await authorize('settings_general')
      if (!authorized) return response

      // Validate input with Zod
      const result = locationUpdateSchema.safeParse({ id, ...updateData })
      if (!result.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: formatZodError(result.error) },
          { status: 400 }
        )
      }

      // Verify this location belongs to the current tenant before updating
      const owning = await verifyTenantOwnership('location', id, session!.user)
      if (!owning.ok) return owning.response

      const { name, address, city, phone, email, openTime, closeTime, isActive } = result.data

      // Field allowlist for location updates — prevent mass assignment (Zod already validates)
      const locationData: Record<string, unknown> = {}
      if (name !== undefined) locationData.name = name
      if (address !== undefined) locationData.address = address
      if (city !== undefined) locationData.city = city
      if (phone !== undefined) locationData.phone = phone
      if (email !== undefined) locationData.email = email
      if (openTime !== undefined) locationData.openTime = openTime
      if (closeTime !== undefined) locationData.closeTime = closeTime
      if (isActive !== undefined) locationData.isActive = isActive

      const location = await db.location.update({
        where: { id },
        data: locationData,
      })
      return NextResponse.json({ location })
    } else if (type === 'user') {
      // Special handling for password change
      if (updateData.password) {
        const isOwnPassword = id === outerSession.user.id

        if (isOwnPassword) {
          // User changing their own password — require currentPassword verification.
          // No verifyTenantOwnership call needed here: id === session.user.id, so the
          // user is trivially their own tenant.
          if (!updateData.currentPassword) {
            return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
          }

          // Verify current password
          const user = await db.user.findUnique({ where: { id } })
          if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
          }

          const bcrypt = await import('bcryptjs')
          const isCurrentPasswordValid = await bcrypt.compare(updateData.currentPassword, user.password)
          if (!isCurrentPasswordValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
          }

          // Hash the new password
          updateData.password = await bcrypt.hash(updateData.password, 10)
        } else {
          // Admin resetting someone else's password — require settings_users_manage permission
          const { authorized, response, session } = await authorize('settings_users_manage')
          if (!authorized) return response

          // Verify this user belongs to the current tenant before resetting password
          const owning = await verifyTenantOwnership('user', id, session!.user)
          if (!owning.ok) return owning.response

          // Hash the new password (no currentPassword needed for admin resets)
          const bcrypt = await import('bcryptjs')
          updateData.password = await bcrypt.hash(updateData.password, 10)
        }
      } else {
        // Other user updates (not password) require settings_general permission
        const { authorized, response, session } = await authorize('settings_general')
        if (!authorized) return response

        // Verify this user belongs to the current tenant before updating
        const owning = await verifyTenantOwnership('user', id, session!.user)
        if (!owning.ok) return owning.response
      }

      // Validate input with Zod (after password hashing so we don't validate the hash)
      const result = userUpdateSchema.safeParse({ id, ...updateData })
      if (!result.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: formatZodError(result.error) },
          { status: 400 }
        )
      }

      // Remove currentPassword from updateData so it doesn't get saved to DB
      delete updateData.currentPassword

      // Field allowlist for user updates — prevent mass assignment (Zod already validates)
      const { name, email, role, locationId, isActive } = result.data
      const userData: Record<string, unknown> = {}
      if (name !== undefined) userData.name = name
      if (email !== undefined) userData.email = email
      if (role !== undefined) userData.role = role
      if (locationId !== undefined) userData.locationId = locationId
      if (isActive !== undefined) userData.isActive = isActive
      // Password is handled separately above — add it only if it was hashed
      if (updateData.password) userData.password = updateData.password

      const user = await db.user.update({
        where: { id },
        data: userData,
        include: {
          location: { select: { name: true } },
        }
      })
      return NextResponse.json({ user })
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "location" or "user"' }, { status: 400 })
    }
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

// Delete location (soft delete)
export async function DELETE(request: Request) {
  const { authorized, response, session } = await authorize('settings_locations_manage')
  if (!authorized) return response

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required fields: type (location/user), id' }, { status: 400 })
    }

    if (type === 'location') {
      // Verify ownership before deleting (soft delete)
      const owning = await verifyTenantOwnership('location', id, session!.user)
      if (!owning.ok) return owning.response

      const location = await db.location.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ location })
    } else if (type === 'user') {
      // Verify ownership before deleting (soft delete)
      const owning = await verifyTenantOwnership('user', id, session!.user)
      if (!owning.ok) return owning.response

      const user = await db.user.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ user })
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "location" or "user"' }, { status: 400 })
    }
  } catch (error) {
    console.error('Delete settings error:', error)
    return NextResponse.json({ error: 'Failed to delete settings' }, { status: 500 })
  }
}
