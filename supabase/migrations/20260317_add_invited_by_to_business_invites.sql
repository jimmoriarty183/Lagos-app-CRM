alter table public.business_invites
add column if not exists invited_by uuid references auth.users(id) on delete set null;
create index if not exists business_invites_invited_by_idx
  on public.business_invites (invited_by);
