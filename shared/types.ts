/**
 * GlamChain — shared TypeScript types.
 *
 * These types describe the shape of the data exchanged between the three apps
 * in the monorepo:
 *
 *   widget/     → standalone HTML booking widget
 *   landing/    → Next.js marketing page (calls dashboard API)
 *   dashboard/  → Next.js SaaS app (owns Prisma + all API routes)
 *
 * The dashboard's Prisma schema is the source of truth for these types, but
 * the widget and landing page don't have access to Prisma. They can `import`
 * from this file (after configuring a path alias) or simply copy the types
 * they need.
 *
 * NOTE: This file is deliberately framework-agnostic — no Next.js, no React,
 * no Prisma imports. Just plain TypeScript so it can be consumed by any of
 * the three apps.
 */

// ---------------------------------------------------------------------------
// Roles + statuses (mirror the Prisma enums in dashboard/prisma/schema.prisma)
// ---------------------------------------------------------------------------

export type Role = 'super_admin' | 'owner' | 'receptionist' | 'staff'

export type AppointmentStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'no_show'

// ---------------------------------------------------------------------------
// Public API responses (returned by GET /api/public/booking etc.)
// ---------------------------------------------------------------------------

export interface ServiceItem {
  id: string
  name: string
  category: string
  duration: number // minutes
  price: number
  description: string | null
}

export interface ServiceGroup {
  category: string
  services: ServiceItem[]
}

export interface StylistItem {
  id: string
  name: string
  specialization: string
  rating: number
  avatar: string | null
}

export interface TimeSlot {
  time: string // "HH:mm"
  available: boolean
}

export interface LocationInfo {
  id: string
  name: string
  address: string
  city: string
  phone: string
  email: string
  openTime: string // "09:00"
  closeTime: string // "21:00"
}

export interface PublicBookingResponse {
  services: ServiceGroup[]
  stylists: StylistItem[]
}

export interface PublicSlotsResponse {
  slots: TimeSlot[]
  date: string // ISO date
  stylistId: string
}

export interface BookingConfirmation {
  appointmentId: string
  serviceName: string
  stylistName: string
  date: string // ISO date
  time: string // "HH:mm"
}

// ---------------------------------------------------------------------------
// Config endpoint (GET /api/config — used by landing page + widget)
// ---------------------------------------------------------------------------

export interface BusinessConfig {
  name: string
  tagline: string
  primaryColor: string
  accentColor: string
  monogram: string
  timezone: string
  currency: string
  locale: string
}

export interface ConfigResponse {
  business: BusinessConfig
  location: LocationInfo | null
}

// ---------------------------------------------------------------------------
// NextAuth session shape (matches the JWT callback in dashboard/src/lib/auth.ts)
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  locationId?: string
  tenantId?: string
}

export interface Session {
  user: SessionUser
  expires: string
}

// ---------------------------------------------------------------------------
// Widget config (the JSON files in widget/configs/*.json)
// ---------------------------------------------------------------------------

export interface WidgetService {
  id: string
  name: string
  nameAr?: string
  durationMin: number
}

export interface WidgetWorkingHours {
  open: string
  close: string
} // null = closed that day

export interface WidgetPhoneCountry {
  code: string
  label: string
}

export interface WidgetConfig {
  business: {
    name: string
    nameAr?: string
    tagline?: string
    taglineAr?: string
    monogram?: string
    primaryColor?: string
    accentColor?: string
    logoUrl?: string | null
    timezone?: string
    ogImageUrl?: string | null
    showBranding?: boolean
    // Live mode wiring — set these to point the widget at a real GlamChain dashboard
    bookingApiUrl?: string // e.g. "http://localhost:3001/api/public"
    locationId?: string // the dashboard Location ID to book against
  }
  services?: WidgetService[]
  workingHours?: Record<string, WidgetWorkingHours | null>
  slotGranularityMin?: number
  daysAhead?: number
  defaultLocale?: 'auto' | 'en' | 'ar'
  phone?: {
    countryCodes?: WidgetPhoneCountry[]
    defaultCode?: string
  }
  demo?: { whatsappMock?: boolean }
}
