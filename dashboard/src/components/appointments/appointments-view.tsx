'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency, statusColors, statusLabels } from '@/lib/config'
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  XCircle,
  UserX,
  CheckCheck,
} from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface Appointment {
  id: string
  date: string
  status: string
  totalPrice: number
  paymentMethod: string | null
  notes: string | null
  locationName: string
  customerName: string
  stylistName: string
  serviceName: string
  servicePrice: number
  serviceDuration: number
}

interface AppointmentsData {
  appointments: Appointment[]
  total: number
  page: number
  totalPages: number
}

interface StylistOption {
  id: string
  name: string
  specialization: string
  locationId: string
}

interface ServiceOption {
  id: string
  name: string
  price: number
  duration: number
  category: string
}

interface CustomerOption {
  id: string
  name: string
  phone: string
}

export function AppointmentsView() {
  const { selectedLocation } = useAppStore()
  const [data, setData] = useState<AppointmentsData | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fetchedKey, setFetchedKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formLocationId, setFormLocationId] = useState('')
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formStylistId, setFormStylistId] = useState('')
  const [formServiceId, setFormServiceId] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Options for dropdowns
  const [stylistOptions, setStylistOptions] = useState<StylistOption[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([])

  const currentKey = `${selectedLocation}-${page}-${statusFilter}-${dateFilter}`

  const fetchData = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', '15')
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (dateFilter) params.set('date', dateFilter)

    fetch(`/api/appointments?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setData(d); setFetchedKey(currentKey) })
      .catch((err) => { console.error('Failed to fetch:', err); setData(null); setFetchedKey(currentKey) })
  }, [page, selectedLocation, statusFilter, dateFilter, currentKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Load form dropdown options when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      // Load locations
      fetch('/api/settings')
        .then(res => res.json())
        .then(d => setLocationOptions(d.locations?.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })) || []))
        .catch((err) => { console.error('Failed to fetch:', err) })

      // Load stylists
      fetch('/api/stylists')
        .then(res => res.json())
        .then(d => setStylistOptions(d.stylists?.map((s: { id: string; name: string; specialization: string; locationId: string }) => ({ id: s.id, name: s.name, specialization: s.specialization, locationId: s.locationId })) || []))
        .catch((err) => { console.error('Failed to fetch:', err) })

      // Load services
      fetch('/api/services')
        .then(res => res.json())
        .then(d => setServiceOptions(d.services?.map((s: { id: string; name: string; price: number; duration: number; category: string }) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration, category: s.category })) || []))
        .catch((err) => { console.error('Failed to fetch:', err) })

      // Load customers
      fetch('/api/customers?limit=100')
        .then(res => res.json())
        .then(d => setCustomerOptions(d.customers?.map((c: { id: string; name: string; phone: string }) => ({ id: c.id, name: c.name, phone: c.phone })) || []))
        .catch((err) => { console.error('Failed to fetch:', err) })
    }
  }, [dialogOpen])

  const loading = fetchedKey !== currentKey

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value)
    setPage(1)
  }

  const handleClearFilters = () => {
    setStatusFilter('all')
    setDateFilter('')
    setPage(1)
  }

  const resetForm = () => {
    setFormLocationId('')
    setFormCustomerId('')
    setFormStylistId('')
    setFormServiceId('')
    setFormDate('')
    setFormTime('')
    setFormNotes('')
  }

  const handleCreateAppointment = async () => {
    if (!formLocationId || !formCustomerId || !formStylistId || !formServiceId || !formDate || !formTime) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const dateStr = `${formDate}T${formTime}:00`
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: formLocationId,
          customerId: formCustomerId,
          stylistId: formStylistId,
          serviceId: formServiceId,
          date: dateStr,
          notes: formNotes || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create appointment')
      }

      toast({ title: 'Appointment created', description: 'The appointment has been successfully scheduled.' })
      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create appointment', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update appointment')
      }

      toast({ title: 'Status updated', description: `Appointment marked as ${statusLabels[newStatus] || newStatus}.` })
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update status', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/appointments?id=${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete appointment')
      }
      toast({ title: 'Appointment deleted', description: 'The appointment has been removed.' })
      setDeleteId(null)
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete appointment', variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Filter stylists by selected location
  const filteredStylists = formLocationId
    ? stylistOptions.filter(s => s.locationId === formLocationId)
    : stylistOptions

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Appointments</h2>
          <p className="text-sm text-muted-foreground">Manage and track all salon appointments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Appointment</DialogTitle>
              <DialogDescription>Schedule a new appointment for a customer.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Location *</Label>
                <Select value={formLocationId} onValueChange={setFormLocationId}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Customer *</Label>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customerOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Stylist *</Label>
                <Select value={formStylistId} onValueChange={setFormStylistId}>
                  <SelectTrigger><SelectValue placeholder={formLocationId ? "Select stylist" : "Select location first"} /></SelectTrigger>
                  <SelectContent>
                    {filteredStylists.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} - {s.specialization}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Service *</Label>
                <Select value={formServiceId} onValueChange={setFormServiceId}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {serviceOptions.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date *</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Time *</Label>
                  <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
              <Button onClick={handleCreateAppointment} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Appointment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="w-full sm:w-[180px]"
            />
            {(statusFilter !== 'all' || dateFilter) && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
            )}
            {data && (
              <span className="text-sm text-muted-foreground ml-auto">
                {data.total} appointment{data.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data || data.appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Calendar className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No appointments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date / Time</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Stylist</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Payment</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.appointments.map((apt) => (
                    <tr key={apt.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium">{format(new Date(apt.date), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(apt.date), 'h:mm a')}</div>
                      </td>
                      <td className="py-3 px-4">{apt.customerName}</td>
                      <td className="py-3 px-4">{apt.stylistName}</td>
                      <td className="py-3 px-4">
                        <div>{apt.serviceName}</div>
                        <div className="text-xs text-muted-foreground">{apt.serviceDuration} min</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className={statusColors[apt.status] || ''}>
                          {statusLabels[apt.status] || apt.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-muted-foreground capitalize">{apt.paymentMethod || '--'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(apt.totalPrice)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {apt.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                disabled={actionLoading === apt.id}
                                onClick={() => handleStatusChange(apt.id, 'confirmed')}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                disabled={actionLoading === apt.id}
                                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                              >
                                <XCircle className="w-3 h-3" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {apt.status === 'confirmed' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                disabled={actionLoading === apt.id}
                                onClick={() => handleStatusChange(apt.id, 'completed')}
                              >
                                <CheckCheck className="w-3 h-3" />
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                disabled={actionLoading === apt.id}
                                onClick={() => handleStatusChange(apt.id, 'no_show')}
                              >
                                <UserX className="w-3 h-3" />
                                No Show
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2"
                                onClick={() => setDeleteId(apt.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
