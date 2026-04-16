# 🔧 Billing Fix - Quick Start

**Problem:** After Paddle payment → "No active plan" shown in `/app/settings/billing`

**Fix Status:** ✅ Ready to deploy

---

## What Was Fixed

| Component              | Issue                              | Fix                                          |
| ---------------------- | ---------------------------------- | -------------------------------------------- |
| **Database**           | plan_prices.paddle_price_id = NULL | Migration adds correct Paddle IDs            |
| **Webhook**            | Insufficient error logging         | Added [billing-webhook] logging on all steps |
| **Account Resolution** | No fallback if custom_data missing | Added 4-tier resolution strategy             |

---

## Deployment (3 Steps)

### 1️⃣ Apply Database Migration

```sql
-- In Supabase SQL Editor (staging, then production)
-- Copy-paste content from:
supabase/migrations/20260416_fix_billing_paddle_price_ids.sql

-- Verify with:
select count(*) from public.plan_prices
where billing_interval = 'month' and is_active = true;
-- Expected: 4 rows (one per plan)

select count(*) from public.plan_prices
where paddle_price_id is null or paddle_price_id = '';
-- Expected: 0 rows
```

### 2️⃣ Merge & Deploy Code

```bash
git checkout -b fix/billing-webhook-logging
# Files changed: src/lib/billing/webhooks.ts
# Deploy normally to Vercel

# Wait for deployment complete
```

### 3️⃣ Verify Success (30 min post-deploy)

```sql
-- Run from docs/BILLING_VERIFICATION_QUERIES.sql
-- Check: webhook success rate, account subscription ratio
```

---

## Post-Deploy Monitoring

**Check every 10 minutes for first 30 min:**

```bash
# In Vercel logs, search for:
[billing-webhook] plan_price.not_found
# If found: migration didn't apply correctly

[billing-webhook] subscription.unresolvable
# If frequent: investigate webhook payload

[billing-webhook] processing_success
# Should see these for recent payments
```

---

## Rollback (If Needed)

- **Code:** Revert Vercel deployment (instant)
- **Database:** Migration is additive (can't rollback) but is safe to leave

---

## Key Files

| File                                                            | Purpose                       |
| --------------------------------------------------------------- | ----------------------------- |
| `supabase/migrations/20260416_fix_billing_paddle_price_ids.sql` | Database repair               |
| `src/lib/billing/webhooks.ts`                                   | Webhook processor enhancement |
| `docs/BILLING_FIX_PRODUCTION_GUIDE.md`                          | Full implementation guide     |
| `docs/BILLING_VERIFICATION_QUERIES.sql`                         | Verification queries          |
| `docs/WEBHOOK_REPLAY_QUERIES.sql`                               | Replay failed webhooks        |

---

## Paddle Price IDs (For Reference)

Used in migration (source of truth):

**Monthly:**

- solo: `pri_01kmncmgt9csnfq6hwvz6eg5m3`
- starter: `pri_01kmncq914c512x590mj142cm9`
- business: `pri_01kmncrvjyqb3y1rwf6w2zcpbq`
- pro: `pri_01kmncvk1ytkmj0tar1wxb8cw4`

**Yearly:**

- solo: `pri_01kn1ztvh3d8mf3c7msstc4yj4`
- starter: `pri_01kn1zrysbhmecpa8dmn3mjkwv`
- business: `pri_01kn1zq31rkhqbgxys3f1fgqgj`
- pro: `pri_01kn1zmv87cs2he9v7xy01xpns`

---

## Support

**Questions?** Check `docs/BILLING_FIX_PRODUCTION_GUIDE.md` for detailed explanation and troubleshooting.
