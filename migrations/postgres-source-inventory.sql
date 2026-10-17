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
-- Use pg_constraint so foreign-key target columns are joined by column ordinal,
-- not by assuming the referenced table is the same as the source table.
SELECT
  source_ns.nspname AS schema_name,
  source_table.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE con.contype::text
  END AS constraint_type,
  source_column.attname AS column_name,
  target_ns.nspname AS referenced_schema,
  target_table.relname AS referenced_table,
  target_column.attname AS referenced_column,
  pg_get_constraintdef(con.oid, true) AS constraint_definition
FROM pg_constraint con
JOIN pg_class source_table ON source_table.oid = con.conrelid
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
LEFT JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS source_key(attnum, ord) ON true
LEFT JOIN pg_attribute source_column
  ON source_column.attrelid = source_table.oid
 AND source_column.attnum = source_key.attnum
LEFT JOIN pg_class target_table ON target_table.oid = con.confrelid
LEFT JOIN pg_namespace target_ns ON target_ns.oid = target_table.relnamespace
LEFT JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS target_key(attnum, ord)
  ON target_key.ord = source_key.ord
LEFT JOIN pg_attribute target_column
  ON target_column.attrelid = target_table.oid
 AND target_column.attnum = target_key.attnum
WHERE source_ns.nspname = 'public'
  AND con.contype IN ('p', 'u', 'f', 'c', 'x')
ORDER BY source_table.relname, con.conname, source_key.ord;

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
