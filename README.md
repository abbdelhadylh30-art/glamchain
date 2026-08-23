# GlamChain — 3-app monorepo

GlamChain is a multi-tenant **salon chain management SaaS** for the GCC +
Egypt market. This repo splits the original monolithic Next.js app into
**three separate but connected apps** so each one can evolve, scale, and
deploy independently.

```
glamchain-mono/
├── README.md                    ← you are here
├── start.sh                     ← one-command startup (dashboard + landing)
│
├── widget/                      ← App 1: standalone HTML booking widget
│   ├── booking-widget.html      ← the actual widget (zero build step)
│   ├── demo.html                ← side-by-side demo page
│   └── configs/
│       ├── noor-beauty-lounge.json
│       ├── azure-med-spa.json
│       └── azure-med-spa-live.json   ← live mode (points at the dashboard API)
│
├── landing/                     ← App 2: marketing landing page (Next.js)
│   ├── package.json             ← port 3002
│   └── src/
│       ├── app/
│       │   ├── layout.tsx        ← wraps children in <SessionProvider>
│       │   ├── page.tsx          ← dark luxury landing + embedded booking widget
│       │   └── globals.css
│       ├── components/
│       │   ├── auth/             ← session-provider, login-view
│       │   ├── booking/          ← booking-widget (calls dashboard API)
│       │   └── ui/               ← shadcn primitives (button, dialog, etc.)
│       └── lib/                  ← config, utils, store (zustand)
│
├── dashboard/                   ← App 3: the SaaS dashboard (Next.js)
│   ├── package.json             ← port 3001
│   ├── prisma/
│   │   ├── schema.prisma        ← SQLite provider for local dev
│   │   ├── seed-minimal.ts      ← 3 tenants, demo logins
│   │   └── seed.ts              ← full seed (optional)
│   ├── .env                     ← DATABASE_URL="file:./dev.db"
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx          ← redirects to /dashboard (which shows LoginView)
│       │   ├── (dashboard)/     ← dashboard UI pages
│       │   └── api/             ← ALL API routes (public + private + whatsapp)
│       ├── components/          ← all UI components (sidebar, views, etc.)
│       ├── hooks/               ← use-mobile, use-toast, use-permissions
│       ├── lib/                 ← auth, db, whatsapp, rate-limit, etc.
│       └── middleware.ts        ← CORS + RBAC
│
└── shared/                      ← shared types + constants
    ├── types.ts                 ← cross-app TypeScript interfaces
    └── config.ts                ← ports, default CORS origins, dev logins
```

## The three apps at a glance

