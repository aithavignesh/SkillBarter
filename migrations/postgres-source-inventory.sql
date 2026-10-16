-- READ-ONLY source inventory for SkillBarter InsForge/PostgreSQL.
-- Run against a read-only connection or a disposable export. No data is changed.
-- Capture the output with the export timestamp and source environment identifier.
-- Confirm the source schema name/table list first; this file assumes schema "public".

BEGIN TRANSACTION READ ONLY;

-- 1) Tables and estimated row counts (planner estimates, not reconciliation counts).
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.reltuples::bigint AS estimated_rows,
  c.relrowsecurity AS row_level_security_enabled,
  c.relforcerowsecurity AS row_level_security_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- 2) Columns, types, nullability, defaults, and generated/identity information.
SELECT
  table_name, ordinal_position, column_name, data_type, udt_name,
  is_nullable, column_default, is_identity, identity_generation,
  is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3) Primary keys, unique constraints, foreign keys, and check constraints.
SELECT
  tc.table_name, tc.constraint_name, tc.constraint_type,
  kcu.column_name, ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  rc.update_rule, rc.delete_rule,
  chk.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_schema = kcu.constraint_schema
 AND tc.constraint_name = kcu.constraint_name
 AND tc.table_name = kcu.table_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_schema = ccu.constraint_schema
 AND tc.constraint_name = ccu.constraint_name
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_schema = rc.constraint_schema
 AND tc.constraint_name = rc.constraint_name
LEFT JOIN information_schema.check_constraints chk
  ON tc.constraint_schema = chk.constraint_schema
 AND tc.constraint_name = chk.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 4) Index definitions.
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5) RLS policies: policies and their roles, commands, USING and WITH CHECK expressions.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6) Triggers (excluding internal FK triggers).
SELECT
  event_object_table AS table_name, trigger_name, event_manipulation,
  action_timing, action_orientation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7) Exact row counts for the known application tables. If any table is missing,
-- edit this query to match the confirmed inventory before running it.
SELECT 'analytics_events' AS table_name, count(*)::bigint AS exact_rows FROM public.analytics_events
UNION ALL SELECT 'blocks', count(*)::bigint FROM public.blocks
UNION ALL SELECT 'connections', count(*)::bigint FROM public.connections
UNION ALL SELECT 'exchanges', count(*)::bigint FROM public.exchanges
UNION ALL SELECT 'messages', count(*)::bigint FROM public.messages
UNION ALL SELECT 'notifications', count(*)::bigint FROM public.notifications
UNION ALL SELECT 'posts', count(*)::bigint FROM public.posts
UNION ALL SELECT 'reports', count(*)::bigint FROM public.reports
UNION ALL SELECT 'reviews', count(*)::bigint FROM public.reviews
UNION ALL SELECT 'skills', count(*)::bigint FROM public.skills
UNION ALL SELECT 'user_skills', count(*)::bigint FROM public.user_skills
UNION ALL SELECT 'users', count(*)::bigint FROM public.users
ORDER BY table_name;

COMMIT;
