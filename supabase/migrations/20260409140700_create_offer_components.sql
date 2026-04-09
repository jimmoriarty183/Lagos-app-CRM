-- supabase/migrations/20260409140700_create_offer_components.sql

CREATE TABLE IF NOT EXISTS public.offer_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
  component_type public.offer_component_type_enum NOT NULL,
  catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE RESTRICT,
  catalog_service_id uuid REFERENCES public.catalog_services(id) ON DELETE RESTRICT,
  component_name_snapshot varchar(255) NOT NULL,
  qty numeric(18,4) NOT NULL,
  sort_order integer NOT NULL DEFAULT 1,
  price_allocation_ratio numeric(9,6),
  is_optional boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT chk_offer_components_single_catalog_ref
    CHECK (
      (component_type = 'PRODUCT' AND catalog_product_id IS NOT NULL AND catalog_service_id IS NULL) OR
      (component_type = 'SERVICE' AND catalog_service_id IS NOT NULL AND catalog_product_id IS NULL)
    ),
  CONSTRAINT chk_offer_components_qty_positive
    CHECK (qty > 0),
  CONSTRAINT chk_offer_components_sort_order_positive
    CHECK (sort_order > 0),
  CONSTRAINT chk_offer_components_price_allocation_ratio_range
    CHECK (price_allocation_ratio IS NULL OR (price_allocation_ratio >= 0 AND price_allocation_ratio <= 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_components_offer_sort
  ON public.offer_components (offer_id, sort_order);

CREATE INDEX IF NOT EXISTS ix_offer_components_offer
  ON public.offer_components (offer_id);

CREATE INDEX IF NOT EXISTS ix_offer_components_component_product
  ON public.offer_components (component_type, catalog_product_id)
  WHERE catalog_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_offer_components_component_service
  ON public.offer_components (component_type, catalog_service_id)
  WHERE catalog_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_offer_components_optional
  ON public.offer_components (offer_id, is_optional);

DROP TRIGGER IF EXISTS trg_offer_components_set_audit_fields ON public.offer_components;
CREATE TRIGGER trg_offer_components_set_audit_fields
BEFORE INSERT OR UPDATE ON public.offer_components
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();
