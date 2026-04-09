# CRM/ERP CI Integration Plan

## Recommended pipeline order

### PR pipeline (every pull request)

1. Checkout repository.
2. Install Node dependencies.
3. Run repository baseline checks:
   - `npm run check:conflicts`
   - `npm run lint`
4. Start ephemeral Postgres/Supabase-compatible database environment.
5. Apply all SQL migrations in order, including:
   - core approved migrations
   - corrective migration `20260409143000_add_missing_inventory_reservations_movements_event_log.sql`
   - transaction migration containing `confirm_order_tx`
6. Load seed/test scenarios:
   - `supabase/sql/seed_crm_erp_test_scenarios.sql`
7. Run smoke-check SQL:
   - `supabase/sql/smoke_check_crm_erp_post_migration.sql`
8. Run application build if required for PR gate:
   - `npm run build`

### Optional manual/UAT pipeline

1. Reuse the same migration stage.
2. Reuse the same seed stage.
3. Run smoke-check stage first.
4. Run UAT SQL package in a separate manual stage:
   - `supabase/sql/uat_crm_erp_business_flows.sql`
5. Publish SQL outputs and logs as workflow artifacts.

## Failure behavior

### Migrations stage

- Must fail immediately on the first SQL error.
- Downstream stages must not run if migrations fail.
- Pipeline result: failed.

### Seed/test scenarios stage

- Must fail immediately on any insert/update error.
- Downstream smoke-check must not run if seed load fails.
- Pipeline result: failed.

### Smoke-check stage

- Must be hard-gated on PRs.
- Any `RAISE EXCEPTION` from `smoke_check_crm_erp_post_migration.sql` must fail the job.
- Pipeline result: failed.

### UAT stage

- Should run only manually or on protected branch workflow dispatch.
- Failure should fail the UAT job, but should not block normal PR validation unless explicitly wired as required.

### Handler/build stage

- If the backend code compiles but the DB validation stages fail, the whole PR must still fail.
- DB truth must be treated as the blocking gate for this CRM/ERP flow.

## What should run on every PR

- `npm run check:conflicts`
- `npm run lint`
- Full migration chain
- `seed_crm_erp_test_scenarios.sql`
- `smoke_check_crm_erp_post_migration.sql`
- Optional: `npm run build` if this repository already treats build as a PR gate

## What should run manually or in a separate stage

- `uat_crm_erp_business_flows.sql`
- Any destructive or long-running exploratory SQL validation
- Any environment-specific deployment verification against staging

## Recommended GitHub Actions job split

### Job 1: `app_checks`

Purpose:

- fast feedback on repo integrity and TypeScript/Next.js code quality

Runs:

- checkout
- setup node
- `npm ci`
- `npm run check:conflicts`
- `npm run lint`
- optionally `npm run build`

### Job 2: `db_migrate_and_smoke`

Purpose:

- authoritative DB validation for approved CRM/ERP schema and flows

Runs:

- start Postgres service
- install Supabase CLI or use `psql` directly
- apply migrations in order
- run `seed_crm_erp_test_scenarios.sql`
- run `smoke_check_crm_erp_post_migration.sql`

Behavior:

- hard required check on every PR

### Job 3: `db_uat_flows`

Purpose:

- optional manual execution of broader business scenarios

Runs:

- same DB bootstrap as `db_migrate_and_smoke`
- apply migrations
- run seed SQL
- run smoke-check SQL first
- run `uat_crm_erp_business_flows.sql`

Behavior:

- triggered by `workflow_dispatch`
- optional on protected branches

## Example GitHub Actions structure

```yaml
name: crm-erp-ci

on:
  pull_request:
  workflow_dispatch:
    inputs:
      run_uat:
        description: Run CRM/ERP UAT SQL package
        required: false
        default: "false"

jobs:
  app_checks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Conflict markers
        run: npm run check:conflicts

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

  db_migrate_and_smoke:
    runs-on: ubuntu-latest
    needs: app_checks
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U postgres -d app"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10
    env:
      PGPASSWORD: postgres
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install psql client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client

      - name: Apply migrations
        shell: bash
        run: |
          set -euo pipefail
          for file in $(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | sort); do
            echo "Applying $file"
            psql -h localhost -U postgres -d app -v ON_ERROR_STOP=1 -f "$file"
          done

      - name: Load CRM/ERP seed scenarios
        run: psql -h localhost -U postgres -d app -v ON_ERROR_STOP=1 -f supabase/sql/seed_crm_erp_test_scenarios.sql

      - name: Run CRM/ERP smoke check
        run: psql -h localhost -U postgres -d app -v ON_ERROR_STOP=1 -f supabase/sql/smoke_check_crm_erp_post_migration.sql

  db_uat_flows:
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.run_uat == 'true'
    runs-on: ubuntu-latest
    needs: db_migrate_and_smoke
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U postgres -d app"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10
    env:
      PGPASSWORD: postgres
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install psql client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client

      - name: Apply migrations
        shell: bash
        run: |
          set -euo pipefail
          for file in $(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | sort); do
            psql -h localhost -U postgres -d app -v ON_ERROR_STOP=1 -f "$file"
          done

      - name: Load CRM/ERP seed scenarios
        run: psql -h localhost -U postgres -d app -v ON_ERROR_STOP=1 -f supabase/sql/seed_crm_erp_test_scenarios.sql

      - name: Run smoke check before UAT
        run: psql -h localhost -U postgres -d app -v ON_ERROR_STOP=1 -f supabase/sql/smoke_check_crm_erp_post_migration.sql

      - name: Run UAT SQL package
        run: psql -h localhost -U postgres -d app -v ON_ERROR_STOP=1 -f supabase/sql/uat_crm_erp_business_flows.sql
```

## Practical recommendation

- Make `db_migrate_and_smoke` a required PR status check.
- Keep `db_uat_flows` manual until the SQL package is stable enough for scheduled or release-branch execution.
- Treat smoke-check SQL as the minimum DB correctness gate for every schema-affecting PR.
