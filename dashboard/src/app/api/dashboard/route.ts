import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter } from '@/lib/permissions'

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('dashboard_view')
  if (!authorized) return response

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  // MULTI-TENANT SCOPE: every query in this handler is scoped by tenantId
  // from the session (via the locationId-only override for non-super-admin users).
  // For super_admin with no tenantId (platform admin), scope is empty (sees all tenants).
  const scope = getDataScopeFilter(session!)

  try {
    // Base filters — tenant scope (always) + optional locationId
    const appointmentWhere = { ...scope, ...(locationId ? { locationId } : {}) }
    const expenseWhere = { ...scope, ...(locationId ? { locationId } : {}) }

    // Total revenue (from completed appointments)
    const completedAppointments = await db.appointment.findMany({
      where: { ...appointmentWhere, status: 'completed' },
      select: { totalPrice: true, date: true, paymentMethod: true, locationId: true }
    })
    const totalRevenue = completedAppointments.reduce((sum, a) => sum + a.totalPrice, 0)

    // Total appointments
    const totalAppointments = await db.appointment.count({ where: appointmentWhere })

    // Appointments by status
    const appointmentsByStatus = await db.appointment.groupBy({
      by: ['status'],
      where: appointmentWhere,
      _count: { status: true }
    })

    // Total customers
    const totalCustomers = await db.customer.count({
      where: { ...scope, ...(locationId ? { locationId } : {}) }
    })

    // Total stylists
    const totalStylists = await db.stylist.count({
      where: { ...scope, ...(locationId ? { locationId, isActive: true } : { isActive: true }) }
    })

    // Average ticket value
    const avgTicketValue = completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0

    // Revenue by location — use include for location names
    const revenueByLocation = await db.appointment.groupBy({
      by: ['locationId'],
      where: { status: 'completed', ...appointmentWhere },
      _sum: { totalPrice: true },
      _count: { id: true }
    })

    const locations = await db.location.findMany({ where: scope })
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l.name]))

    const revenueByLocationFormatted = revenueByLocation.map(r => ({
      locationId: r.locationId,
      locationName: locationMap[r.locationId] || 'Unknown',
      revenue: r._sum.totalPrice || 0,
      appointments: r._count.id
    }))

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const monthlyAppointments = await db.appointment.findMany({
      where: { status: 'completed', date: { gte: sixMonthsAgo }, ...appointmentWhere },
      select: { totalPrice: true, date: true }
    })

    const monthlyRevenue: Record<string, number> = {}
    monthlyAppointments.forEach(a => {
      const key = `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, '0')}`
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + a.totalPrice
    })

    const monthlyRevenueFormatted = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }))

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {}
    completedAppointments.filter(a => a.paymentMethod).forEach(a => {
      paymentBreakdown[a.paymentMethod!] = (paymentBreakdown[a.paymentMethod!] || 0) + a.totalPrice
    })

    // Service popularity (top 10)
    const servicePopularity = await db.appointment.groupBy({
      by: ['serviceId'],
      where: appointmentWhere,
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 10
    })

    const allServices = await db.service.findMany({ where: scope })
    const serviceMap = Object.fromEntries(allServices.map(s => [s.id, s.name]))

    const servicePopularityFormatted = servicePopularity.map(s => ({
      serviceId: s.serviceId,
      serviceName: serviceMap[s.serviceId] || 'Unknown',
      count: s._count.serviceId
    }))

    // Recent appointments — use include for related data
    const recentAppointments = await db.appointment.findMany({
      where: appointmentWhere,
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        customer: { select: { name: true } },
        stylist: { select: { name: true } },
        service: { select: { name: true } },
      }
    })

    const enrichedRecentAppointments = recentAppointments.map(a => ({
      id: a.id,
      date: a.date,
      status: a.status,
      totalPrice: a.totalPrice,
      customerName: a.customer.name,
      stylistName: a.stylist.name,
      serviceName: a.service.name,
    }))

    // No-show rate
    const noShowCount = await db.appointment.count({
      where: { ...appointmentWhere, status: 'no_show' }
    })
    const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0

    // Low stock alerts — use include for location
    const lowStockItems = await db.inventoryItem.findMany({
      where: {
        ...scope,
        ...(locationId ? { locationId } : {}),
        quantity: { lte: 999 }
      },
      take: 200,
      include: {
        location: { select: { name: true } }
      }
    })

    // Filter actually low stock in JS since Prisma SQLite doesn't support field comparison
    const actualLowStock = lowStockItems
      .filter(item => item.quantity <= item.minStock)
      .map(item => ({
        ...item,
        locationName: item.location.name,
      }))

    // Customer retention - new vs returning (tenant-scoped)
    const returningCustomers = await db.customer.count({
      where: { ...scope, totalVisits: { gt: 1 }, ...(locationId ? { locationId } : {}) }
    })
    const newCustomers = totalCustomers - returningCustomers

    // === CALCULATE REAL TRENDS ===
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Revenue trend: this month vs previous month
    const thisMonthRevenue = completedAppointments
      .filter(a => new Date(a.date) >= thisMonthStart)
      .reduce((sum, a) => sum + a.totalPrice, 0)
    const prevMonthRevenue = completedAppointments
      .filter(a => { const d = new Date(a.date); return d >= prevMonthStart && d < thisMonthStart })
      .reduce((sum, a) => sum + a.totalPrice, 0)
    const revenueTrend = prevMonthRevenue > 0 ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0

    // Appointments trend
    const thisMonthAppointments = await db.appointment.count({
      where: { ...appointmentWhere, date: { gte: thisMonthStart } }
    })
    const prevMonthAppointments = await db.appointment.count({
      where: { ...appointmentWhere, date: { gte: prevMonthStart, lt: thisMonthStart } }
    })
    const appointmentTrend = prevMonthAppointments > 0 ? ((thisMonthAppointments - prevMonthAppointments) / prevMonthAppointments) * 100 : 0

    // Customers trend
    const thisMonthCustomers = await db.customer.count({
      where: { ...(locationId ? { locationId } : {}), createdAt: { gte: thisMonthStart } }
    })
    const prevMonthCustomers = await db.customer.count({
      where: { ...(locationId ? { locationId } : {}), createdAt: { gte: prevMonthStart, lt: thisMonthStart } }
    })
    const customerTrend = prevMonthCustomers > 0 ? ((thisMonthCustomers - prevMonthCustomers) / prevMonthCustomers) * 100 : 0

    // Avg ticket trend
    const thisMonthCompleted = await db.appointment.findMany({
      where: { ...appointmentWhere, status: 'completed', date: { gte: thisMonthStart } },
      select: { totalPrice: true }
    })
    const prevMonthCompleted = await db.appointment.findMany({
      where: { ...appointmentWhere, status: 'completed', date: { gte: prevMonthStart, lt: thisMonthStart } },
      select: { totalPrice: true }
    })
    const thisMonthAvg = thisMonthCompleted.length > 0 ? thisMonthCompleted.reduce((s, a) => s + a.totalPrice, 0) / thisMonthCompleted.length : 0
    const prevMonthAvg = prevMonthCompleted.length > 0 ? prevMonthCompleted.reduce((s, a) => s + a.totalPrice, 0) / prevMonthCompleted.length : 0
    const avgTicketTrend = prevMonthAvg > 0 ? ((thisMonthAvg - prevMonthAvg) / prevMonthAvg) * 100 : 0

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalAppointments,
      totalCustomers,
      totalStylists,
      avgTicketValue: Math.round(avgTicketValue * 100) / 100,
      noShowRate: Math.round(noShowRate * 10) / 10,
      appointmentsByStatus: appointmentsByStatus.map(s => ({ status: s.status, count: s._count.status })),
      revenueByLocation: revenueByLocationFormatted,
      monthlyRevenue: monthlyRevenueFormatted,
      paymentBreakdown: Object.entries(paymentBreakdown).map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 })),
      servicePopularity: servicePopularityFormatted,
      recentAppointments: enrichedRecentAppointments,
      lowStockAlerts: actualLowStock,
      customerRetention: { newCustomers, returningCustomers },
      locations: locations.map(l => ({ id: l.id, name: l.name, city: l.city })),
      trends: {
        revenue: Math.round(revenueTrend * 10) / 10,
        appointments: Math.round(appointmentTrend * 10) / 10,
        customers: Math.round(customerTrend * 10) / 10,
        avgTicket: Math.round(avgTicketTrend * 10) / 10,
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
