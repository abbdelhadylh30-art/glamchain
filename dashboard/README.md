# GlamChain Dashboard — Multi-tenant SaaS app

The "backend" of the GlamChain monorepo. A Next.js 16 app that owns:

- **All API routes** — public booking API, protected dashboard API (customers,
  stylists, appointments, services, inventory, financials, expenses, settings,
  dashboard aggregates), and the WhatsApp webhook.
- **NextAuth** (`/api/auth/[...nextauth]`) — CredentialsProvider, JWT sessions,
  bcrypt password hashing, IP-based login rate limiting.
- **Prisma + SQLite** (local dev) — multi-tenant schema: Tenant → Locations →
  Stylists/Customers/Services/Appointments/Inventory/Expenses/AuditLogs/
  WhatsAppMessageLogs.
- **Middleware** — CORS for public routes + auth/RBAC for protected routes.
- **The dashboard UI** — sidebar + header + 8 views (Dashboard, Appointments,
  Stylists, Customers, Services/Inventory, Financials, Settings).

## Port

Runs on **port 3001**.

## Architecture

| App | Port | Role |
|-----|------|------|
| **dashboard** (this app) | 3001 | NextAuth + all API routes + Prisma + the SaaS UI |
| **landing** | 3002 | Marketing page + embedded booking widget (calls this app's API) |
| **widget** | (static) | Standalone HTML booking widget (calls this app's public API) |

## Environment

`.env`:

```
DATABASE_URL="file:./dev.db"                # SQLite local file
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=glamchain-dev-secret-change-me-in-production
WIDGET_ALLOWED_ORIGINS=http://localhost:3002,http://localhost:8000,...
NEXT_PUBLIC_LANDING_URL=http://localhost:3002
# WhatsApp Cloud API (optional in dev):
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

## Run

```bash
cd dashboard
bun install
bun run db:push      # create SQLite schema
bun run db:seed      # seed minimal demo data (3 tenants, logins printed)
bun run dev          # → http://localhost:3001
```

Or use the monorepo's `start.sh` from one level up:

```bash
cd .. && ./start.sh
```

## Demo logins (after `bun run db:seed`)

All passwords are `password123`:

| Role | Email | Sees |
|------|-------|------|
| Platform super_admin | `admin@glamchain.com` | All tenants |
| Tenant 1 owner (GlamChain Qatar) | `owner.westbay@glamchain.qa` | West Bay salon |
| Tenant 2 owner (Azure Med Spa Dubai) | `owner@azuremedspa.ae` | Dubai Marina clinic |
| Tenant 3 owner (Nour Beauty Lounge — Egypt) | `owner@noorbeauty.eg` | 3 Egyptian locations |
| Tenant 3 receptionist (Faisal Street) | `reception.faisal@noorbeauty.eg` | Faisal salon only |

## Public API (used by the landing page + widget)

- `GET  /api/config` — business identity, default location, branding
- `GET  /api/public/booking?locationId=...` — services + stylists for that location
- `GET  /api/public/booking/slots?stylistId=...&date=...&locationId=...` — available slots with conflict detection
- `POST /api/public/booking` — create an appointment (customer upsert by phone)
- `POST /api/whatsapp/webhook` — Meta WhatsApp Cloud API inbound + status callbacks
- `GET  /api/whatsapp/status` — WhatsApp config + recent message log

## Protected API (RBAC-enforced, cookie auth)

- `/api/dashboard` — KPI aggregates (any authed user)
- `/api/appointments` — CRUD (any authed user)
- `/api/stylists` — CRUD (any authed user)
- `/api/services` — CRUD (any authed user)
- `/api/inventory` — CRUD (any authed user)
- `/api/customers` — CRUD (receptionist+)
- `/api/financials` — read (owner+)
- `/api/expenses` — CRUD (owner+)
- `/api/settings` — read/update tenant + branding (owner+)
- `/api/auth/change-password` — change own password

## Notes

- **SQLite** is used for local dev. To run on PostgreSQL/MySQL, change
  `provider` in `prisma/schema.prisma` and update `DATABASE_URL`.
- The dashboard's root `/` route redirects to `/dashboard`, which renders
  `LoginView` if not authenticated or the full dashboard UI if authenticated.
  The marketing landing page is in the separate `landing/` app.
- CORS is allowed for the public API for origins listed in
  `WIDGET_ALLOWED_ORIGINS`. Authenticated dashboard routes are NOT CORS-enabled
  (they use httpOnly NextAuth cookies which don't compose safely cross-origin).
