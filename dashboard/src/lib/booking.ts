/**
 * Booking domain logic — extracted from appointments/route.ts so it can be
 * unit-tested without mocking the route handler.
 *
 * Two pieces of logic:
 *   1. findConflict() — pure function. Interval-overlap detection.
 *   2. recalcCustomerStats(tx, customerId) — needs a Prisma transaction
 *      client; tested against a real temp DB in __tests__/booking.test.ts.
 */

// The transaction client passed to db.$transaction callbacks is a narrowed
// PrismaClient (Omit of $connect/$disconnect/$on/$transaction/$extends).
// We accept `any` for ergonomics — the methods we use exist on both
// PrismaClient and the tx client.
type TxClient = any

export interface AppointmentSlot {
  /** When the new/edited appointment starts (Date object). */
  date: Date
  /** Service duration in minutes — used to compute the end time. */
  durationMin: number
}

export interface ExistingAppointment {
  id: string
  date: Date
  service: { duration: number }
}

/**
 * Find the first appointment in `existing` that overlaps with `newSlot`.
 *
 * Uses proper interval-overlap detection:
 *   two ranges [newStart, newEnd) and [existingStart, existingEnd) overlap iff
 *   newStart < existingEnd && existingStart < newEnd
 *
 * Returns the first conflicting appointment, or null if no conflict.
 *
 * Pass `excludeAppointmentId` to exclude the appointment being edited
 * (used by PUT to not conflict with itself).
 *
 * Edge cases handled:
 *   - Adjacent slots (e.g. 10:00-10:30 and 10:30-11:00) → NO conflict
 *     (intervals are half-open: [start, end))
 *   - Identical time slot → conflict
 *   - Partial overlap (e.g. 10:00-10:30 vs 10:15-10:45) → conflict
 *   - Full containment (e.g. 10:00-11:00 vs 10:15-10:30) → conflict
 *   - Self-exclusion via excludeAppointmentId → that appt is skipped
 */
export function findConflict(
  existing: ExistingAppointment[],
  newSlot: AppointmentSlot,
  excludeAppointmentId?: string,
): ExistingAppointment | null {
  const newStart = newSlot.date
  const newEnd = new Date(newSlot.date.getTime() + newSlot.durationMin * 60 * 1000)

  for (const appt of existing) {
    if (excludeAppointmentId && appt.id === excludeAppointmentId) continue

    const existingStart = new Date(appt.date)
    const existingEnd = new Date(existingStart.getTime() + appt.service.duration * 60 * 1000)

    if (newStart < existingEnd && existingStart < newEnd) {
      return appt
    }
  }
  return null
}

/**
 * Recalculate a customer's loyalty stats from their completed appointments.
 *
 * Idempotent — call it after any appointment status change, customer
 * reassignment, or deletion. Survives all edge cases:
 *   - pending → completed: stats increment (was previously 0 visits/spent for this appt)
 *   - completed → cancelled: stats decrement (this appt no longer counts)
 *   - completed → no_show: stats decrement
 *   - customer reassignment: both old and new customer's stats get recalculated
 *   - appointment deleted: if it was completed, stats decrement; otherwise no change
 *
 * The query is indexed by (customerId, status), so it's ~1-2ms even for
 * customers with hundreds of past visits.
 *
 * MUST be called inside a transaction to ensure atomicity with the
 * appointment update that triggered the recalculation.
 */
export async function recalcCustomerStats(tx: TxClient, customerId: string): Promise<void> {
  const completed = await tx.appointment.findMany({
    where: { customerId, status: 'completed' },
    select: { totalPrice: true, date: true },
  })
  const totalVisits = completed.length
  const totalSpent = completed.reduce(
    (sum: number, a: { totalPrice: number }) => sum + a.totalPrice,
    0,
  )
  const lastVisit = completed.length > 0
    ? completed.reduce(
        (max: Date, a: { date: Date }) => (a.date > max ? a.date : max),
        completed[0].date,
      )
    : null
  await tx.customer.update({
    where: { id: customerId },
    data: { totalVisits, totalSpent, lastVisit },
  })
}
