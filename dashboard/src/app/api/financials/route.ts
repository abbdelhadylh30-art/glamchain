import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authorize, getDataScopeFilter } from '@/lib/permissions'

export async function GET(request: Request) {
  const { authorized, response, session } = await authorize('financials_view')
  if (!authorized) return response

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  try {
    // MULTI-TENANT SCOPE — every query in this handler is tenant-scoped
    const scope = getDataScopeFilter(session!)

    // Revenue from completed appointments
    const completedWhere: Record<string, unknown> = { ...scope, status: 'completed' }
    if (locationId) completedWhere.locationId = locationId

    const completedAppointments = await db.appointment.findMany({
      where: completedWhere,
      select: { totalPrice: true, date: true, paymentMethod: true, locationId: true }
    })

    const totalRevenue = completedAppointments.reduce((sum, a) => sum + a.totalPrice, 0)

    // Expenses — use include for location
    const expenseWhere: Record<string, unknown> = { ...scope }
    if (locationId) expenseWhere.locationId = locationId

    const expenses = await db.expense.findMany({
      where: expenseWhere,
      include: {
        location: { select: { name: true } },
      }
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    // Profit
    const profit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

    // Monthly breakdown
    const monthlyData: Record<string, { revenue: number; expenses: number }> = {}
    completedAppointments.forEach(a => {
      const key = `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0 }
      monthlyData[key].revenue += a.totalPrice
    })
    expenses.forEach(e => {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0 }
      monthlyData[key].expenses += e.amount
    })

    const monthlyFormatted = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        profit: Math.round((data.revenue - data.expenses) * 100) / 100,
      }))

    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {}
    expenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount
    })

    // Revenue by location — use location map from expenses
    const locationMap = Object.fromEntries(
      expenses.map(e => [e.locationId, e.location.name])
    )

    // Also get locations not in expenses (tenant-scoped)
    const allLocations = await db.location.findMany({ where: scope })
    allLocations.forEach(l => {
      if (!locationMap[l.id]) locationMap[l.id] = l.name
    })

    const revenueByLocation: Record<string, number> = {}
    completedAppointments.forEach(a => {
      const name = locationMap[a.locationId] || 'Unknown'
      revenueByLocation[name] = (revenueByLocation[name] || 0) + a.totalPrice
    })

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {}
    completedAppointments.filter(a => a.paymentMethod).forEach(a => {
      paymentBreakdown[a.paymentMethod!] = (paymentBreakdown[a.paymentMethod!] || 0) + a.totalPrice
    })

    // Calculate real trends (current month vs previous month)
    const now = new Date()
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`

    const thisMonthRevenue = monthlyData[thisMonthKey]?.revenue || 0
    const prevMonthRevenue = monthlyData[prevMonthKey]?.revenue || 0
    const revenueTrend = prevMonthRevenue > 0 ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100) : 0

    const thisMonthExpenses = monthlyData[thisMonthKey]?.expenses || 0
    const prevMonthExpenses = monthlyData[prevMonthKey]?.expenses || 0
    const expenseTrend = prevMonthExpenses > 0 ? ((thisMonthExpenses - prevMonthExpenses) / prevMonthExpenses * 100) : 0

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMargin: Math.round(profitMargin * 10) / 10,
      monthlyData: monthlyFormatted,
      expenseByCategory: Object.entries(expenseByCategory).map(([category, amount]) => ({
        category, amount: Math.round(amount * 100) / 100
      })),
      revenueByLocation: Object.entries(revenueByLocation).map(([location, amount]) => ({
        location, amount: Math.round(amount * 100) / 100
      })),
      paymentBreakdown: Object.entries(paymentBreakdown).map(([method, amount]) => ({
        method, amount: Math.round(amount * 100) / 100
      })),
      trends: {
        revenue: Math.round(revenueTrend * 10) / 10,
        expenses: Math.round(expenseTrend * 10) / 10,
      }
    })
  } catch (error) {
    console.error('Financials API error:', error)
    return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 })
  }
}
