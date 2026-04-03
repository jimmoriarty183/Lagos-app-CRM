alter table if exists public.profiles
  add column if not exists phone text,
  add column if not exists birth_date date,
  add column if not exists bio text,
  add column if not exists avatar_url text;
