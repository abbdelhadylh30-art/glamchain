import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter, verifyTenantOwnership } from '@/lib/permissions'
import { stylistCreateSchema, stylistUpdateSchema, formatZodError } from '@/lib/validations'

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('stylists_view')
  if (!authorized) return response

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  try {
    // MULTI-TENANT SCOPE — every query in this handler is tenant-scoped
    const scope = getDataScopeFilter(session!)
    const where: Record<string, unknown> = { ...scope, isActive: true }
    if (locationId) where.locationId = locationId

    const stylists = await db.stylist.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        location: { select: { name: true } },
      }
    })

    // Get performance data efficiently using grouped queries instead of N+1
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const stylistIds = stylists.map(s => s.id)

    // Single query for completed appointments aggregated by stylist (tenant-scoped)
    const completedByStylist = await db.appointment.groupBy({
      by: ['stylistId'],
      where: { ...scope, stylistId: { in: stylistIds }, status: 'completed' },
      _sum: { totalPrice: true },
      _count: true,
    })

    // Single query for this month's completed appointments (tenant-scoped)
    const thisMonthByStylist = await db.appointment.groupBy({
      by: ['stylistId'],
      where: {
        ...scope,
        stylistId: { in: stylistIds },
        status: 'completed',
        date: { gte: thisMonth },
      },
      _sum: { totalPrice: true },
    })

    // Single query for upcoming appointments count (tenant-scoped)
    const upcomingByStylist = await db.appointment.groupBy({
      by: ['stylistId'],
      where: {
        ...scope,
        stylistId: { in: stylistIds },
        date: { gte: new Date() },
        status: { in: ['confirmed', 'pending'] },
      },
      _count: true,
    })

    // Convert to lookup maps
    const completedMap = new Map(completedByStylist.map(r => [r.stylistId, { revenue: r._sum.totalPrice || 0, count: r._count }]))
    const thisMonthMap = new Map(thisMonthByStylist.map(r => [r.stylistId, r._sum.totalPrice || 0]))
    const upcomingMap = new Map(upcomingByStylist.map(r => [r.stylistId, r._count]))

    const stylistsPerformance = stylists.map(stylist => {
      const completed = completedMap.get(stylist.id) || { revenue: 0, count: 0 }
      const thisMonthRevenue = thisMonthMap.get(stylist.id) || 0

      return {
        ...stylist,
        locationName: stylist.location.name,
        totalRevenue: Math.round(completed.revenue * 100) / 100,
        totalCompleted: completed.count,
        thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
        upcomingAppointments: upcomingMap.get(stylist.id) || 0,
        commission: Math.round(completed.revenue * stylist.commissionRate * 100) / 100,
      }
    })

    return NextResponse.json({ stylists: stylistsPerformance })
  } catch (error) {
    console.error('Stylists API error:', error)
    return NextResponse.json({ error: 'Failed to fetch stylists' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized, response, session } = await authorize('stylists_create')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = stylistCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { name, email, phone, locationId, specialization, commissionRate } = result.data

    // MULTI-TENANT: derive tenantId from the location (never trust request body)
    const location = await db.location.findUnique({
      where: { id: locationId },
      select: { tenantId: true, isActive: true },
    })
    if (!location || !location.isActive) {
      return NextResponse.json({ error: 'Location not found or inactive' }, { status: 404 })
    }
    const tenantId = location.tenantId

    const stylist = await db.stylist.create({
      data: {
        tenantId,
        name,
        email,
        phone,
        locationId,
        specialization,
        commissionRate,
        isActive: true,
      },
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ stylist }, { status: 201 })
  } catch (error) {
    console.error('Create stylist error:', error)
    return NextResponse.json({ error: 'Failed to create stylist' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { authorized, response, session } = await authorize('stylists_update')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = stylistUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { id, name, email, phone, locationId, specialization, commissionRate, isActive } = result.data

    // Verify this stylist belongs to the current tenant before updating
    const owning = await verifyTenantOwnership('stylist', id, session!.user)
    if (!owning.ok) return owning.response

    // Field allowlist — prevent mass assignment (Zod already validates types)
    const stylistData: Record<string, unknown> = {}
    if (name !== undefined) stylistData.name = name
    if (email !== undefined) stylistData.email = email
    if (phone !== undefined) stylistData.phone = phone
    if (locationId !== undefined) stylistData.locationId = locationId
    if (specialization !== undefined) stylistData.specialization = specialization
    if (commissionRate !== undefined) stylistData.commissionRate = commissionRate
    if (isActive !== undefined) stylistData.isActive = isActive

    const stylist = await db.stylist.update({
      where: { id },
      data: stylistData,
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ stylist })
  } catch (error) {
    console.error('Update stylist error:', error)
    return NextResponse.json({ error: 'Failed to update stylist' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { authorized, response, session } = await authorize('stylists_delete')
  if (!authorized) return response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Stylist id is required' }, { status: 400 })
    }

    // Verify ownership before deleting (soft delete)
    const owning = await verifyTenantOwnership('stylist', id, session!.user)
    if (!owning.ok) return owning.response

    // Soft delete - mark as inactive
    const stylist = await db.stylist.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ stylist })
  } catch (error) {
    console.error('Delete stylist error:', error)
    return NextResponse.json({ error: 'Failed to delete stylist' }, { status: 500 })
  }
}
