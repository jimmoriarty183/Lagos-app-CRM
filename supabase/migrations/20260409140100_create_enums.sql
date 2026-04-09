-- supabase/migrations/20260409140100_create_enums.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'customer_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.customer_type_enum AS ENUM ('PERSON', 'COMPANY');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'master_status_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.master_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'offer_pricing_mode_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.offer_pricing_mode_enum AS ENUM ('FIXED_PRICE', 'SUM_COMPONENTS');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'offer_component_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.offer_component_type_enum AS ENUM ('PRODUCT', 'SERVICE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'line_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.line_type_enum AS ENUM ('PRODUCT', 'SERVICE', 'OFFER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'line_source_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.line_source_type_enum AS ENUM (
      'CATALOG_PRODUCT',
      'CATALOG_SERVICE',
      'CUSTOM_PRODUCT',
      'CUSTOM_SERVICE',
      'OFFER_PARENT',
      'OFFER_COMPONENT'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_status_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_status_enum AS ENUM (
      'DRAFT',
      'READY_FOR_CONFIRMATION',
      'CONFIRMED',
      'PARTIALLY_FULFILLED',
      'FULFILLED',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_line_status_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_line_status_enum AS ENUM (
      'DRAFT',
      'CONFIRMED',
      'RESERVED',
      'IN_SERVICE',
      'FULFILLED',
      'CANCELLED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'service_request_status_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.service_request_status_enum AS ENUM (
      'NEW',
      'PLANNED',
      'ASSIGNED',
      'IN_PROGRESS',
      'DONE',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'service_request_priority_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.service_request_priority_enum AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inventory_reservation_status_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inventory_reservation_status_enum AS ENUM (
      'ACTIVE',
      'PARTIALLY_RELEASED',
      'RELEASED',
      'CONSUMED',
      'CANCELLED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inventory_movement_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inventory_movement_type_enum AS ENUM (
      'INBOUND',
      'OUTBOUND',
      'RESERVE',
      'UNRESERVE',
      'ADJUSTMENT'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inventory_movement_status_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inventory_movement_status_enum AS ENUM ('POSTED', 'VOIDED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_line_link_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_line_link_type_enum AS ENUM (
      'EXPANDED_FROM_OFFER',
      'GENERATED_SERVICE_REQUEST',
      'GENERATED_RESERVATION',
      'GENERATED_SHIPMENT'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'audit_operation_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.audit_operation_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');
  END IF;
END
$$;
