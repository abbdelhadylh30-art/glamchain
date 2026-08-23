import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter, verifyTenantOwnership } from '@/lib/permissions'
import { customerCreateSchema, customerUpdateSchema, formatZodError } from '@/lib/validations'

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('customers_view')
  if (!authorized) return response

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // MULTI-TENANT SCOPE — every query in this handler is tenant-scoped
    const scope = getDataScopeFilter(session!)
    const where: Record<string, unknown> = { ...scope }
    if (locationId) where.locationId = locationId
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          location: { select: { name: true } },
        }
      }),
      db.customer.count({ where })
    ])

    const enriched = customers.map(c => ({
      ...c,
      locationName: c.location?.name || null,
    }))

    // Stats — tenant-scoped
    const totalCustomers = await db.customer.count({ where: { ...scope, ...(locationId ? { locationId } : {}) } })
    const avgSpent = await db.customer.aggregate({
      where: { ...scope, ...(locationId ? { locationId } : {}) },
      _avg: { totalSpent: true }
    })
    const avgVisits = await db.customer.aggregate({
      where: { ...scope, ...(locationId ? { locationId } : {}) },
      _avg: { totalVisits: true }
    })

    return NextResponse.json({
      customers: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalCustomers,
        avgSpent: Math.round((avgSpent._avg.totalSpent || 0) * 100) / 100,
        avgVisits: Math.round((avgVisits._avg.totalVisits || 0) * 10) / 10,
      }
    })
  } catch (error) {
    console.error('Customers API error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized, response, session } = await authorize('customers_create')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = customerCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { name, email, phone, locationId, notes } = result.data

    // Inject tenantId from session — never trust the request body for tenantId
    const tenantId = session!.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context for this user' }, { status: 403 })
    }

    const customer = await db.customer.create({
      data: {
        tenantId,
        name,
        email: email || null,
        phone,
        locationId: locationId || null,
        notes: notes || null,
        loyaltyPoints: 0,
        totalSpent: 0,
        totalVisits: 0,
      },
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { authorized, response, session } = await authorize('customers_update')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = customerUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { id, name, email, phone, locationId, notes } = result.data

    // Verify this customer belongs to the current tenant before updating
    const owning = await verifyTenantOwnership('customer', id, session!.user)
    if (!owning.ok) return owning.response

    // Field allowlist — prevent mass assignment (totalSpent, loyaltyPoints, totalVisits are server-managed)
    const customerData: Record<string, unknown> = {}
    if (name !== undefined) customerData.name = name
    if (email !== undefined) customerData.email = email
    if (phone !== undefined) customerData.phone = phone
    if (locationId !== undefined) customerData.locationId = locationId
    if (notes !== undefined) customerData.notes = notes

    const customer = await db.customer.update({
      where: { id },
      data: customerData,
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { authorized, response, session } = await authorize('customers_delete')
  if (!authorized) return response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 })
    }

    // Verify ownership before deleting
    const owning = await verifyTenantOwnership('customer', id, session!.user)
    if (!owning.ok) return owning.response

    await db.customer.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
