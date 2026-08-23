'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, statusColors, statusLabels } from '@/lib/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  Calendar,
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'

interface DashboardData {
  totalRevenue: number
  totalAppointments: number
  totalCustomers: number
  totalStylists: number
  avgTicketValue: number
  noShowRate: number
  appointmentsByStatus: { status: string; count: number }[]
  revenueByLocation: { locationId: string; locationName: string; revenue: number; appointments: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
  paymentBreakdown: { method: string; amount: number }[]
  servicePopularity: { serviceId: string; serviceName: string; count: number }[]
  recentAppointments: {
    id: string
    date: string
    status: string
    totalPrice: number
    customerName?: string
    stylistName?: string
    serviceName?: string
  }[]
  lowStockAlerts: {
    id: string
    name: string
    quantity: number
    minStock: number
    category: string
  }[]
  customerRetention: { newCustomers: number; returningCustomers: number }
  locations: { id: string; name: string; city: string }[]
  trends: {
    revenue: number
    appointments: number
    customers: number
    avgTicket: number
  }
}

const CHART_COLORS = ['#e11d48', '#0d9488', '#d97706', '#7c3aed', '#0891b2', '#65a30d']

export function DashboardView() {
  const { selectedLocation } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loadedLocation, setLoadedLocation] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    fetch(`/api/dashboard?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoadedLocation(selectedLocation) })
      .catch((err) => { console.error('Failed to fetch:', err); setData(null); setLoadedLocation(selectedLocation) })
  }, [selectedLocation])

  const loading = loadedLocation !== selectedLocation

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const trends = data?.trends || { revenue: 0, appointments: 0, customers: 0, avgTicket: 0 }

  // After the loading guard above, data is guaranteed to be non-null
  const d = data!

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(d.totalRevenue),
      icon: DollarSign,
      color: 'bg-rose-100 text-rose-600',
      trend: trends.revenue,
      description: 'vs last month',
    },
    {
      title: 'Total Appointments',
      value: formatNumber(d.totalAppointments),
      icon: Calendar,
      color: 'bg-teal-100 text-teal-600',
      trend: trends.appointments,
      description: `${d.appointmentsByStatus.find(s => s.status === 'completed')?.count || 0} completed`,
    },
    {
      title: 'Total Customers',
      value: formatNumber(d.totalCustomers),
      icon: Users,
      color: 'bg-amber-100 text-amber-600',
      trend: trends.customers,
      description: `${d.customerRetention.newCustomers} new / ${d.customerRetention.returningCustomers} returning`,
    },
    {
      title: 'Avg Ticket Value',
      value: formatCurrency(d.avgTicketValue),
      icon: Receipt,
      color: 'bg-purple-100 text-purple-600',
      trend: trends.avgTicket,
      description: 'per appointment',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => {
          const trendUp = card.trend >= 0
          return (
            <Card key={card.title} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <div className="flex items-center gap-1.5">
                      {trendUp ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className={cn('text-xs font-medium', trendUp ? 'text-emerald-600' : 'text-red-600')}>
                        {trendUp ? '+' : ''}{card.trend.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">{card.description}</span>
                    </div>
                  </div>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.color)}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
            <CardDescription>Revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthlyRevenue}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#e11d48" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Location */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Location</CardTitle>
            <CardDescription>Comparing locations performance</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.revenueByLocation}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="locationName" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Popularity */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Service Popularity</CardTitle>
            <CardDescription>Top services by booking count</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.servicePopularity.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis dataKey="serviceName" type="category" tick={{ fontSize: 11 }} width={120} className="text-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <CardDescription>Revenue by payment type</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="amount"
                    nameKey="method"
                    label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                  >
                    {d.paymentBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Appointments */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Appointments</CardTitle>
            <CardDescription>Latest 10 appointments across all locations</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentAppointments.map((apt) => (
                    <tr key={apt.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {format(new Date(apt.date), 'MMM d, h:mm a')}
                      </td>
                      <td className="py-2.5 px-2">{apt.customerName || 'N/A'}</td>
                      <td className="py-2.5 px-2 max-w-[150px] truncate">{apt.serviceName || 'N/A'}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant="secondary" className={cn('text-xs', statusColors[apt.status] || '')}>
                          {statusLabels[apt.status] || apt.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium">{formatCurrency(apt.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>{d.lowStockAlerts.length} items need restocking</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {d.lowStockAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">All items are well stocked</p>
              ) : (
                d.lowStockAlerts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">min: {item.minStock}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
