'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/config'
import { Star, MapPin, Scissors, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface Stylist {
  id: string
  name: string
  email: string
  phone: string
  specialization: string
  rating: number
  totalReviews: number
  commissionRate: number
  locationName: string
  locationId: string
  totalRevenue: number
  totalCompleted: number
  thisMonthRevenue: number
  upcomingAppointments: number
  commission: number
}

interface StylistsData {
  stylists: Stylist[]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

const avatarColors = [
  'bg-rose-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-indigo-500',
]

function StarRating({ rating, totalReviews }: { rating: number; totalReviews: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {rating.toFixed(1)} ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
      </span>
    </div>
  )
}

export function StylistsView() {
  const { selectedLocation } = useAppStore()
  const [data, setData] = useState<StylistsData | null>(null)
  const [loadedLocation, setLoadedLocation] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formLocationId, setFormLocationId] = useState('')
  const [formSpecialization, setFormSpecialization] = useState('')
  const [formCommissionRate, setFormCommissionRate] = useState('30')

  // Location options
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([])

  const fetchData = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    fetch(`/api/stylists?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoadedLocation(selectedLocation) })
      .catch((err) => { console.error('Failed to fetch:', err); setData(null); setLoadedLocation(selectedLocation) })
  }, [selectedLocation])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (dialogOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(d => setLocationOptions(d.locations?.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })) || []))
        .catch((err) => { console.error('Failed to fetch:', err) })
    }
  }, [dialogOpen])

  const loading = loadedLocation !== selectedLocation

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormLocationId('')
    setFormSpecialization('')
    setFormCommissionRate('30')
  }

  const handleCreateStylist = async () => {
    if (!formName || !formEmail || !formLocationId) {
      toast({ title: 'Missing fields', description: 'Please fill in name, email, and location', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/stylists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          phone: formPhone,
          locationId: formLocationId,
          specialization: formSpecialization || 'Stylist',
          commissionRate: parseFloat(formCommissionRate) / 100,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create stylist')
      }

      toast({ title: 'Stylist added', description: `${formName} has been added to the team.` })
      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create stylist', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Stylists</h2>
          <p className="text-sm text-muted-foreground">Manage your salon stylists and their performance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Stylists</h2>
          <p className="text-sm text-muted-foreground">
            {data?.stylists.length || 0} stylist{(data?.stylists.length || 0) !== 1 ? 's' : ''} across all locations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Stylist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add New Stylist</DialogTitle>
              <DialogDescription>Add a new stylist to your team.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input placeholder="e.g. Aria Thompson" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="stylist@salon.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input placeholder="+974 XXXX XXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
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
                <Label>Specialization</Label>
                <Select value={formSpecialization} onValueChange={setFormSpecialization}>
                  <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hair Specialist">Hair Specialist</SelectItem>
                    <SelectItem value="Color Expert">Color Expert</SelectItem>
                    <SelectItem value="Nail Artist">Nail Artist</SelectItem>
                    <SelectItem value="Skin Care Specialist">Skin Care Specialist</SelectItem>
                    <SelectItem value="Beauty Therapist">Beauty Therapist</SelectItem>
                    <SelectItem value="Senior Stylist">Senior Stylist</SelectItem>
                    <SelectItem value="Master Colorist">Master Colorist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Commission Rate (%)</Label>
                <Input type="number" min="0" max="100" value={formCommissionRate} onChange={(e) => setFormCommissionRate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
              <Button onClick={handleCreateStylist} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Stylist'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data?.stylists.map((stylist, index) => (
          <Card key={stylist.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                  {getInitials(stylist.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base truncate">{stylist.name}</h3>
                  <p className="text-sm text-muted-foreground">{stylist.specialization}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stylist.locationName}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <StarRating rating={stylist.rating} totalReviews={stylist.totalReviews} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-xs text-muted-foreground">This Month</span>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(stylist.thisMonthRevenue)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Scissors className="w-3.5 h-3.5 text-teal-500" />
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                  <p className="text-sm font-bold">{stylist.totalCompleted}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Commission</span>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(stylist.commission)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Upcoming</span>
                  </div>
                  <p className="text-sm font-bold">{stylist.upcomingAppointments}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Total Revenue: {formatCurrency(stylist.totalRevenue)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {(stylist.commissionRate * 100).toFixed(0)}% rate
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
