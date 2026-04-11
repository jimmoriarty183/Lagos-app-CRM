-- Ensure API roles can call helper functions used by defaults/triggers.

GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app
GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
