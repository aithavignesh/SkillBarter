-- Read-only PostgreSQL catalog snapshot for migration review.
-- Run only with an approved read-only account against a non-production source first.
-- This captures catalog metadata; it does NOT capture row data or prove data-level compatibility.
BEGIN TRANSACTION READ ONLY;

-- 0. Capture minimal provenance in the private output (sanitize before sharing).
SELECT current_database() AS database_name,
       current_schema() AS current_schema,
       current_setting('server_version') AS server_version,
       transaction_timestamp() AS snapshot_transaction_started_at;
-- 1. Tables and views in the application schema.
SELECT n.nspname AS schema_name,
       c.relname AS object_name,
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'p' THEN 'partitioned_table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized_view'
         WHEN 'f' THEN 'foreign_table'
         ELSE c.relkind::text
       END AS object_type,
       c.reltuples::bigint AS estimated_row_count,
       c.relrowsecurity AS row_level_security_enabled,
       c.relforcerowsecurity AS row_level_security_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY n.nspname, c.relname;

-- 2. Columns, types, nullability, defaults, and identity/generated metadata.
SELECT table_schema,
       table_name,
       ordinal_position,
       column_name,
       data_type,
       udt_schema,
       udt_name,
       is_nullable,
       column_default,
       is_identity,
       identity_generation,
       is_generated,
       generation_expression,
       character_maximum_length,
       numeric_precision,
       numeric_scale,
       datetime_precision
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_schema, table_name, ordinal_position;

-- 3. Primary keys, unique/check constraints, and foreign-key definitions.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       con.conname AS constraint_name,
       CASE con.contype
         WHEN 'p' THEN 'primary_key'
         WHEN 'u' THEN 'unique'
         WHEN 'f' THEN 'foreign_key'
         WHEN 'c' THEN 'check'
         WHEN 'x' THEN 'exclusion'
         ELSE con.contype::text
       END AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition,
       rn.nspname AS referenced_schema,
       rc.relname AS referenced_table,
       con.convalidated AS validated
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_class rc ON rc.oid = con.confrelid
LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, con.conname;

-- 4. Index definitions, including partial/unique indexes.
SELECT schemaname AS schema_name,
       tablename AS table_name,
       indexname AS index_name,
       indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. RLS policies and triggers that may affect inserts or updates.
SELECT schemaname AS schema_name,
       tablename AS table_name,
       policyname AS object_name,
       'row_level_security_policy' AS object_type,
       permissive,
       roles::text AS roles,
       cmd AS operation,
       qual AS using_expression,
       with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT event_object_schema AS schema_name,
       event_object_table AS table_name,
       trigger_name AS object_name,
       action_timing,
       event_manipulation,
       action_orientation,
       action_condition,
       action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name, event_manipulation;

COMMIT;
