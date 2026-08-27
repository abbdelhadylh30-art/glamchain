import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter } from '@/lib/permissions'
import { isWhatsAppConfigured } from '@/lib/whatsapp'

/**
 * Marketing API — campaigns + audience segments for the salon owner.
 *
 * GET    → campaigns list + computed segment counts + whatsapp status
 * POST   → create a campaign (draft or scheduled)
 * PATCH  → { id, action: 'send' | 'cancel' | 'schedule', scheduledFor? }
 */

const SEGMENT_DEFS = [
  { id: 'vip', label: 'VIP Guests', description: 'Total spend over QR 1,000 or 8+ visits', minSpend: 1000, minVisits: 8 },
  { id: 'at_risk', label: 'At-Risk (45+ days)', description: "Haven't visited in 45 days or more", days: 45 },
  { id: 'no_show', label: 'Recent No-Shows', description: 'Missed an appointment in the last 60 days' },
  { id: 'new_guests', label: 'New Guests', description: 'First visit in the last 30 days' },
  { id: 'all', label: 'All Guests', description: 'Every guest on the books' },
] as const

async function computeSegments(scope: Record<string, unknown>) {
  const customers = await db.customer.findMany({
    where: scope,
    select: { id: true, totalSpent: true, totalVisits: true, lastVisit: true, createdAt: true },
  })

  const now = Date.now()
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000)

  const noShowCustomers = await db.appointment.findMany({
    where: { status: 'no_show', date: { gte: daysAgo(60) }, ...scope },
    select: { customerId: true },
  })
  const noShowIds = new Set(noShowCustomers.map((a) => a.customerId))

  return SEGMENT_DEFS.map((def) => {
    let count = 0
    switch (def.id) {
      case 'vip':
        count = customers.filter((c) => c.totalSpent >= def.minSpend || c.totalVisits >= def.minVisits).length
        break
      case 'at_risk':
        count = customers.filter((c) => c.lastVisit && c.lastVisit < daysAgo(def.days)).length
        break
      case 'no_show':
        count = noShowIds.size
        break
      case 'new_guests':
        count = customers.filter((c) => c.createdAt >= daysAgo(30)).length
        break
      case 'all':
        count = customers.length
        break
    }
    return { id: def.id, label: def.label, description: def.description, count }
  })
}

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('marketing_view')
  if (!authorized) return response

  const scope = getDataScopeFilter(session!)

  try {
    let campaigns = await db.campaign.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
    })

    // First-run demo data so the view never looks empty
    if (campaigns.length === 0) {
      const tenantIds = scope.tenantId
        ? [scope.tenantId as string]
        : (await db.tenant.findMany({ select: { id: true } })).map((t) => t.id)
      if (tenantIds.length) {
        await db.campaign.createMany({
          data: [
            { tenantId: tenantIds[0], name: 'We miss you — 25% welcome back', type: 'win_back', channel: 'whatsapp', status: 'sent', segment: 'at_risk', message: "Hi {name} 💛 It's been a while since we saw you at GlamChain! Come back this week and enjoy 25% off your favourite ritual. Reply to book your chair.", audienceCount: 14, sentCount: 14, sentAt: new Date(Date.now() - 6 * 24 * 3600 * 1000) },
            { tenantId: tenantIds[0], name: 'Tuesday Glow — quiet-hours offer', type: 'offer', channel: 'whatsapp', status: 'sent', segment: 'all', message: 'Good morning {name}! Our chairs are quiet this Tuesday 10am–2pm — enjoy 20% off all hair rituals in those hours. Tap to grab a slot before they go ✨', audienceCount: 42, sentCount: 42, sentAt: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
            { tenantId: tenantIds[0], name: 'Keratin season is here', type: 'new_service', channel: 'whatsapp', status: 'scheduled', segment: 'vip', message: '{name}, our new Keratin Silk Ritual just landed — and as one of our VIPs you get first access + a complimentary gloss. Shall I hold a chair for you?', audienceCount: 9, scheduledFor: new Date(Date.now() + 2 * 24 * 3600 * 1000) },
            { tenantId: tenantIds[0], name: 'Share your glow — review request', type: 'review', channel: 'whatsapp', status: 'draft', segment: 'new_guests', message: 'Thank you for visiting GlamChain, {name}! If you loved your ritual, would you share a quick review? It means the world to our artists 💛', audienceCount: 6 },
          ],
        })
        campaigns = await db.campaign.findMany({ where: scope, orderBy: { createdAt: 'desc' } })
      }
    }

    const segments = await computeSegments(scope)

    return NextResponse.json({
      campaigns,
      segments,
      whatsappConfigured: isWhatsAppConfigured(),
      whatsappProvider: process.env.WHATSAPP_PROVIDER || 'mock',
    })
  } catch (error) {
    console.error('GET /api/marketing error:', error)
    return NextResponse.json({ error: 'Failed to load marketing data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized, response, session } = await authorize('marketing_manage')
  if (!authorized) return response

  try {
    const body = await request.json()
    const { name, type, channel, message, segment, scheduledFor } = body

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name and message are required' }, { status: 400 })
    }

    const scope = getDataScopeFilter(session!)
    // Platform super_admin (no tenant of their own) acts on the first tenant —
    // same fallback the demo seeding uses.
    const tenantId = (scope.tenantId as string | undefined)
      || (await db.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant exists yet — create one in Settings first' }, { status: 400 })
    }

    // Audience size at creation time
    const segments = await computeSegments(scope)
    const seg = segments.find((s) => s.id === (segment || 'all'))

    const campaign = await db.campaign.create({
      data: {
        tenantId,
        name: name.trim(),
        type: type || 'custom',
        channel: channel || 'whatsapp',
        status: scheduledFor ? 'scheduled' : 'draft',
        message: message.trim(),
        segment: segment || 'all',
        audienceCount: seg?.count ?? 0,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('POST /api/marketing error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { authorized, response, session } = await authorize('marketing_manage')
  if (!authorized) return response

  try {
    const { id, action, scheduledFor } = await request.json()
    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    }

    const scope = getDataScopeFilter(session!)
    const campaign = await db.campaign.findFirst({ where: { id, ...scope } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (action === 'send') {
      // Mock provider: mark as sent instantly. With WHATSAPP_PROVIDER=meta,
      // a real dispatch loop would fire here per opted-in guest.
      const updated = await db.campaign.update({
        where: { id },
        data: { status: 'sent', sentAt: new Date(), sentCount: campaign.audienceCount },
      })
      return NextResponse.json(updated)
    }

    if (action === 'cancel') {
      const updated = await db.campaign.update({
        where: { id },
        data: { status: 'cancelled', scheduledFor: null },
      })
      return NextResponse.json(updated)
    }

    if (action === 'schedule') {
      if (!scheduledFor) {
        return NextResponse.json({ error: 'scheduledFor is required to schedule' }, { status: 400 })
      }
      const updated = await db.campaign.update({
        where: { id },
        data: { status: 'scheduled', scheduledFor: new Date(scheduledFor) },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/marketing error:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}
