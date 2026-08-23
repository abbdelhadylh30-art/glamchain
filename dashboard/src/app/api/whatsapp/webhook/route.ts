import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/whatsapp/webhook
// Meta calls this to verify the webhook during setup.
// The verify token must match WHATSAPP_WEBHOOK_VERIFY_TOKEN env var.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'glamchain_verify'

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST /api/whatsapp/webhook
// Meta calls this when:
//   1. A message status changes (sent → delivered → read → failed)
//   2. A customer sends an inbound message (e.g., replies "C" to confirm)
//
// We update the WhatsAppMessageLog status based on the delivery receipt.
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Meta webhook payload structure:
    // { entry: [{ changes: [{ value: { messages: [...], statuses: [...] } }] }] }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value

        // === DELIVERY RECEIPTS ===
        for (const status of value.statuses || []) {
          const messageId = status.id
          const statusValue = status.status  // "sent", "delivered", "read", "failed"
          const timestamp = status.timestamp

          // Find the message log by Meta message ID
          const log = await db.whatsAppMessageLog.findFirst({
            where: { messageId },
          })

          if (log) {
            const updates: Record<string, unknown> = { status: statusValue }
            if (statusValue === 'delivered') updates.deliveredAt = new Date(parseInt(timestamp) * 1000)
            if (statusValue === 'read') updates.readAt = new Date(parseInt(timestamp) * 1000)

            await db.whatsAppMessageLog.update({
              where: { id: log.id },
              data: updates,
            })
          }
        }

        // === INBOUND MESSAGES (customer replies) ===
        for (const message of value.messages || []) {
          const from = message.from  // customer's phone
          const text = message.text?.body?.trim().toUpperCase()
          const messageId = message.id

          // Log the inbound message
          await db.whatsAppMessageLog.create({
            data: {
              tenantId: value.metadata?.phone_number_id || 'unknown',
              phoneNumber: from,
              direction: 'inbound',
              messageId,
              status: 'received',
              content: message.text?.body || '',
            },
          })

          // Handle common replies:
          // "C" = confirm appointment
          // "R" = reschedule (mark as pending, staff will follow up)
          if (text === 'C' || text === 'CONFIRM') {
            // Find the most recent pending appointment for this customer
            // and mark it as confirmed
            const customer = await db.customer.findFirst({
              where: { phone: { contains: from.slice(-8) } },
              orderBy: { createdAt: 'desc' },
            })
            if (customer) {
              const appt = await db.appointment.findFirst({
                where: { customerId: customer.id, status: 'pending' },
                orderBy: { date: 'desc' },
              })
              if (appt) {
                await db.appointment.update({
                  where: { id: appt.id },
                  data: { status: 'confirmed' },
                })
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ ok: true })  // always return 200 to Meta (otherwise it retries)
  }
}
