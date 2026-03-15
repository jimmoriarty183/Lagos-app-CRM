# SQL Prompt For AI Assistant

Use this prompt in your DB AI assistant exactly as written:

```text
Create backend support for per-business custom order statuses in Supabase Postgres.

Requirements:
1. Create a table `public.business_statuses`.
2. Columns:
   - `id uuid primary key default gen_random_uuid()`
   - `business_id uuid not null references public.businesses(id) on delete cascade`
   - `value text not null`
   - `label text not null`
   - `color text not null`
   - `sort_order integer not null default 0`
   - `created_by uuid null references auth.users(id) on delete set null`
   - `created_at timestamptz not null default now()`
3. Add a unique constraint on `(business_id, value)`.
4. Add a check constraint so `value = upper(value)` and `value <> 'OVERDUE'`.
5. Add a check constraint so `color` is one of:
   `slate`, `blue`, `amber`, `green`, `red`, `violet`, `pink`, `teal`.
6. Add an index on `(business_id, sort_order, created_at)`.
7. Enable row level security.
8. RLS policies:
   - `SELECT`: allow `OWNER` and `MANAGER` members of the same business.
   - `INSERT`: allow only `OWNER` members of the same business.
   - `UPDATE`: allow only `OWNER` members of the same business.
   - `DELETE`: allow only `OWNER` members of the same business.
9. Membership check must work with the existing `public.memberships` table, matching rows by `business_id`, `user_id = auth.uid()`, and `role`.
10. Roles should be matched case-insensitively for `OWNER` and `MANAGER`.
11. Return the final SQL only, with no explanation.
```
