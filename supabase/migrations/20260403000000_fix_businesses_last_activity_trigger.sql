-- Hotfix: businesses table does not have business_id column.
-- Existing trigger touch_business_last_activity_on_businesses calls a function
-- that expects NEW.business_id and crashes inserts into public.businesses.
-- We only remove the trigger on public.businesses; other table triggers stay intact.

drop trigger if exists touch_business_last_activity_on_businesses on public.businesses;
