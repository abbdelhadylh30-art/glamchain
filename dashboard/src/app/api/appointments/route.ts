import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter, verifyTenantOwnership } from '@/lib/permissions'
import { findConflict, recalcCustomerStats } from '@/lib/booking'
import { appointmentCreateSchema, appointmentUpdateSchema, formatZodError } from '@/lib/validations'

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('appointments_view')
  if (!authorized) return response

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')
  const status = searchParams.get('status')
  const date = searchParams.get('date')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const scope = getDataScopeFilter(session!)
    const where: Record<string, unknown> = { ...scope }
    if (locationId) where.locationId = locationId
    if (status) where.status = status
    if (date) {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)
      where.date = { gte: start, lt: end }
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          location: { select: { name: true } },
          customer: { select: { name: true } },
          stylist: { select: { name: true } },
          service: { select: { name: true, price: true, duration: true } },
        }
      }),
      db.appointment.count({ where })
    ])

    const enriched = appointments.map(a => ({
      ...a,
      locationName: a.location.name,
      customerName: a.customer.name,
      stylistName: a.stylist.name,
      serviceName: a.service.name,
      servicePrice: a.service.price,
      serviceDuration: a.service.duration,
    }))

    return NextResponse.json({ appointments: enriched, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Appointments API error:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized, response, session } = await authorize('appointments_create')
  if (!authorized) return response

  try {
    const body = await request.json()

    const result = appointmentCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { locationId, customerId, stylistId, serviceId, date, status, paymentMethod, notes, totalPrice } = result.data

    // MULTI-TENANT: derive tenantId from the location (never trust request body)
    const location = await db.location.findUnique({
      where: { id: locationId },
      select: { tenantId: true, isActive: true },
    })
    if (!location || !location.isActive) {
      return NextResponse.json({ error: 'Location not found or inactive' }, { status: 404 })
    }
    const tenantId = location.tenantId

    // Verify all referenced resources belong to the same tenant
    const [service, stylist, customer] = await Promise.all([
      db.service.findUnique({ where: { id: serviceId }, select: { tenantId: true, duration: true, price: true, isActive: true } }),
      db.stylist.findUnique({ where: { id: stylistId }, select: { tenantId: true, isActive: true, locationId: true } }),
      db.customer.findUnique({ where: { id: customerId }, select: { tenantId: true } }),
    ])
    if (!service || !service.isActive || service.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Service not found in this tenant' }, { status: 404 })
    }
    if (!stylist || !stylist.isActive || stylist.tenantId !== tenantId || stylist.locationId !== locationId) {
      return NextResponse.json({ error: 'Stylist not found at this location' }, { status: 404 })
    }
    if (!customer || customer.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Customer not found in this tenant' }, { status: 404 })
    }

    let finalPrice = totalPrice
    if (finalPrice === undefined || finalPrice === null) {
      finalPrice = service.price
    }

    const appointmentDate = new Date(date)
    const serviceDuration = service.duration
    const newStart = appointmentDate
    const newEnd = new Date(appointmentDate.getTime() + serviceDuration * 60000)

    // TRANSACTION: conflict check + create must be atomic.
    // Without this, two concurrent booking requests for the same stylist+time
    // both pass the overlap check and both save — a race condition.
    const appointment = await db.$transaction(async (tx) => {
      const dayStart = new Date(appointmentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(appointmentDate)
      dayEnd.setHours(23, 59, 59, 999)

      const existingAppointments = await tx.appointment.findMany({
        where: {
          stylistId,
          tenantId,
          date: { gte: dayStart, lte: dayEnd },
          status: { in: ['confirmed', 'pending'] },
        },
        include: { service: { select: { duration: true } } },
      })

      // Conflict detection via the shared findConflict helper
      const conflict = findConflict(
        existingAppointments.map(a => ({ id: a.id, date: a.date, service: { duration: a.service.duration } })),
        { date: appointmentDate, durationMin: serviceDuration },
      )
      if (conflict) {
        const existingStart = new Date(conflict.date)
        const existingEnd = new Date(existingStart.getTime() + conflict.service.duration * 60000)
        throw Object.assign(new Error('TIME_CONFLICT'), {
          conflict: {
            existingAppointmentId: conflict.id,
            existingStart: existingStart.toISOString(),
            existingEnd: existingEnd.toISOString(),
          },
        })
      }

      // Create — NOTE: stats are NOT incremented here. Stats are recalculated
      // on status transition to 'completed' (see PUT handler below).
      // Previously, stats were bumped at booking time, which inflated them
      // permanently if the appointment was later cancelled or no-showed.
      return tx.appointment.create({
        data: {
          tenantId,
          locationId,
          customerId,
          stylistId,
          serviceId,
          date: appointmentDate,
          status: status || 'confirmed',
          paymentMethod: paymentMethod || null,
          notes: notes || null,
          totalPrice: finalPrice,
        },
        include: {
          location: { select: { name: true } },
          customer: { select: { name: true } },
          stylist: { select: { name: true } },
          service: { select: { name: true, price: true, duration: true } },
        }
      })
    }).catch((err: any) => {
      if (err?.message === 'TIME_CONFLICT') {
        return { __conflict: err.conflict }
      }
      throw err
    })

    // Handle conflict result (thrown from inside the transaction)
    if (appointment && typeof appointment === 'object' && '__conflict' in appointment) {
      return NextResponse.json(
        {
          error: 'This stylist already has an appointment at this time. Please choose a different time.',
          conflict: (appointment as any).__conflict,
        },
        { status: 409 }
      )
    }

    // If the new appointment is being created directly as 'completed' (rare but possible
    // — e.g. backdated data entry), recalculate the customer's stats to reflect it.
    if ((appointment as any).status === 'completed') {
      await db.$transaction(async (tx) => {
        await recalcCustomerStats(tx, customerId)
      })
    }

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Create appointment error:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { authorized, response, session } = await authorize('appointments_update')
  if (!authorized) return response

  try {
    const body = await request.json()

    const result = appointmentUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { id, locationId, customerId, stylistId, serviceId, date, status, paymentMethod, notes, totalPrice } = result.data

    // Verify ownership before updating
    const owning = await verifyTenantOwnership('appointment', id, session!.user)
    if (!owning.ok) return owning.response

    // Fetch the current state to know the previous status (for stats recalc)
    // and the previous date/stylistId (for conflict detection on edit)
    const current = await db.appointment.findUnique({
      where: { id },
      select: {
        status: true,
        date: true,
        stylistId: true,
        customerId: true,
        serviceId: true,
        service: { select: { duration: true, tenantId: true, isActive: true } },
        tenantId: true,
      },
    })
    if (!current) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Build the update data (field allowlist — Zod already validated)
    const appointmentData: Record<string, unknown> = {}
    if (locationId !== undefined) appointmentData.locationId = locationId
    if (customerId !== undefined) appointmentData.customerId = customerId
    if (stylistId !== undefined) appointmentData.stylistId = stylistId
    if (serviceId !== undefined) appointmentData.serviceId = serviceId
    if (date !== undefined) appointmentData.date = new Date(date)
    if (status !== undefined) appointmentData.status = status
    if (paymentMethod !== undefined) appointmentData.paymentMethod = paymentMethod
    if (notes !== undefined) appointmentData.notes = notes
    if (totalPrice !== undefined) appointmentData.totalPrice = totalPrice

    // Determine if conflict detection is needed: only when the date OR stylistId
    // is being changed. Status-only updates don't need it.
    const effectiveStylistId = stylistId ?? current.stylistId
    const effectiveDate = date !== undefined ? new Date(date) : current.date
    const needsConflictCheck = (date !== undefined) || (stylistId !== undefined)

    // Resolve the service duration for the new service (if changing) or current one
    let serviceDuration: number
    if (serviceId !== undefined && serviceId !== current.serviceId) {
      const newService = await db.service.findUnique({
        where: { id: serviceId },
        select: { duration: true, tenantId: true, isActive: true },
      })
      if (!newService || !newService.isActive || newService.tenantId !== current.tenantId) {
        return NextResponse.json({ error: 'Service not found in this tenant' }, { status: 404 })
      }
      serviceDuration = newService.duration
    } else {
      serviceDuration = current.service.duration
    }

    // Run update + stats recalculation atomically
    const updated = await db.$transaction(async (tx) => {
      // CONFLICT DETECTION on edit (only when date/stylist changes)
      if (needsConflictCheck) {
        const dayStart = new Date(effectiveDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(effectiveDate)
        dayEnd.setHours(23, 59, 59, 999)

        const existingAppointments = await tx.appointment.findMany({
          where: {
            stylistId: effectiveStylistId,
            tenantId: current.tenantId,
            date: { gte: dayStart, lte: dayEnd },
            status: { in: ['confirmed', 'pending'] },
            // Exclude the appointment being updated itself
            id: { not: id },
          },
          include: { service: { select: { duration: true } } },
        })

        // Conflict detection via the shared findConflict helper
        // (id-exclusion is belt-and-suspenders — the query already excluded self)
        const conflict = findConflict(
          existingAppointments.map(a => ({ id: a.id, date: a.date, service: { duration: a.service.duration } })),
          { date: effectiveDate, durationMin: serviceDuration },
          id,
        )
        if (conflict) {
          const existingStart = new Date(conflict.date)
          const existingEnd = new Date(existingStart.getTime() + conflict.service.duration * 60 * 1000)
          throw Object.assign(new Error('TIME_CONFLICT'), {
            conflict: {
              existingAppointmentId: conflict.id,
              existingStart: existingStart.toISOString(),
              existingEnd: existingEnd.toISOString(),
            },
          })
        }
      }

      const result = await tx.appointment.update({
        where: { id },
        data: appointmentData,
        include: {
          location: { select: { name: true } },
          customer: { select: { name: true } },
          stylist: { select: { name: true } },
          service: { select: { name: true, price: true, duration: true } },
        }
      })

      // STATS RECALS — if the status changed OR customerId changed, the customer's
      // loyalty stats may need updating. Recalculate from scratch (idempotent).
      // This handles all transitions: completed→cancelled (decrement), pending→completed
      // (increment), and customer reassignment (recalc both old and new customer).
      if (status !== undefined || customerId !== undefined) {
        // Recalculate the (possibly new) customer
        const targetCustomer = customerId ?? current.customerId
        await recalcCustomerStats(tx, targetCustomer)
        // If the customer was reassigned, also recalculate the old customer's stats
        if (customerId !== undefined && customerId !== current.customerId) {
          await recalcCustomerStats(tx, current.customerId)
        }
      }

      return result
    }).catch((err: any) => {
      if (err?.message === 'TIME_CONFLICT') {
        return { __conflict: err.conflict }
      }
      throw err
    })

    if (updated && typeof updated === 'object' && '__conflict' in updated) {
      return NextResponse.json(
        {
          error: 'This stylist already has an appointment at this time. Please choose a different time.',
          conflict: (updated as any).__conflict,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ appointment: updated })
  } catch (error) {
    console.error('Update appointment error:', error)
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { authorized, response, session } = await authorize('appointments_delete')
  if (!authorized) return response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Appointment id is required' }, { status: 400 })
    }

    const owning = await verifyTenantOwnership('appointment', id, session!.user)
    if (!owning.ok) return owning.response

    // Fetch the appointment to know its customerId + previous status
    // (for stats recalculation after deletion)
    const current = await db.appointment.findUnique({
      where: { id },
      select: { customerId: true, status: true },
    })
    if (!current) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Transaction: delete + recalc stats
    await db.$transaction(async (tx) => {
      await tx.appointment.delete({ where: { id } })
      // Recalculate the customer's stats — if the deleted appointment was
      // 'completed', this decrements their totals. If it was 'pending'/
      // 'cancelled'/'no_show', stats don't change (since they were never
      // incremented for those statuses anyway). Idempotent either way.
      await recalcCustomerStats(tx, current.customerId)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete appointment error:', error)
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 })
  }
}
