# GlamChain Landing — Standalone marketing + booking page

A separate Next.js app that hosts **only** the GlamChain landing page and embedded
booking widget. It calls the **Dashboard app**'s API for all data and uses the
dashboard's NextAuth server for sessions.

## Architecture

| App | Port | Role |
|-----|------|------|
| **landing** (this app) | 3002 | Marketing page + embedded booking widget |
| **dashboard** | 3001 | NextAuth + all API routes + Prisma + the SaaS UI |

The landing page does **not** have:
- API routes (it calls the dashboard via `NEXT_PUBLIC_API_URL`)
- Prisma / database access
- NextAuth route handlers (it only ships the `<SessionProvider>` and reads
  the dashboard's session via `NEXTAUTH_URL`)

## Environment

`.env`:

```
NEXTAUTH_URL=http://localhost:3001          # the dashboard app (where NextAuth lives)
NEXT_PUBLIC_API_URL=http://localhost:3001   # used by fetch() in the landing page
NEXT_PUBLIC_LANDING_URL=http://localhost:3002
NEXTAUTH_SECRET=glamchain-dev-secret-change-me-in-production
```

## Run

```bash
# 1. Start the dashboard first (it owns the DB + NextAuth)
cd ../dashboard && bun install && bun run db:push && bun run db:seed && bun run dev

# 2. In another terminal, start the landing page
cd ../landing && bun install && bun run dev
# → http://localhost:3002
```

Or use the monorepo's `start.sh`:

```bash
cd .. && ./start.sh
```

## Key files

| Path | Purpose |
|------|---------|
| `src/app/page.tsx` | Dark luxury landing page (hero, services, contact) |
| `src/app/layout.tsx` | Root layout — wraps children in `<SessionProvider>` |
| `src/app/globals.css` | Tailwind + GlamChain animation keyframes |
| `src/components/booking/booking-widget.tsx` | 4-step booking dialog (calls dashboard API) |
| `src/components/auth/session-provider.tsx` | NextAuth `SessionProvider` wrapper |
| `src/components/auth/login-view.tsx` | Standalone login card (kept for reference; the landing page itself links out to the dashboard for login) |
| `src/components/ui/*` | shadcn/ui primitives needed by the booking widget |
| `src/lib/config.ts` | Static business + currency config (read from `client-config.json`) |
| `client-config.json` | Static business identity (name, tagline, currency) |

## Notes

- The landing page's `useSession()` hook fetches `/api/auth/session` relative to
  its own origin (`localhost:3002`). Since the landing app has no NextAuth route
  handlers, it will return `unauthenticated` — so the page always renders in
  marketing mode (shows "Staff Login" button that links out to the dashboard).
- To wire cross-origin session sharing, add a Next.js rewrite in `next.config.ts`
  that proxies `/api/auth/*` to `${NEXTAUTH_URL}/api/auth/*`. Left as a TODO for
  the user — the current "link out to dashboard" flow works well enough.
- All `fetch()` calls in `page.tsx` and `booking-widget.tsx` use
  `${process.env.NEXT_PUBLIC_API_URL}` so they hit the dashboard correctly.