| App | Tech | Port | What it does |
|-----|------|------|---------------|
| **widget** | Pure HTML + vanilla JS | (any static host) | Standalone booking widget a salesperson can hand to a prospect. Loads a JSON config via `?config=`. Works in **demo mode** (mock WhatsApp) or **live mode** (calls dashboard's `/api/public/booking`). |
| **landing** | Next.js 16 + Tailwind + shadcn/ui | 3002 | The marketing site + the embedded version of the booking widget. Calls the dashboard's API for all data. No DB, no NextAuth route handlers — just a `<SessionProvider>` that points at the dashboard. |
| **dashboard** | Next.js 16 + Prisma + NextAuth | 3001 | The full SaaS app: every API route, the multi-tenant Prisma schema, NextAuth credentials login, the WhatsApp webhook, the dashboard UI (8 views), RBAC middleware. |

## How they connect

```
                       ┌─────────────────────────────────────────────────────┐
                       │                                                     │
   widget/             │              dashboard (port 3001)                  │
   booking-widget.html │  ┌──────────────────────────────────────────────┐   │
        └─ ?config=    │  │                                              │   │
            *.json     │  │  /api/config                                 │   │
                       │  │  /api/public/booking         ◄──── widget     │   │
                       │  │  /api/public/booking/slots    ◄──── landing    │   │
                       │  │  /api/auth/[...nextauth]                      │   │
                       │  │  /api/dashboard  (RBAC)                        │   │
                       │  │  /api/appointments (RBAC)                      │   │
                       │  │  /api/whatsapp/webhook                         │   │
                       │  │  ... + Prisma + SQLite                         │   │
                       │  └──────────────────────────────────────────────┘   │
   landing (port 3002) │                                                     │
     page.tsx ─────────┼──► uses ${NEXT_PUBLIC_API_URL} for fetch() calls     │
     booking-widget ───┼──► uses ${NEXT_PUBLIC_API_URL} for fetch() calls   │
                       │  useSession() tries /api/auth/session (its own     │
                       │  origin — won't be authenticated; landing shows    │
                       │  the marketing mode + a "Staff Login" link out)    │
                       └─────────────────────────────────────────────────────┘
```

- The **widget** is configured by `widget/configs/*.json`. To go live, set
  `business.bookingApiUrl` to `http://localhost:3001/api/public` and
  `business.locationId` to a real Location ID from the seeded DB.
- The **landing page** uses `process.env.NEXT_PUBLIC_API_URL` (= the dashboard
  URL) inside every `fetch()` so all data calls hit the dashboard cross-origin.
  CORS for `/api/public/*` and `/api/config` is allowed by the dashboard's
  middleware (see `WIDGET_ALLOWED_ORIGINS`).
- The **landing page**'s `useSession()` calls `/api/auth/session` relative to
  its own origin (port 3002) — which has no NextAuth route. In practice that
  returns `unauthenticated`, so the landing page always renders in marketing
  mode and shows a "Staff Login" link that takes the user to the dashboard.
  Cross-origin session sharing is left as a TODO (would require a Next.js
  rewrite on the landing page proxying `/api/auth/*` to the dashboard).
- The **dashboard**'s root `/` route redirects to `/dashboard`, which renders
  `LoginView` if not authenticated or the full dashboard UI if authenticated.

## Quick start

```bash
# 1. Prerequisites
#    - bun      → https://bun.sh
#    - python3  → only needed if you want to serve the standalone widget locally

# 2. One-command startup (installs deps + seeds DB + starts both apps)
cd glamchain-mono
./start.sh
# → Dashboard : http://localhost:3001
# → Landing   : http://localhost:3002

# 2b. (optional) Also serve the standalone widget on port 8000
./start.sh widget
# → Widget    : http://localhost:8000/booking-widget.html
```

The first run of `start.sh` will:
1. `cd dashboard && bun install`
2. `bun run db:generate` (Prisma client)
3. `bun run db:push` (create `prisma/dev.db` with all tables)
4. `bun run db:seed` (3 tenants, ~50 rows of demo data — logins printed)
5. `bun run dev` on port 3001 (in background)
6. `cd landing && bun install`
7. `bun run dev` on port 3002 (in background)

Logs are written to `dashboard.log` and `landing.log` at the repo root.

## Demo logins (after seeding)

All passwords are `password123`:

| Role | Email | Sees |
|------|-------|------|
| Platform super_admin | `admin@glamchain.com` | All tenants |
| GlamChain Qatar owner | `owner.westbay@glamchain.qa` | West Bay salon |
| Azure Med Spa Dubai owner | `owner@azuremedspa.ae` | Dubai Marina clinic |
| Nour Beauty Lounge (Egypt) owner | `owner@noorbeauty.eg` | 3 Egyptian locations |
| Nour Beauty Lounge (Egypt) receptionist | `reception.faisal@noorbeauty.eg` | Faisal salon only |

## Running each app individually

```bash
# --- Dashboard ---
cd dashboard
bun install
bun run db:push
bun run db:seed
bun run dev          # → http://localhost:3001

# --- Landing page ---
cd landing
bun install
bun run dev          # → http://localhost:3002

# --- Widget (standalone) ---
cd widget
python3 -m http.server 8000
# → http://localhost:8000/booking-widget.html             (default config)
# → http://localhost:8000/booking-widget.html?config=configs/azure-med-spa.json
# → http://localhost:8000/demo.html                       (side-by-side demo)
```

## Environment variables

### `dashboard/.env`

```bash
DATABASE_URL="file:./dev.db"                           # SQLite local file
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=glamchain-dev-secret-change-me-in-production
WIDGET_ALLOWED_ORIGINS=http://localhost:3002,http://localhost:8000,http://localhost:3001
NEXT_PUBLIC_LANDING_URL=http://localhost:3002
# WhatsApp Cloud API (optional in dev):
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

### `landing/.env`

```bash
NEXTAUTH_URL=http://localhost:3001                          # the dashboard
NEXT_PUBLIC_API_URL=http://localhost:3001                   # used by fetch()
NEXT_PUBLIC_LANDING_URL=http://localhost:3002
NEXTAUTH_SECRET=glamchain-dev-secret-change-me-in-production   # MUST match dashboard
```

### `widget/configs/*.json`

The widget's "env" is just the JSON config file. The two pieces that wire it
to the dashboard in live mode are:

```jsonc
{
  "business": {
    "bookingApiUrl": "http://localhost:3001/api/public",
    "locationId":   "REPLACE_WITH_REAL_LOCATION_ID"  // from the seeded DB
  }
}
```

Run `bun run db:seed` on the dashboard, then look in the DB (or hit
`GET /api/config` on port 3001) to find a real `locationId`. Drop it into
`azure-med-spa-live.json` and open
`http://localhost:8000/booking-widget.html?config=configs/azure-med-spa-live.json`
to see live 4-step booking (service → stylist → datetime → details) with
real conflict detection.

## Tech stack

- **Framework**: Next.js 16 (App Router), TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style) + Lucide icons
- **DB**: Prisma ORM with SQLite (local dev) — switch the provider to
  PostgreSQL/MySQL in production by editing `dashboard/prisma/schema.prisma`
- **Auth**: NextAuth.js v4 (CredentialsProvider, JWT sessions, bcrypt)
- **State**: Zustand (client) — no TanStack Query (the dashboard uses
  SWR-style fetch hooks in the views themselves)
- **Widget**: vanilla HTML/CSS/JS — zero dependencies, zero build step

## Production notes

- **Ports**: in dev, dashboard=3001, landing=3002, widget=8000. In production
  you'd typically put each app on its own subdomain (`app.glamchain.com`,
  `www.glamchain.com`, `book.glamchain.com`) and update the env vars + the
  widget's `bookingApiUrl` accordingly.
- **DB**: change `provider = "sqlite"` to `provider = "postgresql"` (or
  `mysql`) in `dashboard/prisma/schema.prisma` and update `DATABASE_URL`.
  SQLite doesn't enforce enum constraints natively — Prisma handles the
  translation, but production-grade deployments should use Postgres.
- **CORS**: in production, set `WIDGET_ALLOWED_ORIGINS` on the dashboard to
  the comma-separated list of domains you want to allow (your widget CDN,
  your landing page, etc.).
- **Sessions**: the landing page currently shows "Staff Login" as a link to
  the dashboard. To share sessions cross-subdomain in production, configure
  NextAuth with a shared cookie domain (`.glamchain.com`) and the dashboard
  will issue cookies readable by `www.glamchain.com`.

## License

Proprietary. © GlamChain.
