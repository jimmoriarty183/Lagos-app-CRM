-- Phase 5A: Swap display labels of plans for Pro <-> Business positioning.
--
-- Plan `code` values stay the same (stability for Paddle price mapping & code
-- that keys off code). Only `name` — the user-facing label — is updated.
--
--   code='solo'     -> name='Solo'
--   code='starter'  -> name='Starter'
--   code='business' -> name='Pro'       (was 'BUSINESS' — now middle-high)
--   code='pro'      -> name='Business'  (was 'PRO'      — now top tier)
--
-- Idempotent & safe to rerun.

update public.plans set name = 'Solo',     updated_at = now() where code = 'solo'     and name <> 'Solo';
update public.plans set name = 'Starter',  updated_at = now() where code = 'starter'  and name <> 'Starter';
update public.plans set name = 'Pro',      updated_at = now() where code = 'business' and name <> 'Pro';
update public.plans set name = 'Business', updated_at = now() where code = 'pro'      and name <> 'Business';
