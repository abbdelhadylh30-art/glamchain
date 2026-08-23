import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/config?locationId=xxx
// Public (unauthenticated) endpoint that returns per-tenant branding
// for the booking widget to consume.
//
// The widget can fetch this on load to dynamically brand itself based
// on the tenant's DB-stored branding fields (primaryColor, monogram, etc.)
// — replacing the static client-config.json approach.
//
// If no locationId is provided, returns the first active tenant's branding.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    let tenant
    let location = null

    if (locationId) {
      // Look up the tenant via the location
      location = await db.location.findUnique({
        where: { id: locationId, isActive: true },
        select: {
          id: true, name: true, address: true, city: true,
          phone: true, email: true, openTime: true, closeTime: true,
          tenantId: true,
        },
      })
      if (!location) {
        return NextResponse.json({ error: 'Location not found or inactive' }, { status: 404 })
      }
      tenant = await db.tenant.findUnique({
        where: { id: location.tenantId, isActive: true },
        select: {
          id: true, name: true, slug: true,
          primaryColor: true, accentColor: true, monogram: true,
          logoUrl: true, timezone: true, currency: true, locale: true,
          showBranding: true, plan: true,
          contactEmail: true, contactPhone: true,
        },
      })
    } else {
      // No locationId — return the first active tenant (useful for widget onboarding)
      tenant = await db.tenant.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, name: true, slug: true,
          primaryColor: true, accentColor: true, monogram: true,
          logoUrl: true, timezone: true, currency: true, locale: true,
          showBranding: true, plan: true,
          contactEmail: true, contactPhone: true,
        },
      })
      if (tenant) {
        location = await db.location.findFirst({
          where: { tenantId: tenant.id, isActive: true },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, name: true, address: true, city: true,
            phone: true, email: true, openTime: true, closeTime: true,
          },
        })
      }
    }

    if (!tenant) {
      return NextResponse.json({ error: 'No active tenant found' }, { status: 404 })
    }

    return NextResponse.json({
      tenant,
      location: location ? {
        ...location,
        // Strip tenantId from the public response
        tenantId: undefined,
      } : null,
    })
  } catch (error) {
    console.error('Config API error:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}
