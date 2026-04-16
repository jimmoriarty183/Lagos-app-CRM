-- ============================================
-- WEBHOOK REPLAY SCRIPT
-- ============================================
-- This script helps identify and replay failed/pending webhook events
-- after the billing fixes have been applied.

-- Step 1: Identify webhook events that failed and need replay
-- Run this query to see which events are stuck
select 
  id,
  provider,
  external_event_id,
  event_type,
  processing_status as current_status,
  error_message,
  retry_count,
  received_at,
  created_at,
  json_build_object(
    'event_id', external_event_id,
    'event_type', event_type,
    'retry_count', retry_count,
    'current_status', processing_status,
    'last_error', error_message,
    'received', received_at
  ) as event_summary
from public.billing_webhook_events
where processing_status in ('failed', 'pending')
order by received_at asc;

-- Step 2: After applying fixes, run the replay API
-- Note: This requires the API endpoint to be available
-- curl -X POST http://localhost:3000/api/billing/webhooks/replay \
--   -H "Content-Type: application/json" \
--   -d '{"event_ids": ["<event_id_1>", "<event_id_2>"], "limit": 10}'

-- Step 3: Reset processing status for manual replay (use with caution)
-- This should only be done after you're confident the underlying issue is fixed
-- Uncomment below if you want to reset failed events to pending for re-processing:
/*
update public.billing_webhook_events
set
  processing_status = 'pending',
  error_message = null,
  retry_count = 0,
  updated_at = now()
where processing_status = 'failed'
  and received_at >= now() - interval '7 days';
*/

-- Step 4: Verify replay success
-- Run this after replaying to check if events are now processed
select 
  processing_status,
  count(*) as event_count,
  max(updated_at) as last_updated
from public.billing_webhook_events
where received_at >= now() - interval '7 days'
group by processing_status
order by processing_status;

-- Step 5: Check for accounts that were affected but not yet resolved
-- These accounts should now show proper subscriptions
select 
  a.id as account_id,
  a.name,
  a.owner_user_id,
  case
    when s.id is not null then 'HAS_SUBSCRIPTION'
    else 'NO_SUBSCRIPTION'
  end as subscription_status,
  s.id as subscription_id,
  s.status as subscription_status_value,
  a.created_at as account_created_at,
  s.created_at as subscription_created_at
from public.accounts a
left join public.subscriptions s on s.account_id = a.id
  and s.id = (
    select id from public.subscriptions s2
    where s2.account_id = a.id
    order by s2.updated_at desc
    limit 1
  )
where a.created_at >= now() - interval '7 days'
  and s.id is null
order by a.created_at desc;
