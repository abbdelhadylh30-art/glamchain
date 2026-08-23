import { redirect } from 'next/navigation'

/**
 * Root route for the dashboard app.
 *
 * The GlamChain landing page is now a separate Next.js app (see `../landing/`).
 * When a user lands on the dashboard's root URL directly (e.g. by following
 * the "Staff Login" link on the landing page), we send them to `/dashboard`,
 * where the existing (dashboard)/dashboard/page.tsx logic either:
 *   - shows the LoginView component (if not authenticated), or
 *   - shows the full dashboard UI (if authenticated).
 *
 * In production, set `LANDING_URL` to point back at the marketing site.
 */
export default function RootPage() {
  // If a LANDING_URL is configured, bounce visitors back to the marketing site.
  // Staff who clicked "Staff Login" are sent here intentionally — they want the
  // login form, so we redirect them to /dashboard which renders LoginView.
  redirect('/dashboard')
}
