'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/config'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import {
  Scissors,
  User,
  CalendarDays,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Star,
  AlertCircle,
} from 'lucide-react'

// Types
interface ServiceItem {
  id: string
  name: string
  category: string
  duration: number
  price: number
  description: string | null
}

interface ServiceGroup {
  category: string
  services: ServiceItem[]
}

interface StylistItem {
  id: string
  name: string
  specialization: string
  rating: number
  avatar: string | null
}

interface TimeSlot {
  time: string
  available: boolean
}

interface BookingWidgetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: string | null
  preselectedServiceId?: string | null
}

type Step = 'service' | 'stylist' | 'datetime' | 'details'

export function BookingWidget({
  open,
  onOpenChange,
  locationId,
  preselectedServiceId,
}: BookingWidgetProps) {
  const [step, setStep] = useState<Step>('service')
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [stylists, setStylists] = useState<StylistItem[]>([])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Selections
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedStylist, setSelectedStylist] = useState<StylistItem | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Customer details
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  // Booking result
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [confirmationDetails, setConfirmationDetails] = useState<{
    serviceName: string
    stylistName: string
    date: string
    time: string
  } | null>(null)

  // Fetch booking data when dialog opens
  useEffect(() => {
    if (!open || !locationId) return
    let cancelled = false

    async function loadBookingData() {
      setLoading(true)
      setError('')
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const res = await fetch(`${apiUrl}/api/public/booking?locationId=${locationId}`)
        if (!res.ok) throw new Error('Failed to fetch services')
        const data = await res.json()
        if (cancelled) return

        setServiceGroups(data.services || [])
        setStylists(data.stylists || [])

        // If preselected service, set it
        if (preselectedServiceId) {
          for (const group of data.services || []) {
            const found = group.services.find(
              (s: ServiceItem) => s.id === preselectedServiceId
            )
            if (found) {
              setSelectedService(found)
              setStep('stylist')
              break
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load booking data. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadBookingData()
    return () => { cancelled = true }
  }, [open, locationId, preselectedServiceId])

  // Fetch time slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedStylist || !locationId) return
    let cancelled = false

    async function loadSlots() {
      setLoading(true)
      setError('')
      try {
        if (!selectedDate || !selectedStylist) return
        const dateStr = selectedDate.toISOString().split('T')[0]
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const res = await fetch(
          `${apiUrl}/api/public/booking/slots?stylistId=${selectedStylist.id}&date=${dateStr}&locationId=${locationId}`
        )
        if (!res.ok) throw new Error('Failed to fetch slots')
        const data = await res.json()
        if (!cancelled) {
          setSlots(data.slots || [])
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load available times. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSlots()
    return () => { cancelled = true }
  }, [selectedDate, selectedStylist, locationId])

  // Reset state when dialog closes
  const resetState = useCallback(() => {
    setStep('service')
    setSelectedService(null)
    setSelectedStylist(null)
    setSelectedDate(undefined)
    setSelectedTime(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerNotes('')
    setError('')
    setBookingConfirmed(false)
    setConfirmationDetails(null)
    setSlots([])
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const handleNext = () => {
    setError('')
    switch (step) {
      case 'service':
        if (!selectedService) {
          setError('Please select a service')
          return
        }
        setStep('stylist')
        break
      case 'stylist':
        if (!selectedStylist) {
          setError('Please select a stylist')
          return
        }
        setStep('datetime')
        break
      case 'datetime':
        if (!selectedDate || !selectedTime) {
          setError('Please select a date and time')
          return
        }
        setStep('details')
        break
    }
  }

  const handleBack = () => {
    setError('')
    switch (step) {
      case 'stylist':
        setStep('service')
        break
      case 'datetime':
        setStep('stylist')
        setSelectedDate(undefined)
        setSelectedTime(null)
        setSlots([])
        break
      case 'details':
        setStep('datetime')
        break
    }
  }

  const handleSubmit = async () => {
    if (!locationId || !selectedService || !selectedStylist || !selectedDate || !selectedTime) return

    if (!customerName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!customerPhone.trim()) {
      setError('Please enter your phone number')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Combine date and time
      const dateStr = selectedDate.toISOString().split('T')[0]
      const appointmentDate = new Date(`${dateStr}T${selectedTime}:00`)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${apiUrl}/api/public/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          stylistId: selectedStylist.id,
          serviceId: selectedService.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          date: appointmentDate.toISOString(),
          notes: customerNotes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      setBookingConfirmed(true)
      setConfirmationDetails({
        serviceName: selectedService.name,
        stylistName: selectedStylist.name,
        date: selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: selectedTime,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    service: 'Select Service',
    stylist: 'Choose Stylist',
    datetime: 'Pick Date & Time',
    details: 'Your Details',
  }

  const stepNumbers: Record<Step, number> = {
    service: 1,
    stylist: 2,
    datetime: 3,
    details: 4,
  }

  // Disable past dates in calendar
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {bookingConfirmed ? 'Booking Confirmed' : stepTitles[step]}
          </DialogTitle>
          {!bookingConfirmed && (
            <DialogDescription>
              Step {stepNumbers[step]} of 4
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Step indicator */}
        {!bookingConfirmed && (
          <div className="flex items-center gap-2 mb-2">
            {(['service', 'stylist', 'datetime', 'details'] as Step[]).map(
              (s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      stepNumbers[step] > i + 1
                        ? 'bg-primary text-primary-foreground'
                        : stepNumbers[step] === i + 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {stepNumbers[step] > i + 1 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-8 h-0.5 ${
                        stepNumbers[step] > i + 1
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Booking confirmed */}
        {bookingConfirmed && confirmationDetails && (
          <div className="py-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Your Appointment is Booked!</h3>
              <p className="text-muted-foreground">
                We look forward to seeing you.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-6 text-left max-w-sm mx-auto space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Service</span>
                <span className="font-medium text-sm">{confirmationDetails.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Stylist</span>
                <span className="font-medium text-sm">{confirmationDetails.stylistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Date</span>
                <span className="font-medium text-sm">{confirmationDetails.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Time</span>
                <span className="font-medium text-sm">{confirmationDetails.time}</span>
              </div>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="min-w-[120px]">
              Done
            </Button>
          </div>
        )}

        {/* Step: Select Service */}
        {!bookingConfirmed && step === 'service' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : serviceGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No services available at the moment.
              </p>
            ) : (
              serviceGroups.map((group) => (
                <div key={group.category}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.category}
                  </h4>
                  <div className="space-y-2">
                    {group.services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service)
                          setError('')
                        }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedService?.id === service.id
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {service.name}
                            </div>
                            {service.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold text-sm text-primary">
                              {formatCurrency(service.price)}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="w-3 h-3" />
                              {service.duration} min
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Step: Select Stylist */}
        {!bookingConfirmed && step === 'stylist' && (
          <div className="space-y-3">
            {stylists.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No stylists available at this location.
              </p>
            ) : (
              stylists.map((stylist) => (
                <button
                  key={stylist.id}
                  onClick={() => {
                    setSelectedStylist(stylist)
                    setError('')
                  }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedStylist?.id === stylist.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {stylist.avatar ? (
                        <img
                          src={stylist.avatar}
                          alt={stylist.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{stylist.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {stylist.specialization}
                      </div>
                    </div>
                    {stylist.rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">
                          {stylist.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Select Date & Time */}
        {!bookingConfirmed && step === 'datetime' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Select a Date</h4>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    setSelectedTime(null)
                    setError('')
                  }}
                  disabled={{ before: today }}
                  className="rounded-xl border"
                />
              </div>
            </div>

            {selectedDate && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Available Times
                </h4>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No time slots available for this date.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => {
                          if (slot.available) {
                            setSelectedTime(slot.time)
                            setError('')
                          }
                        }}
                        disabled={!slot.available}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          selectedTime === slot.time
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : slot.available
                            ? 'bg-muted hover:bg-primary/10 hover:text-primary'
                            : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Customer Details */}
        {!bookingConfirmed && step === 'details' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Scissors className="w-4 h-4 text-primary" />
                <span className="font-medium">{selectedService?.name}</span>
                <Badge variant="secondary" className="ml-auto">
                  {formatCurrency(selectedService?.price ?? 0)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary" />
                <span>{selectedStylist?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span>
                  {selectedDate?.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-muted-foreground">at</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="+974 XXXX XXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Email <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Notes <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <Textarea
                  placeholder="Any special requests or preferences..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {!bookingConfirmed && (
          <div className="flex items-center justify-between pt-2">
            {step !== 'service' ? (
              <Button variant="outline" onClick={handleBack} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step === 'details' ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-2 min-w-[140px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    Confirm Booking
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-1">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
