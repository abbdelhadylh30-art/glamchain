/**
 * GlamChain — shared business config.
 *
 * Central place for cross-app constants: ports, default origins, the dev
 * super_admin login, and the supported GCC + Egyptian phone country codes.
 *
 * The dashboard, landing, and widget can all read from this file (the widget
 * does so by inlining the relevant values; the Next.js apps can `import`).
 */

export const PORTS = {
  dashboard: 3001,
  landing: 3002,
  widget: 8000, // python -m http.server convention
} as const

export const URLS = {
  dashboard: `http://localhost:${PORTS.dashboard}`,
  landing: `http://localhost:${PORTS.landing}`,
  widget: `http://localhost:${PORTS.widget}`,
} as const

/**
 * Default origins the dashboard's middleware should allow for CORS on its
 * public booking endpoints. Append your production origins via the
 * `WIDGET_ALLOWED_ORIGINS` env var on the dashboard app.
 */
export const DEFAULT_CORS_ORIGINS = [
  URLS.landing,
  URLS.widget,
  URLS.dashboard,
  'http://127.0.0.1:3002',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:3001',
]

/**
 * Default dev super_admin login — created by `prisma/seed-minimal.ts` on the
 * dashboard app. Surfaced here so the landing page + widget can show a
 * "demo credentials" hint if they want to.
 */
export const DEV_CREDENTIALS = {
  email: 'admin@glamchain.com',
  password: 'password123',
  role: 'super_admin' as const,
}

/**
 * The GCC + Egyptian phone country codes the widget exposes by default.
 * Used by `widget/configs/*.json` files. Keep in sync with the dashboard's
 * customer phone validation if you change this list.
 */
export const DEFAULT_PHONE_COUNTRY_CODES = [
  { code: '+971', label: '🇦🇪 UAE +971' },
  { code: '+966', label: '🇸🇦 KSA +966' },
  { code: '+965', label: '🇰🇼 KW +965' },
  { code: '+974', label: '🇶🇦 QA +974' },
  { code: '+973', label: '🇧🇭 BH +973' },
  { code: '+968', label: '🇴🇲 OM +968' },
  { code: '+20', label: '🇪🇬 EG +20' },
]

/**
 * The booking-widget step names — referenced by both the standalone HTML
 * widget (inline data) and the React booking-widget component on the landing
 * page (live mode).
 */
export const BOOKING_STEPS = ['service', 'stylist', 'datetime', 'details'] as const
export type BookingStep = (typeof BOOKING_STEPS)[number]
