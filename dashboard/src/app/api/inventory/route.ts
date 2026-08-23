import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter, verifyTenantOwnership } from '@/lib/permissions'
import { inventoryCreateSchema, inventoryUpdateSchema, formatZodError } from '@/lib/validations'

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('inventory_view')
  if (!authorized) return response

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  try {
    // MULTI-TENANT SCOPE — every query in this handler is tenant-scoped
    const scope = getDataScopeFilter(session!)
    const where: Record<string, unknown> = { ...scope }
    if (locationId) where.locationId = locationId

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        location: { select: { name: true } },
      }
    })

    const enriched = items.map(item => ({
      ...item,
      locationName: item.location.name,
      isLowStock: item.quantity <= item.minStock,
    }))

    // Stats
    const totalItems = items.length
    const lowStockCount = items.filter(i => i.quantity <= i.minStock).length
    const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0)

    // Group by category
    const categories = [...new Set(items.map(i => i.category))]
    const grouped = categories.map(cat => ({
      category: cat,
      items: enriched.filter(i => i.category === cat)
    }))

    return NextResponse.json({
      items: enriched,
      grouped,
      stats: {
        totalItems,
        lowStockCount,
        totalValue: Math.round(totalValue * 100) / 100,
        categories: categories.length,
      }
    })
  } catch (error) {
    console.error('Inventory API error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized, response, session } = await authorize('inventory_create')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = inventoryCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { name, category, quantity, minStock, unitPrice, locationId, supplier } = result.data

    // MULTI-TENANT: derive tenantId from the location (never trust request body)
    const location = await db.location.findUnique({
      where: { id: locationId },
      select: { tenantId: true, isActive: true },
    })
    if (!location || !location.isActive) {
      return NextResponse.json({ error: 'Location not found or inactive' }, { status: 404 })
    }
    const tenantId = location.tenantId

    const item = await db.inventoryItem.create({
      data: {
        tenantId,
        name,
        category,
        quantity,
        minStock,
        unitPrice,
        locationId,
        supplier: supplier || null,
        lastRestocked: new Date(),
      },
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Create inventory item error:', error)
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { authorized, response, session } = await authorize('inventory_update')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = inventoryUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { id, name, category, quantity, minStock, unitPrice, locationId, supplier } = result.data

    // Verify this inventory item belongs to the current tenant before updating
    const owning = await verifyTenantOwnership('inventoryItem', id, session!.user)
    if (!owning.ok) return owning.response

    // Field allowlist — prevent mass assignment (Zod already validates types)
    const inventoryData: Record<string, unknown> = {}
    if (name !== undefined) inventoryData.name = name
    if (category !== undefined) inventoryData.category = category
    if (quantity !== undefined) {
      inventoryData.quantity = quantity
      inventoryData.lastRestocked = new Date()
    }
    if (minStock !== undefined) inventoryData.minStock = minStock
    if (unitPrice !== undefined) inventoryData.unitPrice = unitPrice
    if (locationId !== undefined) inventoryData.locationId = locationId
    if (supplier !== undefined) inventoryData.supplier = supplier

    const item = await db.inventoryItem.update({
      where: { id },
      data: inventoryData,
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Update inventory item error:', error)
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { authorized, response, session } = await authorize('inventory_delete')
  if (!authorized) return response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Inventory item id is required' }, { status: 400 })
    }

    // Verify ownership before deleting
    const owning = await verifyTenantOwnership('inventoryItem', id, session!.user)
    if (!owning.ok) return owning.response

    await db.inventoryItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete inventory item error:', error)
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 })
  }
}
