# Ordo CRM Platform

Ordo is a CRM-first business management platform.

Current production focus:
- CRM workspace for orders, customers, and team execution
- Admin panel for operations, health checks, and billing controls
- Paddle-based billing foundation with entitlement-driven access
- Campaigns/inbox delivery and read-state tracking
- Support and sales request handling flows

## Current Status (April 2026)

### Live platform scope
- CRM module is active
- Admin module is active (`/admin`)
- Campaign flows are active (announcement/survey tracking endpoints and admin campaigns pages)
- Support flows are active (request views, admin handling routes, attachments)
- Sales requests flow is active in admin
- Legal pages are published and linked in footer:
  - Terms
  - Privacy
  - Refund Policy
- Public pricing page is accessible without login (`/pricing`)

### Billing system (implemented)
- Entitlement resolver (`plan_features + manual_entitlement_overrides`)
- Subscription service and account billing status API
- Paddle integration:
  - customer sync
  - subscription sync
  - plan change flow
  - cancel flow
  - preview endpoint
- Webhook pipeline:
  - signature verification
  - idempotent event persistence
  - replay/retry routes
- Background jobs:
  - resync
  - retry webhooks
  - expire overrides
- Admin billing UI:
  - `/admin/billing`
  - `/admin/billing/accounts/[accountId]`
  - subscription, entitlements, overrides management

### Admin and product operations (implemented)
- Admin dashboard with period presets and custom range filtering
- Compact admin UI with desktop rail behavior
- Users/businesses/invites/orders/health/activity admin sections
- Support admin pages and status/action routes
- Sales admin page for inbound enterprise/pricing leads

### Campaigns and inbox (implemented)
- Campaign read/open/click/dismiss API routes
- Inbox mark-read behavior aligned for campaign items
- Campaign feed state persistence hardening
- Survey completion/read-state compatibility handling in topbar inbox feed

### Plans and pricing seeds
Plans supported (only):
- `solo`
- `starter`
- `business`
- `pro`

Important schema note:
- In `plan_prices`, amount column is `unit_amount_cents` (not `amount_minor`)

## Tech stack
- Next.js App Router
- TypeScript
- Supabase (PostgreSQL + Auth)
- Paddle (billing provider)
- Vercel deployment

## Key folders
- `src/app/admin` - admin pages and dashboards
- `src/app/api/billing` - billing APIs and webhook handlers
- `src/app/api/campaigns` - campaign interaction endpoints
- `src/app/api/support` - support request/admin endpoints
- `src/lib/billing` - billing domain logic
- `src/lib/campaigns` - campaigns read/open/state service logic
- `supabase/migrations` - SQL migrations
- `supabase/seed.sql` - seed data
- `product/backlog_v2.md` - current product/engineering backlog

## Operational notes
- Access checks must be entitlement-based (no hardcoded plan-name gating)
- Local DB is source of truth for billing state
- Paddle is provider/mirror and checkout surface
- Webhook events must remain idempotent

## Next high-priority work
1. Production observability for billing and webhooks (dashboards + alerts)
2. End-to-end smoke tests for checkout/change-plan/cancel/replay
3. Campaign/inbox analytics reliability checks on production data
4. Admin UX polish for large datasets (density mode, saved filters)
5. Legal copy localization alignment (EN/UA/RU consistency)
