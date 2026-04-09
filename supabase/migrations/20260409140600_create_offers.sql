-- supabase/migrations/20260409140600_create_offers.sql

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code varchar(100) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  pricing_mode public.offer_pricing_mode_enum NOT NULL,
  fixed_price numeric(18,4),
  currency_code char(3) NOT NULL,
  status public.master_status_enum NOT NULL DEFAULT 'ACTIVE',
  valid_from date,
  valid_to date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT chk_offers_fixed_price_for_mode
    CHECK (
      (pricing_mode = 'FIXED_PRICE' AND fixed_price IS NOT NULL AND fixed_price >= 0) OR
      (pricing_mode = 'SUM_COMPONENTS' AND fixed_price IS NULL)
    ),
  CONSTRAINT chk_offers_currency_code_upper
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_offers_validity_range
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CONSTRAINT chk_offers_deleted_state
    CHECK (
      (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
      (is_deleted = true AND deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_offer_code_active
  ON public.offers (offer_code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_offers_status_active
  ON public.offers (status, is_deleted);

CREATE INDEX IF NOT EXISTS ix_offers_validity
  ON public.offers (valid_from, valid_to)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_offers_created_at
  ON public.offers (created_at DESC);

DROP TRIGGER IF EXISTS trg_offers_set_audit_fields ON public.offers;
CREATE TRIGGER trg_offers_set_audit_fields
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();

DROP TRIGGER IF EXISTS trg_offers_apply_soft_delete_fields ON public.offers;
CREATE TRIGGER trg_offers_apply_soft_delete_fields
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION app.apply_soft_delete_fields();
