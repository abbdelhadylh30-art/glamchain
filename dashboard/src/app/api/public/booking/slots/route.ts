import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'

// GET /api/public/booking/slots?stylistId=xxx&date=2024-01-15&locationId=xxx
// Public (unauthenticated) endpoint that returns available 30-min time slots for a stylist on a given date

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export async function GET(request: Request) {
  // Rate limit public booking endpoints
  const clientIp = getClientIp(request)
  const rateCheck = await checkRateLimit(`public-booking:${clientIp}`, RATE_LIMITS.PUBLIC_BOOKING.limit, RATE_LIMITS.PUBLIC_BOOKING.windowMs)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const stylistId = searchParams.get('stylistId')
  const date = searchParams.get('date')
  const locationId = searchParams.get('locationId')

  if (!stylistId || !date || !locationId) {
    return NextResponse.json(
      { error: 'Missing required query parameters: stylistId, date, locationId' },
      { status: 400 }
    )
  }

  try {
    // Get location with operating hours + tenantId (for tenant scoping)
    const location = await db.location.findUnique({
      where: { id: locationId, isActive: true },
      select: { id: true, name: true, openTime: true, closeTime: true, tenantId: true },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found or inactive' }, { status: 404 })
    }

    // Verify stylist exists, is active, belongs to the location AND the same tenant
    const stylist = await db.stylist.findUnique({
      where: { id: stylistId },
      select: { id: true, name: true, isActive: true, locationId: true, tenantId: true },
    })

    if (!stylist || !stylist.isActive || stylist.locationId !== locationId || stylist.tenantId !== location.tenantId) {
      return NextResponse.json(
        { error: 'Stylist not found, inactive, or not at this location' },
        { status: 404 }
      )
    }

    // Get the stylist's existing appointments for the requested date
    const requestedDate = new Date(date)
    const dayStart = new Date(requestedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(requestedDate)
    dayEnd.setHours(23, 59, 59, 999)

    const existingAppointments = await db.appointment.findMany({
      where: {
        stylistId,
        tenantId: location.tenantId,  // tenant-scoped
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          in: ['confirmed', 'pending'],
        },
      },
      include: {
        service: { select: { duration: true } },
      },
    })

    // Build a list of booked time ranges in minutes from midnight
    const bookedRanges = existingAppointments.map((appt) => {
      const apptDate = new Date(appt.date)
      const startMinutes = apptDate.getHours() * 60 + apptDate.getMinutes()
      const endMinutes = startMinutes + appt.service.duration
      return { start: startMinutes, end: endMinutes }
    })

    // Generate 30-minute time slots from openTime to closeTime
    const openMinutes = timeToMinutes(location.openTime)
    const closeMinutes = timeToMinutes(location.closeTime)

    const slots: { time: string; available: boolean }[] = []

    for (let slotStart = openMinutes; slotStart < closeMinutes; slotStart += 30) {
      const slotEnd = Math.min(slotStart + 30, closeMinutes)

      // A slot is available if it doesn't overlap with any existing appointment.
      // For the purpose of checking availability, we consider a slot occupied if
      // ANY part of it overlaps with a booked range. This is because even a 30-min
      // slot check should account for the fact that the actual service may be longer.
      // However, the more useful check is: can a standard 30-min service be booked here?
      // We check if the slot start falls within any booked range or a booked range
      // starts during this slot.
      const isOverlapping = bookedRanges.some(
        (range) => slotStart < range.end && range.start < slotEnd
      )

      slots.push({
        time: minutesToTime(slotStart),
        available: !isOverlapping,
      })
    }

    return NextResponse.json({
      date,
      stylistId,
      stylistName: stylist.name,
      locationName: location.name,
      openTime: location.openTime,
      closeTime: location.closeTime,
      slots,
    })
  } catch (error) {
    console.error('Public booking slots GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 })
  }
}
