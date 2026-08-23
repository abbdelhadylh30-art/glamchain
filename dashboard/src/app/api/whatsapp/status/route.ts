import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter } from '@/lib/permissions'
import { getWhatsAppStatus } from '@/lib/whatsapp'

// GET /api/whatsapp/status
// Returns the WhatsApp configuration status + recent message log.
// Used by the dashboard's WhatsApp settings panel.
export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('settings_view')
  if (!authorized) return response

  try {
    const scope = getDataScopeFilter(session!)
    const status = getWhatsAppStatus()

    // Fetch recent WhatsApp messages (last 50)
    const messages = await db.whatsAppMessageLog.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        phoneNumber: true,
        direction: true,
        templateName: true,
        status: true,
        content: true,
        error: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        createdAt: true,
        appointmentId: true,
        customerId: true,
      },
    })

    // Stats
    const totalSent = await db.whatsAppMessageLog.count({ where: { ...scope, direction: 'outbound' } })
    const delivered = await db.whatsAppMessageLog.count({ where: { ...scope, direction: 'outbound', status: 'delivered' } })
    const read = await db.whatsAppMessageLog.count({ where: { ...scope, direction: 'outbound', status: 'read' } })
    const failed = await db.whatsAppMessageLog.count({ where: { ...scope, direction: 'outbound', status: 'failed' } })

    return NextResponse.json({
      config: status,
      stats: { totalSent, delivered, read, failed },
      messages,
    })
  } catch (error) {
    console.error('WhatsApp status error:', error)
    return NextResponse.json({ error: 'Failed to fetch WhatsApp status' }, { status: 500 })
  }
}
