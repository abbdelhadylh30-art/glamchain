'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  DollarSign,
  Repeat,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Award,
  MapPin,
  Plus,
} from 'lucide-react'
import { formatCurrency } from '@/lib/config'
import { format } from 'date-fns'
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string
  loyaltyPoints: number
  totalSpent: number
  totalVisits: number
  lastVisit: string | null
  notes: string | null
  locationName: string | null
  locationId: string | null
  createdAt: string
}

interface CustomersData {
  customers: Customer[]
  total: number
  page: number
  totalPages: number
  stats: {
    totalCustomers: number
    avgSpent: number
    avgVisits: number
  }
}

export function CustomersView() {
  const { selectedLocation } = useAppStore()
  const [data, setData] = useState<CustomersData | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [fetchedKey, setFetchedKey] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formLocationId, setFormLocationId] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Location options
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([])

  const currentKey = `${selectedLocation}-${page}-${search}`

  const fetchData = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', '15')
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    if (search) params.set('search', search)

    fetch(`/api/customers?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setData(d); setFetchedKey(currentKey) })
      .catch((err) => { console.error('Failed to fetch:', err); setData(null); setFetchedKey(currentKey) })
  }, [page, selectedLocation, search, currentKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (addDialogOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(d => setLocationOptions(d.locations?.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })) || []))
        .catch((err) => { console.error('Failed to fetch:', err) })
    }
  }, [addDialogOpen])

  const loading = fetchedKey !== currentKey

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleClearSearch = () => {
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormLocationId('')
    setFormNotes('')
  }

  const handleCreateCustomer = async () => {
    if (!formName || !formPhone) {
      toast({ title: 'Missing fields', description: 'Name and phone are required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail || null,
          phone: formPhone,
          locationId: formLocationId || null,
          notes: formNotes || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create customer')
      }

      toast({ title: 'Customer added', description: `${formName} has been added.` })
      setAddDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create customer', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">Manage your salon customer base</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm() }}>
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input placeholder="Customer name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Phone *</Label>
                <Input placeholder="+974 XXXX XXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="customer@email.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Preferred Location</Label>
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
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm() }}>Cancel</Button>
              <Button onClick={handleCreateCustomer} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Customer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-xl font-bold">{data.stats.totalCustomers}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Spend</p>
                <p className="text-xl font-bold">{formatCurrency(data.stats.avgSpent)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Visits</p>
                <p className="text-xl font-bold">{data.stats.avgVisits.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
            {search && (
              <Button variant="ghost" onClick={handleClearSearch}>
                Clear
              </Button>
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
          ) : !data || data.customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Spent</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Visits</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Loyalty</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td className="py-3 px-4 font-medium">{customer.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{customer.email || '--'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{customer.phone}</td>
                      <td className="py-3 px-4 text-muted-foreground">{customer.locationName || '--'}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(customer.totalSpent)}</td>
                      <td className="py-3 px-4 text-right">{customer.totalVisits}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="secondary" className="text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          {customer.loyaltyPoints}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {customer.lastVisit ? format(new Date(customer.lastVisit), 'MMM d, yyyy') : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => { if (!open) setSelectedCustomer(null) }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {selectedCustomer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                  <p className="text-sm text-muted-foreground">Customer since {format(new Date(selectedCustomer.createdAt), 'MMM yyyy')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                  <p className="font-bold">{selectedCustomer.totalVisits}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Loyalty Points</p>
                  <p className="font-bold">{selectedCustomer.loyaltyPoints}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Avg per Visit</p>
                  <p className="font-bold">
                    {selectedCustomer.totalVisits > 0
                      ? formatCurrency(selectedCustomer.totalSpent / selectedCustomer.totalVisits)
                      : formatCurrency(0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {selectedCustomer.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {selectedCustomer.phone}
                </div>
                {selectedCustomer.locationName && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {selectedCustomer.locationName}
                  </div>
                )}
              </div>

              {selectedCustomer.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
