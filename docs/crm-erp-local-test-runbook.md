# CRM/ERP Local Test Runbook

## Preconditions

- PostgreSQL is reachable.
- `psql` is installed and available in PATH.
- `DATABASE_URL` points to a disposable/staging database for test runs.

## One-command run (migrations + seed + smoke)

PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app"
powershell -ExecutionPolicy Bypass -File scripts/db/run_crm_erp_checks.ps1 -DatabaseUrl $env:DATABASE_URL
```

## One-command run with UAT package

PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app"
powershell -ExecutionPolicy Bypass -File scripts/db/run_crm_erp_checks.ps1 -DatabaseUrl $env:DATABASE_URL -IncludeUat
```

## API check for confirm endpoint

After DB checks pass and app is running:

```http
POST /api/orders/{orderId}/confirm
Content-Type: application/json

{
  "businessId": "<business_uuid>",
  "expectedVersion": 1,
  "reservationPolicy": "FULL_ONLY",
  "warehouseId": "<warehouse_uuid>",
  "correlationId": "<uuid_optional>"
}
```

## Files involved

- Migration with transaction function: `supabase/migrations/20260409152000_create_confirm_order_tx.sql`
- Seed scenarios: `supabase/sql/seed_crm_erp_test_scenarios.sql`
- Smoke check: `supabase/sql/smoke_check_crm_erp_post_migration.sql`
- UAT package: `supabase/sql/uat_crm_erp_business_flows.sql`
- Endpoint handler: `src/app/api/orders/[orderId]/confirm/route.ts`
