import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter, verifyTenantOwnership } from '@/lib/permissions'
import { serviceCreateSchema, serviceUpdateSchema, formatZodError } from '@/lib/validations'

export async function GET() {
  const { authorized, response, session } = await authorize('services_view')
  if (!authorized) return response

  try {
    // MULTI-TENANT SCOPE — every query in this handler is tenant-scoped
    const scope = getDataScopeFilter(session!)
    const services = await db.service.findMany({
      where: { ...scope, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    })

    // Group by category
    const categories = [...new Set(services.map(s => s.category))]
    const grouped = categories.map(cat => ({
      category: cat,
      services: services.filter(s => s.category === cat)
    }))

    // Stats
    const totalServices = services.length
    const avgPrice = services.length > 0 ? services.reduce((sum, s) => sum + s.price, 0) / services.length : 0

    return NextResponse.json({
      services,
      grouped,
      stats: {
        totalServices,
        avgPrice: Math.round(avgPrice * 100) / 100,
        categories: categories.length,
      }
    })
  } catch (error) {
    console.error('Services API error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized, response, session } = await authorize('services_create')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = serviceCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { name, category, duration, price, description } = result.data

    // Inject tenantId from session — never trust the request body for tenantId
    const tenantId = session!.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context for this user' }, { status: 403 })
    }

    const service = await db.service.create({
      data: {
        tenantId,
        name,
        category,
        duration,
        price,
        description: description || null,
        isActive: true,
      }
    })

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    console.error('Create service error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { authorized, response, session } = await authorize('services_update')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = serviceUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { id, name, category, duration, price, description, isActive } = result.data

    // Verify this service belongs to the current tenant before updating
    const owning = await verifyTenantOwnership('service', id, session!.user)
    if (!owning.ok) return owning.response

    // Field allowlist — prevent mass assignment (Zod already validates types)
    const serviceData: Record<string, unknown> = {}
    if (name !== undefined) serviceData.name = name
    if (category !== undefined) serviceData.category = category
    if (duration !== undefined) serviceData.duration = duration
    if (price !== undefined) serviceData.price = price
    if (description !== undefined) serviceData.description = description
    if (isActive !== undefined) serviceData.isActive = isActive

    const service = await db.service.update({
      where: { id },
      data: serviceData,
    })

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Update service error:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { authorized, response, session } = await authorize('services_delete')
  if (!authorized) return response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 })
    }

    // Verify ownership before deleting
    const owning = await verifyTenantOwnership('service', id, session!.user)
    if (!owning.ok) return owning.response

    // Soft delete
    const service = await db.service.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Delete service error:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
