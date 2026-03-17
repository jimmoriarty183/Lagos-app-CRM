alter table public.businesses
add column if not exists last_activity_at timestamptz;

update public.businesses b
set last_activity_at = activity.last_activity_at
from (
  select
    b0.id,
    greatest(
      b0.updated_at,
      coalesce(order_stats.last_order_at, b0.updated_at),
      coalesce(invite_stats.last_invite_at, b0.updated_at),
      coalesce(event_stats.last_event_at, b0.updated_at)
    ) as last_activity_at
  from public.businesses b0
  left join (
    select business_id, max(greatest(created_at, coalesce(updated_at, created_at))) as last_order_at
    from public.orders
    group by business_id
  ) order_stats on order_stats.business_id = b0.id
  left join (
    select business_id, max(greatest(created_at, coalesce(accepted_at, created_at), coalesce(revoked_at, created_at))) as last_invite_at
    from public.business_invites
    group by business_id
  ) invite_stats on invite_stats.business_id = b0.id
  left join (
    select business_id, max(created_at) as last_event_at
    from public.activity_events
    group by business_id
  ) event_stats on event_stats.business_id = b0.id
) activity
where b.id = activity.id
  and (b.last_activity_at is null or b.last_activity_at <> activity.last_activity_at);

create or replace function public.touch_business_last_activity()
returns trigger
language plpgsql
as $$
declare
  target_business_id uuid;
begin
  target_business_id := coalesce(new.business_id, old.business_id);

  if tg_table_name = 'businesses' then
    target_business_id := coalesce(new.id, old.id);
  end if;

  if target_business_id is not null then
    update public.businesses
    set last_activity_at = now()
    where id = target_business_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists touch_business_last_activity_on_orders on public.orders;
create trigger touch_business_last_activity_on_orders
after insert or update on public.orders
for each row execute function public.touch_business_last_activity();

drop trigger if exists touch_business_last_activity_on_business_invites on public.business_invites;
create trigger touch_business_last_activity_on_business_invites
after insert or update on public.business_invites
for each row execute function public.touch_business_last_activity();

drop trigger if exists touch_business_last_activity_on_memberships on public.memberships;
create trigger touch_business_last_activity_on_memberships
after insert or update on public.memberships
for each row execute function public.touch_business_last_activity();

drop trigger if exists touch_business_last_activity_on_activity_events on public.activity_events;
create trigger touch_business_last_activity_on_activity_events
after insert or update on public.activity_events
for each row execute function public.touch_business_last_activity();

drop trigger if exists touch_business_last_activity_on_businesses on public.businesses;
create trigger touch_business_last_activity_on_businesses
after insert or update of updated_at on public.businesses
for each row execute function public.touch_business_last_activity();

create index if not exists businesses_last_activity_at_idx
  on public.businesses (last_activity_at desc nulls last);
