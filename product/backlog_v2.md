# Ordo Backlog v2 (Updated: April 2026)

This backlog reflects what is already implemented in code and what remains for the next delivery cycles.

## Recently Completed

### Core product and design system
- Major UI/system refinement across rails, controls, and shared component styles
- Brand/logo/favicon alignment with design specifications
- Admin shell redesign with compact navigation behavior
- Dashboard and list-page density improvements for operational usage

### Campaigns and inbox reliability
- Fixed campaign read-state persistence across inbox endpoints
- Routed campaign read operations through dedicated campaign APIs
- Added stricter fallback/error handling for campaign state updates
- Improved survey/campaign notification state behavior in topbar feed

### Support and sales operations
- Added/expanded admin support request handling routes and detail pages
- Added support attachments handling endpoints
- Added sales requests admin workflow surfaces

### Billing and Paddle activation
- Implemented backend billing module (`src/lib/billing/*`)
- Implemented billing API routes (`src/app/api/billing/*`)
- Implemented Paddle webhook verification + idempotent processing
- Added webhook replay/retry and resync jobs
- Added admin overrides flow with audit logging
- Added billing access-check API
- Added plan seed migration for strict plan set:
  - `solo`
  - `starter`
  - `business`
  - `pro`
- Fixed seed compatibility with DB schema:
  - use `plan_prices.unit_amount_cents` instead of `amount_minor`

### Admin billing UI
- Added `/admin/billing`
- Added `/admin/billing/accounts/[accountId]`
- Added UI sections for:
  - subscription info
  - entitlements
  - manual overrides (create/deactivate)
- Linked Billing in admin left navigation

### Legal and Paddle compliance
- Published legal pages in footer:
  - Terms
  - Privacy
  - Refund Policy
- Added support contact:
  - `support@ordo.uno`
- Ensured pricing/legal visibility without auth gate where required

### Admin UX improvements
- Reduced spacing/density in admin UI
- Improved compact table/card styles
- Added dashboard period filtering presets:
  - today
  - yesterday
  - week
  - current month
  - previous month
  - all time
  - custom range
- Added desktop rail behavior and improved nav compactness

## In Progress

1. Final admin navigation polish
- Finalize collapse/expand behavior and persistence across all admin pages.

2. Production rollout validation
- Verify staging/prod parity for billing env vars and webhook endpoints.
- Validate analytics/admin data behavior on production DB.
- Validate campaign/inbox state behavior on production DB.

## Next Priorities (P0/P1)

### P0
1. Billing production hardening
- Add alerts for failed webhooks and retry exhaustion.
- Add operational dashboard for billing_webhook_events.

2. E2E billing test pack
- checkout -> webhook -> entitlement activation
- change plan -> webhook finalization
- cancel at period end -> status transition
- replay path validation

3. Data and migration hygiene
- Confirm migration history parity between staging and production.
- Verify seeds are idempotent in real environments.

4. Campaign and inbox observability
- Add focused telemetry for campaign read/open/click/dismiss pipeline.
- Add diagnostics for inbox merge/state consistency.

### P1
1. Admin productivity upgrades
- Optional density mode toggle
- Saved filters in admin lists
- Better mobile handling for long filter rows

2. Localization consistency
- Align legal/admin copy for EN/UA/RU.

3. Support and sales workflow polish
- SLA indicators and queue filtering for support.
- Better conversion/status views for sales requests.

## Guardrails (Must Keep)

- No hardcoded plan checks in business access control.
- Access decisions must be entitlement-driven.
- Local DB remains source of truth for billing state.
- Paddle remains payment/billing provider and external mirror.
- Webhook processing must stay idempotent.

## Suggested Next Sprint (10 working days)

1. Days 1-2
- Billing observability and alerting baseline.

2. Days 3-5
- E2E billing scenarios and failure-path tests.

3. Days 6-7
- Staging/prod env parity audit and fixes (billing + campaign/inbox paths).

4. Days 8-9
- Admin UX final polish (collapse state, density toggle, filter ergonomics).

5. Day 10
- Release checklist, rollback notes, and deployment verification.
