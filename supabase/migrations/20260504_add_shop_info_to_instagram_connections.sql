-- Per-merchant shop context that the AI prepends to its system prompt
-- so replies stay grounded in the merchant's own brand details.

alter table public.instagram_connections
  add column if not exists shop_name text,
  add column if not exists shop_about text,
  add column if not exists shop_address text,
  add column if not exists shop_contact text;
