-- Expand client billing currency support to include GBP.

alter table if exists public.client_billing_profiles
  alter column currency_code set default 'GBP';

alter table if exists public.client_billing_profiles
  drop constraint if exists client_billing_profiles_currency_check;

alter table if exists public.client_billing_profiles
  add constraint client_billing_profiles_currency_check
  check (currency_code in ('GBP', 'UAH', 'EUR', 'USD'));
