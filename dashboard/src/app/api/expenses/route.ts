import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter, verifyTenantOwnership } from '@/lib/permissions'
import { expenseCreateSchema, expenseUpdateSchema, formatZodError } from '@/lib/validations'

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('expenses_view')
  if (!authorized) return response

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // MULTI-TENANT SCOPE — every query in this handler is tenant-scoped
    const scope = getDataScopeFilter(session!)
    const where: Record<string, unknown> = { ...scope }
    if (locationId) where.locationId = locationId
    if (category) where.category = category

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          location: { select: { name: true } },
        }
      }),
      db.expense.count({ where })
    ])

    const enriched = expenses.map(e => ({
      ...e,
      locationName: e.location.name,
    }))

    return NextResponse.json({ expenses: enriched, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Expenses API error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized, response, session } = await authorize('expenses_create')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = expenseCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { locationId, category, description, amount, date } = result.data

    // MULTI-TENANT: derive tenantId from the location (never trust request body)
    const location = await db.location.findUnique({
      where: { id: locationId },
      select: { tenantId: true, isActive: true },
    })
    if (!location || !location.isActive) {
      return NextResponse.json({ error: 'Location not found or inactive' }, { status: 404 })
    }
    const tenantId = location.tenantId

    const expense = await db.expense.create({
      data: {
        tenantId,
        locationId,
        category,
        description,
        amount,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { authorized, response, session } = await authorize('expenses_update')
  if (!authorized) return response

  try {
    const body = await request.json()

    // Validate input with Zod
    const result = expenseUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { id, locationId, category, description, amount, date } = result.data

    // Verify this expense belongs to the current tenant before updating
    const owning = await verifyTenantOwnership('expense', id, session!.user)
    if (!owning.ok) return owning.response

    // Field allowlist — prevent mass assignment (Zod already validates types)
    const expenseData: Record<string, unknown> = {}
    if (locationId !== undefined) expenseData.locationId = locationId
    if (category !== undefined) expenseData.category = category
    if (description !== undefined) expenseData.description = description
    if (amount !== undefined) expenseData.amount = amount
    if (date !== undefined) expenseData.date = new Date(date)

    const expense = await db.expense.update({
      where: { id },
      data: expenseData,
      include: {
        location: { select: { name: true } },
      }
    })

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { authorized, response, session } = await authorize('expenses_delete')
  if (!authorized) return response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Expense id is required' }, { status: 400 })
    }

    // Verify ownership before deleting
    const owning = await verifyTenantOwnership('expense', id, session!.user)
    if (!owning.ok) return owning.response

    await db.expense.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
