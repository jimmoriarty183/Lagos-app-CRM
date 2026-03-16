alter table public.orders
add column if not exists status_reason text;
