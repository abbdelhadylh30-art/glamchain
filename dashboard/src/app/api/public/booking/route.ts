import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'
import { publicBookingSchema, formatZodError } from '@/lib/validations'
import { sendWhatsAppMessage, buildConfirmationMessage, isWhatsAppConfigured } from '@/lib/whatsapp'

// GET /api/public/booking?locationId=xxx
// Public (unauthenticated) endpoint for the landing page booking widget
export async function GET(request: Request) {
  const clientIp = getClientIp(request)
  const rateCheck = await checkRateLimit(`public-booking:${clientIp}`, RATE_LIMITS.PUBLIC_BOOKING.limit, RATE_LIMITS.PUBLIC_BOOKING.windowMs)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  if (!locationId) {
    return NextResponse.json({ error: 'locationId query parameter is required' }, { status: 400 })
  }

  try {
    const location = await db.location.findUnique({
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

    const tenantId = location.tenantId

    const [services, stylists] = await Promise.all([
      // Services are now tenant-scoped (not global)
      db.service.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: {
          id: true, name: true, category: true,
          duration: true, price: true, description: true,
        },
      }),
      db.stylist.findMany({
        where: { tenantId, locationId, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, specialization: true,
          rating: true, avatar: true,
        },
      }),
    ])

    // Group services by category
    const categories = [...new Set(services.map((s) => s.category))]
    const servicesGrouped = categories.map((cat) => ({
      category: cat,
      services: services.filter((s) => s.category === cat),
    }))

    return NextResponse.json({
      location: {
        id: location.id, name: location.name, address: location.address,
        city: location.city, phone: location.phone, email: location.email,
        openTime: location.openTime, closeTime: location.closeTime,
      },
      services: servicesGrouped,
      stylists,
    })
  } catch (error) {
    console.error('Public booking GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch booking data' }, { status: 500 })
  }
}

// POST /api/public/booking
// Public (unauthenticated) endpoint to create a booking from the landing page.
// Tenant scoping is derived from the location's tenantId (not from the request body)
// — a malicious tenant can't claim another tenant's location.
export async function POST(request: Request) {
  const clientIp = getClientIp(request)
  const rateCheck = await checkRateLimit(`public-booking:${clientIp}`, RATE_LIMITS.PUBLIC_BOOKING.limit, RATE_LIMITS.PUBLIC_BOOKING.windowMs)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const result = publicBookingSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { locationId, stylistId, serviceId, customerName, customerPhone, customerEmail, date, notes, whatsappConsent } = result.data

    // Verify the location exists, is active, and derive the tenantId from it
    const location = await db.location.findUnique({
      where: { id: locationId, isActive: true },
      select: { id: true, name: true, tenantId: true },
    })
    if (!location) {
      return NextResponse.json({ error: 'Location not found or inactive' }, { status: 404 })
    }
    const tenantId = location.tenantId

    // Verify the stylist exists, is active, belongs to the location AND the tenant
    const stylist = await db.stylist.findUnique({
      where: { id: stylistId },
      select: { id: true, isActive: true, locationId: true, tenantId: true },
    })
    if (!stylist || !stylist.isActive || stylist.locationId !== locationId || stylist.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Stylist not found, inactive, or not at this location' },
        { status: 404 }
      )
    }

    // Verify the service exists, is active, AND belongs to the same tenant
    // (prevents a malicious widget from booking a service from a different tenant's catalog)
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, isActive: true, duration: true, price: true, tenantId: true },
    })
    if (!service || !service.isActive || service.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Service not found or inactive' }, { status: 404 })
    }

    // Find or create customer by phone — NOW SCOPED PER TENANT
    // (same phone can exist in two different tenants' customer lists)
    let customer = await db.customer.findFirst({
      where: { phone: customerPhone, tenantId },
    })

    if (customer) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          email: customerEmail ?? customer.email,
          locationId,
        },
      })
    } else {
      customer = await db.customer.create({
        data: {
          tenantId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
          locationId,
        },
      })
    }

    // Check for time conflicts (scoped to the stylist)
    const appointmentDate = new Date(date)
    const serviceDuration = service.duration
    const newStart = appointmentDate
    const newEnd = new Date(appointmentDate.getTime() + serviceDuration * 60 * 1000)

    const dayStart = new Date(appointmentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(appointmentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const existingAppointments = await db.appointment.findMany({
      where: {
        stylistId,
        tenantId,  // tenant-scoped
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ['confirmed', 'pending'] },
      },
      include: { service: { select: { duration: true } } },
    })

    for (const existing of existingAppointments) {
      const existingStart = new Date(existing.date)
      const existingEnd = new Date(existingStart.getTime() + existing.service.duration * 60 * 1000)
      if (newStart < existingEnd && existingStart < newEnd) {
        return NextResponse.json(
          {
            error: 'Time conflict: the stylist already has an appointment that overlaps with the requested time',
            conflict: {
              existingAppointmentId: existing.id,
              existingStart: existingStart.toISOString(),
              existingEnd: existingEnd.toISOString(),
            },
          },
          { status: 409 }
        )
      }
    }

    // Create the appointment — tenantId comes from the location, NOT from the request body
    const appointment = await db.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          tenantId,
          locationId,
          customerId: customer.id,
          stylistId,
          serviceId,
          date: appointmentDate,
          status: 'pending',
          notes: notes || null,
          totalPrice: service.price,
          whatsappConsent: whatsappConsent || false,
          whatsappConsentAt: whatsappConsent ? new Date() : null,
        },
        include: {
          location: { select: { name: true, address: true, phone: true } },
          customer: { select: { name: true, phone: true, email: true } },
          stylist: { select: { name: true, specialization: true } },
          service: { select: { name: true, price: true, duration: true } },
        },
      })

      // === WHATSAPP CONFIRMATION ===
      // If the customer opted in AND WhatsApp is configured, send a confirmation message.
      // In mock mode, this logs to console + the DB log table. In meta mode, it calls the Cloud API.
      if (whatsappConsent && isWhatsAppConfigured()) {
        const msg = buildConfirmationMessage({
          customerName: customerName,
          serviceName: service.name,
          dateStr: appointmentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }),
          timeStr: appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          salonName: location.name,
          language: 'ar',  // default to Arabic for Gulf market — could be per-tenant config
        })

        const result = await sendWhatsAppMessage(
          tx, tenantId, created.id, customer.id,
          customerPhone, msg, msg.content,
        )

        // Store the WhatsApp message ID on the appointment for delivery tracking
        if (result.success && result.messageId) {
          await tx.appointment.update({
            where: { id: created.id },
            data: { whatsappMessageId: result.messageId },
          })
        }

        // Update customer's WhatsApp opt-in status
        await tx.customer.update({
          where: { id: customer.id },
          data: { whatsappOptIn: true, whatsappOptInAt: new Date() },
        })
      }

      return created
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Public booking POST error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
