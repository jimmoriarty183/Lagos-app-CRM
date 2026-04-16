-- ============================================
-- BILLING SYSTEM VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify that the billing system is correctly set up
-- and that recent webhook events have been properly materialized.

-- ============================================
-- 1. PLANS VERIFICATION
-- ============================================
-- Expected: 4 active plans (solo, starter, business, pro)
select 
  id,
  code,
  name,
  is_active,
  created_at,
  updated_at
from public.plans
where code in ('solo', 'starter', 'business', 'pro')
order by code;

-- ============================================
-- 2. PLAN PRICES VERIFICATION
-- ============================================
-- Expected: 8 active plan_prices (4 plans × 2 intervals: month + year)
-- All should have paddle_price_id populated
select 
  pp.id,
  p.code as plan_code,
  pp.billing_interval,
  pp.currency_code,
  pp.unit_amount_cents,
  pp.paddle_price_id,
  pp.is_active,
  pp.created_at,
  pp.updated_at
from public.plan_prices pp
join public.plans p on p.id = pp.plan_id
where p.code in ('solo', 'starter', 'business', 'pro')
  and pp.is_active = true
order by p.code, pp.billing_interval;

-- ============================================
-- 3. ACCOUNTS VERIFICATION
-- ============================================
-- Expected: Should see accounts that have been created/activated
-- Filter by creation date in last 30 days
select 
  id,
  name,
  owner_user_id,
  created_at,
  updated_at
from public.accounts
where created_at >= now() - interval '30 days'
order by created_at desc
limit 20;

-- ============================================
-- 4. SUBSCRIPTIONS VERIFICATION
-- ============================================
-- Expected: Recent subscriptions with active status
-- Check if subscriptions are properly linked to accounts and plan_prices
select 
  s.id,
  s.account_id,
  p.code as plan_code,
  pp.billing_interval,
  s.status,
  s.source,
  s.external_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.trial_start,
  s.trial_end,
  s.created_at,
  s.updated_at
from public.subscriptions s
join public.plan_prices pp on pp.id = s.plan_price_id
join public.plans p on p.id = pp.plan_id
where s.created_at >= now() - interval '30 days'
order by s.created_at desc
limit 20;

-- ============================================
-- 5. BILLING WEBHOOK EVENTS VERIFICATION
-- ============================================
-- Expected: Recent events with status "processed"
-- Check for any "failed" events that need replay
select 
  id,
  provider,
  external_event_id,
  event_type,
  processing_status,
  error_message,
  retry_count,
  related_account_id,
  related_subscription_id,
  received_at,
  processed_at,
  created_at
from public.billing_webhook_events
where received_at >= now() - interval '30 days'
order by received_at desc
limit 20;

-- ============================================
-- 6. FAILED EVENTS THAT NEED REPLAY
-- ============================================
-- These events should be replayed via API or admin function
select 
  id,
  provider,
  external_event_id,
  event_type,
  processing_status,
  error_message,
  retry_count,
  received_at,
  created_at
from public.billing_webhook_events
where processing_status in ('failed', 'pending')
order by received_at asc;

-- ============================================
-- 7. ACCOUNT BILLING STATUS CHECK
-- ============================================
-- For each recent account, show current subscription status
-- This mimics what the UI shows on /app/settings/billing
select 
  a.id as account_id,
  a.name,
  a.owner_user_id,
  p.code as current_plan_code,
  p.name as current_plan_name,
  pp.billing_interval,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.trial_start,
  s.trial_end,
  s.cancel_at_period_end,
  s.created_at as subscription_created_at
from public.accounts a
left join public.subscriptions s on s.account_id = a.id 
  and s.id = (
    select id from public.subscriptions s2
    where s2.account_id = a.id
    order by s2.updated_at desc
    limit 1
  )
left join public.plan_prices pp on pp.id = s.plan_price_id
left join public.plans p on p.id = pp.plan_id
where a.created_at >= now() - interval '30 days'
order by a.created_at desc
limit 20;

-- ============================================
-- 8. PADDLE MIRROR TABLES VERIFICATION
-- ============================================
-- Check paddle_customers synchronization
select 
  id,
  account_id,
  paddle_customer_id,
  email,
  status,
  created_at,
  updated_at
from public.paddle_customers
where updated_at >= now() - interval '30 days'
order by updated_at desc
limit 10;

-- Check paddle_subscriptions synchronization
select 
  id,
  subscription_id,
  paddle_subscription_id,
  paddle_customer_id,
  paddle_price_id,
  status,
  next_billed_at,
  created_at,
  updated_at
from public.paddle_subscriptions
where updated_at >= now() - interval '30 days'
order by updated_at desc
limit 10;

-- ============================================
-- 9. DATA INTEGRITY CHECK
-- ============================================
-- Check for orphaned subscriptions (no plan_price_id or invalid reference)
select 
  s.id,
  s.account_id,
  s.plan_price_id,
  s.status,
  s.created_at
from public.subscriptions s
left join public.plan_prices pp on pp.id = s.plan_price_id
where pp.id is null
  and s.created_at >= now() - interval '30 days'
order by s.created_at desc;

-- Check for plan_prices without valid plan_id
select 
  pp.id,
  pp.plan_id,
  pp.billing_interval,
  pp.paddle_price_id,
  pp.is_active,
  pp.created_at
from public.plan_prices pp
left join public.plans p on p.id = pp.plan_id
where p.id is null
order by pp.created_at desc;

-- ============================================
-- 10. SUMMARY METRICS (last 24 hours)
-- ============================================
with metrics as (
  select
    (select count(*) from public.accounts where created_at >= now() - interval '24 hours') as accounts_created_24h,
    (select count(*) from public.subscriptions where created_at >= now() - interval '24 hours') as subscriptions_created_24h,
    (select count(*) from public.billing_webhook_events where received_at >= now() - interval '24 hours') as webhook_events_24h,
    (select count(*) from public.billing_webhook_events where received_at >= now() - interval '24 hours' and processing_status = 'processed') as webhook_processed_24h,
    (select count(*) from public.billing_webhook_events where received_at >= now() - interval '24 hours' and processing_status = 'failed') as webhook_failed_24h
)
select
  accounts_created_24h,
  subscriptions_created_24h,
  webhook_events_24h,
  webhook_processed_24h,
  webhook_failed_24h
from metrics;
