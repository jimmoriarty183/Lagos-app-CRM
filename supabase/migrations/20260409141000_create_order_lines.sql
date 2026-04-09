-- supabase/migrations/20260409141000_create_order_lines.sql

CREATE TABLE IF NOT EXISTS public.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  parent_line_id uuid REFERENCES public.order_lines(id) ON DELETE RESTRICT,
  status public.order_line_status_enum NOT NULL DEFAULT 'DRAFT',
  line_type public.line_type_enum NOT NULL,
  source_type public.line_source_type_enum NOT NULL,
  catalog_product_id uuid REFERENCES public.catalog_products(id) ON DELETE RESTRICT,
  catalog_service_id uuid REFERENCES public.catalog_services(id) ON DELETE RESTRICT,
  offer_id uuid REFERENCES public.offers(id) ON DELETE RESTRICT,
  offer_component_id uuid REFERENCES public.offer_components(id) ON DELETE RESTRICT,
  is_custom boolean NOT NULL DEFAULT false,

  name_snapshot varchar(255) NOT NULL,
  description_snapshot text,
  uom_code varchar(20),
  qty numeric(18,4) NOT NULL,
  unit_price numeric(18,4) NOT NULL,
  discount_percent numeric(7,4) NOT NULL DEFAULT 0,
  discount_amount numeric(18,4) NOT NULL DEFAULT 0,
  tax_rate numeric(7,4) NOT NULL DEFAULT 0,
  tax_amount numeric(18,4) NOT NULL DEFAULT 0,
  line_net_amount numeric(18,4) NOT NULL,
  line_gross_amount numeric(18,4) NOT NULL,
  is_price_frozen boolean NOT NULL DEFAULT false,

  planned_service_start timestamptz,
  assignee_id uuid,
  sla_due_at timestamptz,

  reservation_required_qty numeric(18,4) NOT NULL DEFAULT 0,
  reserved_qty numeric(18,4) NOT NULL DEFAULT 0,
  fulfilled_qty numeric(18,4) NOT NULL DEFAULT 0,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,

  CONSTRAINT uq_order_lines_order_line_no UNIQUE (order_id, line_no),

  CONSTRAINT chk_order_lines_qty_positive
    CHECK (qty > 0),
  CONSTRAINT chk_order_lines_unit_price_non_negative
    CHECK (unit_price >= 0),
  CONSTRAINT chk_order_lines_discount_percent_range
    CHECK (discount_percent >= 0 AND discount_percent <= 1),
  CONSTRAINT chk_order_lines_discount_amount_non_negative
    CHECK (discount_amount >= 0),
  CONSTRAINT chk_order_lines_tax_rate_range
    CHECK (tax_rate >= 0 AND tax_rate <= 1),
  CONSTRAINT chk_order_lines_tax_amount_non_negative
    CHECK (tax_amount >= 0),
  CONSTRAINT chk_order_lines_amounts_non_negative
    CHECK (line_net_amount >= 0 AND line_gross_amount >= 0),
  CONSTRAINT chk_order_lines_amount_consistency
    CHECK (line_gross_amount = (line_net_amount + tax_amount)),
  CONSTRAINT chk_order_lines_net_consistency
    CHECK (line_net_amount = ((qty * unit_price) - discount_amount)),
  CONSTRAINT chk_order_lines_reservation_required_qty_non_negative
    CHECK (reservation_required_qty >= 0),
  CONSTRAINT chk_order_lines_reserved_qty_non_negative
    CHECK (reserved_qty >= 0),
  CONSTRAINT chk_order_lines_fulfilled_qty_non_negative
    CHECK (fulfilled_qty >= 0),
  CONSTRAINT chk_order_lines_reserved_le_required
    CHECK (reserved_qty <= reservation_required_qty),
  CONSTRAINT chk_order_lines_fulfilled_le_qty
    CHECK (fulfilled_qty <= qty),

  CONSTRAINT chk_order_lines_line_type_source_type
    CHECK (
      (line_type = 'PRODUCT' AND source_type IN ('CATALOG_PRODUCT', 'CUSTOM_PRODUCT', 'OFFER_COMPONENT')) OR
      (line_type = 'SERVICE' AND source_type IN ('CATALOG_SERVICE', 'CUSTOM_SERVICE', 'OFFER_COMPONENT')) OR
      (line_type = 'OFFER' AND source_type = 'OFFER_PARENT')
    ),

  CONSTRAINT chk_order_lines_catalog_refs_by_source
    CHECK (
      (source_type = 'CATALOG_PRODUCT' AND catalog_product_id IS NOT NULL AND catalog_service_id IS NULL AND offer_id IS NULL AND offer_component_id IS NULL) OR
      (source_type = 'CUSTOM_PRODUCT' AND catalog_product_id IS NULL AND catalog_service_id IS NULL AND offer_id IS NULL AND offer_component_id IS NULL) OR
      (source_type = 'CATALOG_SERVICE' AND catalog_service_id IS NOT NULL AND catalog_product_id IS NULL AND offer_id IS NULL AND offer_component_id IS NULL) OR
      (source_type = 'CUSTOM_SERVICE' AND catalog_service_id IS NULL AND catalog_product_id IS NULL AND offer_id IS NULL AND offer_component_id IS NULL) OR
      (source_type = 'OFFER_PARENT' AND offer_id IS NOT NULL AND catalog_product_id IS NULL AND catalog_service_id IS NULL AND offer_component_id IS NULL) OR
      (source_type = 'OFFER_COMPONENT' AND offer_component_id IS NOT NULL)
    ),

  CONSTRAINT chk_order_lines_custom_flag
    CHECK (
      (source_type IN ('CUSTOM_PRODUCT', 'CUSTOM_SERVICE') AND is_custom = true) OR
      (source_type NOT IN ('CUSTOM_PRODUCT', 'CUSTOM_SERVICE') AND is_custom = false)
    ),

  CONSTRAINT chk_order_lines_parent_for_offer_component
    CHECK (
      (source_type = 'OFFER_COMPONENT' AND parent_line_id IS NOT NULL) OR
      (source_type <> 'OFFER_COMPONENT')
    ),

  CONSTRAINT chk_order_lines_service_fields
    CHECK (
      (line_type = 'SERVICE') OR
      (line_type <> 'SERVICE' AND planned_service_start IS NULL AND assignee_id IS NULL AND sla_due_at IS NULL)
    ),

  CONSTRAINT chk_order_lines_product_reservation_fields
    CHECK (
      (line_type = 'PRODUCT' AND reservation_required_qty >= 0) OR
      (line_type <> 'PRODUCT' AND reservation_required_qty = 0 AND reserved_qty = 0)
    )
);

CREATE INDEX IF NOT EXISTS ix_order_lines_order
  ON public.order_lines (order_id);

CREATE INDEX IF NOT EXISTS ix_order_lines_order_status
  ON public.order_lines (order_id, status);

CREATE INDEX IF NOT EXISTS ix_order_lines_source_custom
  ON public.order_lines (source_type, is_custom);

CREATE INDEX IF NOT EXISTS ix_order_lines_parent
  ON public.order_lines (parent_line_id)
  WHERE parent_line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_order_lines_catalog_product
  ON public.order_lines (catalog_product_id)
  WHERE catalog_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_order_lines_catalog_service
  ON public.order_lines (catalog_service_id)
  WHERE catalog_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_order_lines_offer
  ON public.order_lines (offer_id)
  WHERE offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_order_lines_offer_component
  ON public.order_lines (offer_component_id)
  WHERE offer_component_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_order_lines_created_at
  ON public.order_lines (created_at DESC);

DROP TRIGGER IF EXISTS trg_order_lines_set_audit_fields ON public.order_lines;
CREATE TRIGGER trg_order_lines_set_audit_fields
BEFORE INSERT OR UPDATE ON public.order_lines
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();
