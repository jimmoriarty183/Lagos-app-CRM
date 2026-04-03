-- Support views security audit (run in Supabase SQL Editor on the target cloud DB)
-- Scope:
--   public.v_support_requests_admin
--   public.v_support_requests_summary

-- 1) View definitions + security mode
select
  n.nspname as schema_name,
  c.relname as view_name,
  c.reloptions,
  pg_get_viewdef(c.oid, true) as view_sql
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v'
  and n.nspname = 'public'
  and c.relname in ('v_support_requests_admin', 'v_support_requests_summary')
order by c.relname;

-- 2) Direct privileges granted on views
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('v_support_requests_admin', 'v_support_requests_summary')
order by table_name, grantee, privilege_type;

-- 3) Underlying relation dependencies (to understand RLS interaction risk)
select
  v.relname as view_name,
  src_ns.nspname as source_schema,
  src.relname as source_relation,
  src.relkind as source_kind
from pg_rewrite rw
join pg_class v on v.oid = rw.ev_class
join pg_depend d on d.objid = rw.oid
join pg_class src on src.oid = d.refobjid
join pg_namespace src_ns on src_ns.oid = src.relnamespace
where v.relkind = 'v'
  and v.relname in ('v_support_requests_admin', 'v_support_requests_summary')
  and src_ns.nspname = 'public'
order by v.relname, src.relname;

-- 4) RLS status for underlying base tables (public only)
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    select distinct src.relname
    from pg_rewrite rw
    join pg_class v on v.oid = rw.ev_class
    join pg_depend d on d.objid = rw.oid
    join pg_class src on src.oid = d.refobjid
    join pg_namespace src_ns on src_ns.oid = src.relnamespace
    where v.relkind = 'v'
      and v.relname in ('v_support_requests_admin', 'v_support_requests_summary')
      and src_ns.nspname = 'public'
      and src.relkind = 'r'
  )
order by c.relname;

-- 5) Policies present on those base tables
select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    select distinct src.relname
    from pg_rewrite rw
    join pg_class v on v.oid = rw.ev_class
    join pg_depend d on d.objid = rw.oid
    join pg_class src on src.oid = d.refobjid
    join pg_namespace src_ns on src_ns.oid = src.relnamespace
    where v.relkind = 'v'
      and v.relname in ('v_support_requests_admin', 'v_support_requests_summary')
      and src_ns.nspname = 'public'
      and src.relkind = 'r'
  )
order by tablename, policyname;

-- 6) Optional safe remediation templates (apply only after review):
-- alter view public.v_support_requests_admin set (security_invoker = true);
-- alter view public.v_support_requests_summary set (security_invoker = true);
