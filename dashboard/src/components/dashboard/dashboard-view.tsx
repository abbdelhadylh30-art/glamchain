'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, statusLabels } from '@/lib/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sun,
  Moon,
  Armchair,
  Banknote,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  ArrowRight,
  Hourglass,
  PackageX,
  UserX,
  Megaphone,
  Users,
  Receipt,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, isAfter } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'

interface TodayAppointment {
  id: string
  date: string
  status: string
  totalPrice: number
  durationMinutes: number
  customerName: string
  customerPhone: string
  stylistName: string
  serviceName: string
}

interface DashboardData {
  totalRevenue: number
  totalAppointments: number
  totalCustomers: number
  totalStylists: number
  avgTicketValue: number
  noShowRate: number
  appointmentsByStatus: { status: string; count: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
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
  lowStockAlerts: { id: string; name: string; quantity: number; minStock: number; category: string }[]
  customerRetention: { newCustomers: number; returningCustomers: number }
  trends: { revenue: number; appointments: number; customers: number; avgTicket: number }
  today: {
    appointments: TodayAppointment[]
    revenue: number
    expected: number
    count: number
    occupancy: number
    weekRevenue: { day: string; date: string; revenue: number }[]
  }
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-[#7d8b6a1f] text-[#5c6b48]',
  pending: 'bg-[#c8a24b26] text-[#8a6d2a]',
  completed: 'bg-[#b3903f1f] text-[#96742c]',
  cancelled: 'bg-[#b4543f1a] text-[#a04c38]',
  no_show: 'bg-[#b3715822] text-[#a05f45]',
}

const OPEN_HOUR = 10
const CLOSE_HOUR = 22

export function DashboardView() {
  const { selectedLocation, setCurrentPage } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loadedLocation, setLoadedLocation] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    setData(null)
    fetch(`/api/dashboard?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoadedLocation(selectedLocation) })
      .catch(() => { setData(null); setLoadedLocation(selectedLocation) })
  }, [selectedLocation])

  const loading = !data || loadedLocation !== selectedLocation
  const now = new Date()

  const nextUp = useMemo(() => {
    if (!data?.today?.appointments) return null
    return (
      data.today.appointments.find(
        a => isAfter(new Date(a.date), now) && (a.status === 'confirmed' || a.status === 'pending')
      ) || null
    )
  }, [data])

  const greeting = (() => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl bg-[#efe7d6]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl bg-[#efe7d6]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="lg:col-span-2 h-96 w-full rounded-2xl bg-[#efe7d6]" />
          <Skeleton className="h-96 w-full rounded-2xl bg-[#efe7d6]" />
        </div>
      </div>
    )
  }

  const d = data!
  const t = d.today || { appointments: [], revenue: 0, expected: 0, count: 0, occupancy: 0, weekRevenue: [] }

  // Group today's appointments by hour
  const byHour = new Map<number, TodayAppointment[]>()
  t.appointments.forEach(a => {
    const h = new Date(a.date).getHours()
    if (!byHour.has(h)) byHour.set(h, [])
    byHour.get(h)!.push(a)
  })
  const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i)

  const pendingCount = d.appointmentsByStatus.find(s => s.status === 'pending')?.count || 0

  const quickStats = [
    {
      label: 'In the till today',
      value: formatCurrency(t.revenue),
      sub: `${formatCurrency(t.expected)} still expected`,
      icon: Banknote,
    },
    {
      label: 'Guests today',
      value: `${t.count}`,
      sub: `${t.appointments.filter(a => a.status === 'completed').length} done · ${t.appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length} to go`,
      icon: Users,
    },
    {
      label: 'Chairs busy',
      value: `${t.occupancy}%`,
      sub: 'of opening hours booked',
      icon: Armchair,
      meter: t.occupancy,
    },
  ]

  return (
    <div className="space-y-7">
      {/* ————— greeting band ————— */}
      <section className="gm-rise relative overflow-hidden rounded-2xl border border-[#e8dfc9] bg-gradient-to-r from-[#2a2114] via-[#33291a] to-[#2a2114] px-6 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#c8a24b1f] blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom--10 h-40 w-40 rounded-full bg-[#b3715814] blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8a24b]">
              <span className="gm-live-dot" />
              {format(now, 'EEEE, d MMMM')}
            </p>
            <h2 className="mt-2 font-serif text-[1.7rem] sm:text-3xl font-semibold text-[#f3ead9]">
              {greeting}. <span className="gm-gold-text italic">The salon is glowing.</span>
            </h2>
            <p className="mt-2 text-[13px] text-[#a3947a]">
              {pendingCount > 0
                ? `${pendingCount} booking${pendingCount > 1 ? 's' : ''} waiting for your confirmation — you will find them below.`
                : 'Everything is confirmed. Here is how today looks.'}
            </p>
          </div>
          <Button
            className="gm-btn-gold h-11 rounded-full px-6 gap-2"
            onClick={() => setCurrentPage('marketing')}
          >
            <Megaphone className="h-4 w-4" />
            Fill quiet hours
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ————— quick stats ————— */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {quickStats.map((s, i) => (
          <div key={s.label} className={cn('gm-stat gm-rise rounded-2xl p-6', `gm-rise-${i + 1}`)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#8a7d68]">{s.label}</p>
                <p className="mt-2.5 font-serif text-[1.8rem] font-semibold text-[#2a221a]">{s.value}</p>
                <p className="mt-1 text-[12px] text-[#a3947a]">{s.sub}</p>
              </div>
              <span className="gm-chip h-10 w-10"><s.icon className="h-5 w-5" /></span>
            </div>
            {typeof s.meter === 'number' && (
              <div className="gm-meter mt-4"><div className="gm-meter-fill" style={{ width: `${s.meter}%` }} /></div>
            )}
          </div>
        ))}
      </section>

      {/* ————— main grid: timeline + side rail ————— */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Today's timeline */}
        <Card className="gm-card gm-rise-2 rounded-2xl xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-lg text-[#2a221a]">Today&apos;s chair</CardTitle>
                <CardDescription className="text-[12.5px]">Every hour, every guest — {format(now, 'd MMMM')}</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 rounded-full border-[#ddd2ba] text-[#6b5d4a] hover:bg-[#f3ecdb] hover:text-[#2a221a] hover:border-[#c8a24b]" onClick={() => setCurrentPage('appointments')}>
                Open book <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[430px] overflow-y-auto pr-1">
              {hours.map(h => {
                const appts = byHour.get(h) || []
                const isNow = now.getHours() === h
                const hourLabel = `${String(h).padStart(2, '0')}:00`
                return (
                  <div key={h} className="gm-timeline-row flex items-center gap-4 rounded-lg px-2 py-2.5">
                    <div className={cn('w-[62px] shrink-0 text-right', isNow ? 'text-[#96742c] font-bold' : 'text-[#a3947a]')}>
                      <span className="relative text-[12.5px] tabular-nums">
                        {hourLabel}
                        {isNow && <span className="absolute -right-3 top-0.5 h-1.5 w-1.5 rounded-full bg-[#96742c]" />}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {appts.length === 0 ? (
                        <p className="text-[12.5px] italic text-[#b3a68e]">
                          {h < now.getHours() ? '— passed quietly —' : 'Empty chair · a slot to fill'}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {appts.map(a => (
                            <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-[13.5px] font-semibold text-[#2a221a]">{a.customerName}</span>
                              <span className="text-[12.5px] text-[#8a7d68]">{a.serviceName}</span>
                              <span className="hidden text-[11.5px] text-[#a3947a] sm:inline">· {a.stylistName}</span>
                              <span className={cn('gm-badge ml-auto', STATUS_STYLE[a.status] || 'bg-[#efe7d6] text-[#6b5d4a]')}>
                                <span className="gm-badge-dot" />
                                {statusLabels[a.status] || a.status}
                              </span>
                              <span className="text-[12.5px] font-semibold text-[#96742c] tabular-nums">{formatCurrency(a.totalPrice)}</span>
                              {(a.status === 'confirmed' || a.status === 'pending') && a.customerPhone && (
                                <a
                                  href={`https://wa.me/${a.customerPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${a.customerName}, confirming your ${a.serviceName} today at ${format(new Date(a.date), 'h:mm a')} with ${a.stylistName}. See you at GlamChain!`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#7d8b6a40] text-[#5c6b48] transition-all hover:bg-[#7d8b6a1a] hover:border-[#7d8b6a]"
                                  aria-label={`WhatsApp ${a.customerName}`}
                                  title="Send a WhatsApp reminder"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side rail */}
        <div className="space-y-5">
          {/* Next up */}
          <Card className="gm-rise-2 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#f7f0dd] to-[#f0e6c8] px-6 py-5 border-b border-[#e8dfc9]">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#96742c]">Next up</p>
              {nextUp ? (
                <div className="mt-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-serif text-xl font-semibold text-[#2a221a]">{nextUp.customerName}</p>
                    <p className="font-serif text-lg text-[#96742c]">{format(new Date(nextUp.date), 'h:mm a')}</p>
                  </div>
                  <p className="mt-1 text-[12.5px] text-[#6b5d4a]">
                    {nextUp.serviceName} · with {nextUp.stylistName}
                  </p>
                  <div className="mt-4 flex items-center gap-2.5">
                    {nextUp.customerPhone && (
                      <a
                        href={`https://wa.me/${nextUp.customerPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${nextUp.customerName}, a friendly reminder of your ${nextUp.serviceName} today at ${format(new Date(nextUp.date), 'h:mm a')}. We look forward to seeing you!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#5c6b48] px-4 py-1.5 text-[12px] font-semibold text-[#f4f6ee] transition-all hover:bg-[#4c5a3a]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Remind on WhatsApp
                      </a>
                    )}
                    <span className={cn('gm-badge', STATUS_STYLE[nextUp.status])}>
                      <span className="gm-badge-dot" />{statusLabels[nextUp.status] || nextUp.status}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-[#6b5d4a]">Nothing left on the book for today. Time to plan tomorrow.</p>
              )}
            </div>
          </Card>

          {/* This week */}
          <Card className="gm-card gm-rise-3 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base text-[#2a221a]">This week&apos;s takings</CardTitle>
              <CardDescription className="text-[12px]">Completed revenue, last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="h-[132px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={t.weekRevenue} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#a3947a' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#f3ecdb' }}
                      contentStyle={{ background: '#fffdf8', border: '1px solid #e8dfc9', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                    />
                    <Bar dataKey="revenue" radius={[5, 5, 2, 2]}>
                      {t.weekRevenue.map((w, i) => (
                        <Cell key={i} fill={i === t.weekRevenue.length - 1 ? '#96742c' : '#d8c48c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Needs attention */}
          <Card className="gm-card gm-rise-4 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base text-[#2a221a]">Needs your eye</CardTitle>
            </CardHeader>
            <CardContent className="pt-1 space-y-2">
              {[
                { icon: Hourglass, label: 'Bookings pending', value: pendingCount, page: 'appointments' },
                { icon: PackageX, label: 'Stock running low', value: d.lowStockAlerts.length, page: 'services' },
                { icon: UserX, label: 'No-show rate', value: `${d.noShowRate}%`, page: 'marketing' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => setCurrentPage(item.page as 'appointments')}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#eee4cd] bg-[#fbf7ec] px-4 py-3 text-left transition-all hover:border-[#d9c998] hover:bg-[#f7f0dd]"
                >
                  <span className="gm-chip h-8 w-8 shrink-0"><item.icon className="h-4 w-4" /></span>
                  <span className="flex-1 text-[13px] font-medium text-[#2a221a]">{item.label}</span>
                  <span className="font-serif text-lg font-semibold text-[#96742c]">{item.value}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ————— month analytics ————— */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="gm-card rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-base text-[#2a221a]">Revenue trend</CardTitle>
                <CardDescription className="text-[12.5px]">Last 6 months of completed takings</CardDescription>
              </div>
              {d.trends.revenue >= 0 ? (
                <span className="gm-badge bg-[#7d8b6a1f] text-[#5c6b48]"><TrendingUp className="h-3 w-3" />{d.trends.revenue.toFixed(1)}%</span>
              ) : (
                <span className="gm-badge bg-[#b4543f1a] text-[#a04c38]"><TrendingDown className="h-3 w-3" />{d.trends.revenue.toFixed(1)}%</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthlyRevenue}>
                  <defs>
                    <linearGradient id="gmGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b3903f" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#b3903f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#e5dcc8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a3947a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a3947a' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#fffdf8', border: '1px solid #e8dfc9', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#96742c" strokeWidth={2.5} fill="url(#gmGold)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="gm-card rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base text-[#2a221a]">What guests love most</CardTitle>
            <CardDescription className="text-[12.5px]">Top services by bookings</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.servicePopularity.slice(0, 7)} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="#e5dcc8" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#a3947a' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="serviceName" type="category" tick={{ fontSize: 11, fill: '#6b5d4a' }} width={124} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f3ecdb' }} contentStyle={{ background: '#fffdf8', border: '1px solid #e8dfc9', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                    {d.servicePopularity.slice(0, 7).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#96742c' : i === 1 ? '#b37158' : i === 2 ? '#7d8b6a' : '#d8c48c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ————— recent bookings ————— */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="gm-card rounded-2xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base text-[#2a221a]">Latest bookings</CardTitle>
            <CardDescription className="text-[12.5px]">Across all your locations</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#eee4cd]">
                    {['When', 'Guest', 'Service', 'Status', 'Takings'].map((h, i) => (
                      <th key={h} className={cn('py-2.5 px-2 font-semibold text-[11px] uppercase tracking-[0.1em] text-[#a3947a]', i === 4 ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.recentAppointments.map(apt => (
                    <tr key={apt.id} className="border-b border-[#f3ecdb] last:border-0 transition-colors hover:bg-[#fbf7ec]">
                      <td className="py-2.5 px-2 whitespace-nowrap text-[#6b5d4a]">{format(new Date(apt.date), 'd MMM · h:mm a')}</td>
                      <td className="py-2.5 px-2 font-medium text-[#2a221a]">{apt.customerName || '—'}</td>
                      <td className="py-2.5 px-2 max-w-[160px] truncate text-[#6b5d4a]">{apt.serviceName || '—'}</td>
                      <td className="py-2.5 px-2">
                        <span className={cn('gm-badge', STATUS_STYLE[apt.status] || 'bg-[#efe7d6] text-[#6b5d4a]')}>
                          <span className="gm-badge-dot" />{statusLabels[apt.status] || apt.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-[#96742c] tabular-nums">{formatCurrency(apt.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Guest mix */}
        <Card className="gm-card rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base text-[#2a221a]">Your guests</CardTitle>
            <CardDescription className="text-[12.5px]">Who is coming through the door</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-[#eee4cd] bg-[#fbf7ec] p-4">
              <span className="gm-chip h-11 w-11"><Receipt className="h-5 w-5" /></span>
              <div>
                <p className="font-serif text-xl font-semibold text-[#2a221a]">{formatCurrency(d.avgTicketValue)}</p>
                <p className="text-[12px] text-[#8a7d68]">average ticket · {d.trends.avgTicket >= 0 ? '+' : ''}{d.trends.avgTicket.toFixed(1)}% this month</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[#eee4cd] bg-[#fbf7ec] p-4">
              <span className="gm-chip h-11 w-11"><Users className="h-5 w-5" /></span>
              <div>
                <p className="font-serif text-xl font-semibold text-[#2a221a]">{formatNumber(d.totalCustomers)}</p>
                <p className="text-[12px] text-[#8a7d68]">{d.customerRetention.newCustomers} new · {d.customerRetention.returningCustomers} returning</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full h-10 rounded-full border-[#ddd2ba] text-[#6b5d4a] hover:bg-[#f3ecdb] hover:text-[#2a221a] hover:border-[#c8a24b]"
              onClick={() => setCurrentPage('customers')}
            >
              Open guest book <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
