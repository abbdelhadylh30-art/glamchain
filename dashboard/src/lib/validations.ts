/**
 * Zod Validation Schemas — Single Source of Truth
 *
 * All API input validation schemas live here.
 * Each route imports only the schemas it needs.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

export const cuid = z.string().min(1, 'ID is required')

export const email = z.string().email('Invalid email address')

export const phone = z.string().min(1, 'Phone is required').max(20, 'Phone too long')

export const optionalEmail = z.string().email('Invalid email address').optional().or(z.literal(''))

export const optionalPhone = z.string().max(20, 'Phone too long').optional()

export const positiveFloat = z.number().min(0, 'Must be 0 or greater')

export const positiveInt = z.number().int().min(0, 'Must be 0 or greater')

export const futureDate = z.string().datetime('Invalid date format').or(z.string().min(1)).refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date' }
)

// ---------------------------------------------------------------------------
// Appointment schemas
// ---------------------------------------------------------------------------

export const appointmentCreateSchema = z.object({
  locationId: cuid,
  customerId: cuid,
  stylistId: cuid,
  serviceId: cuid,
  date: futureDate,
  status: z.enum(['confirmed', 'pending', 'completed', 'cancelled', 'no_show']).optional(),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  totalPrice: positiveFloat.optional(),
})

export const appointmentUpdateSchema = z.object({
  id: cuid,
  locationId: cuid.optional(),
  customerId: cuid.optional(),
  stylistId: cuid.optional(),
  serviceId: cuid.optional(),
  date: futureDate.optional(),
  status: z.enum(['confirmed', 'pending', 'completed', 'cancelled', 'no_show']).optional(),
  paymentMethod: z.enum(['cash', 'card', 'digital_wallet']).optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  totalPrice: positiveFloat.optional(),
})

// ---------------------------------------------------------------------------
// Stylist schemas
// ---------------------------------------------------------------------------

export const stylistCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: email,
  phone: optionalPhone.default(''),
  locationId: cuid,
  specialization: z.string().min(1, 'Specialization is required').max(100).optional().default('Stylist'),
  commissionRate: z.number().min(0).max(1, 'Commission must be between 0 and 1').optional().default(0.3),
})

export const stylistUpdateSchema = z.object({
  id: cuid,
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: email.optional(),
  phone: optionalPhone.optional(),
  locationId: cuid.optional(),
  specialization: z.string().max(100).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Customer schemas
// ---------------------------------------------------------------------------

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: optionalEmail.optional().nullable(),
  phone: phone,
  locationId: cuid.optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export const customerUpdateSchema = z.object({
  id: cuid,
  name: z.string().min(1).max(100).optional(),
  email: optionalEmail.optional().nullable(),
  phone: z.string().max(20).optional(),
  locationId: cuid.optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

// ---------------------------------------------------------------------------
// Service schemas
// ---------------------------------------------------------------------------

export const serviceCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().min(1, 'Category is required').max(50),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration too long'),
  price: positiveFloat,
  description: z.string().max(500).optional().nullable(),
})

export const serviceUpdateSchema = z.object({
  id: cuid,
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  duration: z.number().int().min(5).max(480).optional(),
  price: positiveFloat.optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Inventory schemas
// ---------------------------------------------------------------------------

export const inventoryCreateSchema = z.object({
  locationId: cuid,
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().min(1, 'Category is required').max(50),
  quantity: z.number().int().min(0, 'Quantity must be 0 or greater'),
  minStock: z.number().int().min(0).optional().default(5),
  unitPrice: positiveFloat,
  supplier: z.string().max(100).optional().nullable(),
})

export const inventoryUpdateSchema = z.object({
  id: cuid,
  locationId: cuid.optional(),
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  quantity: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  unitPrice: positiveFloat.optional(),
  supplier: z.string().max(100).optional().nullable(),
})

// ---------------------------------------------------------------------------
// Expense schemas
// ---------------------------------------------------------------------------

export const expenseCreateSchema = z.object({
  locationId: cuid,
  category: z.string().min(1, 'Category is required').max(50),
  description: z.string().min(1, 'Description is required').max(500),
  amount: positiveFloat,
  date: futureDate,
})

export const expenseUpdateSchema = z.object({
  id: cuid,
  locationId: cuid.optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().min(1).max(500).optional(),
  amount: positiveFloat.optional(),
  date: futureDate.optional(),
})

// ---------------------------------------------------------------------------
// Location schemas (for settings)
// ---------------------------------------------------------------------------

export const locationCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().min(1, 'Address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional().default('09:00'),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional().default('21:00'),
})

export const locationUpdateSchema = z.object({
  id: cuid,
  name: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// User schemas (for settings)
// ---------------------------------------------------------------------------

export const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: email,
  role: z.enum(['super_admin', 'owner', 'receptionist', 'staff']).optional().default('staff'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  locationId: cuid.optional().nullable(),
})

export const userUpdateSchema = z.object({
  id: cuid,
  name: z.string().min(1).max(100).optional(),
  email: email.optional(),
  role: z.enum(['super_admin', 'owner', 'receptionist', 'staff']).optional(),
  locationId: cuid.optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  currentPassword: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Public booking schema
// ---------------------------------------------------------------------------

export const publicBookingSchema = z.object({
  locationId: cuid,
  stylistId: cuid,
  serviceId: cuid,
  customerName: z.string().min(1, 'Name is required').max(100),
  customerPhone: phone,
  customerEmail: z.string().email('Invalid email format').optional().nullable(),
  date: futureDate,
  notes: z.string().max(1000).optional().nullable(),
  whatsappConsent: z.boolean().optional().default(false),
})

// ---------------------------------------------------------------------------
// Password change schema
// ---------------------------------------------------------------------------

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
})

// ---------------------------------------------------------------------------
// Helper to format Zod errors into a user-friendly object
// ---------------------------------------------------------------------------

export function formatZodError(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root'
    if (!formatted[path]) formatted[path] = []
    formatted[path].push(issue.message)
  }
  return formatted
}
