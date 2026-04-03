create table if not exists public.sales_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  work_email text not null,
  company_name text not null,
  team_size text,
  current_tool text,
  main_goal text not null,
  timeline text,
  notes text,
  source text not null default 'pricing_contact_sales',
  status text not null default 'new',
  handled_by_user_id uuid references public.users(id) on delete set null,
  handled_at timestamptz
);

create index if not exists sales_requests_created_at_idx
  on public.sales_requests (created_at desc);

create index if not exists sales_requests_status_idx
  on public.sales_requests (status);

alter table public.sales_requests enable row level security;
