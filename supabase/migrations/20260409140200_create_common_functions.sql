-- supabase/migrations/20260409140200_create_common_functions.sql

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_actor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sub text;
BEGIN
  v_sub := current_setting('request.jwt.claim.sub', true);
  IF v_sub IS NOT NULL AND v_sub <> '' THEN
    BEGIN
      RETURN v_sub::uuid;
    EXCEPTION
      WHEN others THEN
        NULL;
    END;
  END IF;

  RETURN '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION app.set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := app.current_actor_id();

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    NEW.created_by := COALESCE(NEW.created_by, v_actor);
    NEW.updated_by := COALESCE(NEW.updated_by, v_actor);
    NEW.version := COALESCE(NEW.version, 1);
    RETURN NEW;
  END IF;

  NEW.created_at := OLD.created_at;
  NEW.created_by := OLD.created_by;
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(NEW.updated_by, v_actor);
  NEW.version := COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.apply_soft_delete_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := app.current_actor_id();

  IF NEW.is_deleted = true AND COALESCE(OLD.is_deleted, false) = false THEN
    NEW.deleted_at := COALESCE(NEW.deleted_at, now());
    NEW.deleted_by := COALESCE(NEW.deleted_by, v_actor);
  ELSIF NEW.is_deleted = false AND COALESCE(OLD.is_deleted, false) = true THEN
    NEW.deleted_at := NULL;
    NEW.deleted_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;
