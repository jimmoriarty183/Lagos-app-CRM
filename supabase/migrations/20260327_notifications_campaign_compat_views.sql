-- Compatibility read-models for inbox APIs against legacy/alternate schemas.

create or replace view public.notifications_compat as
select
  n.id,
  n.actor_id as actor_user_id,
  n.recipient_id as recipient_user_id,
  n.type,
  n.entity as entity_type,
  n.entity_id,
  null::uuid as order_id,
  n.metadata,
  (n.read_at is not null) as is_read,
  n.read_at,
  n.created_at
from public.notifications n;

create or replace view public.campaign_notifications_feed as
select
  concat('campaign:', ucs.campaign_id::text) as id,
  ucs.user_id as recipient_user_id,
  case
    when c.type::text = 'survey' then 'campaign_survey'
    else 'campaign_announcement'
  end as type,
  'campaign'::text as entity_type,
  c.id::text as entity_id,
  null::uuid as order_id,
  jsonb_build_object(
    'campaign_id', c.id,
    'campaign_type', c.type,
    'title', c.title
  ) as metadata,
  (ucs.read_at is not null) as is_read,
  ucs.read_at,
  coalesce(ucs.updated_at, ucs.created_at) as created_at
from public.user_campaign_states ucs
join public.campaigns c on c.id = ucs.campaign_id;
