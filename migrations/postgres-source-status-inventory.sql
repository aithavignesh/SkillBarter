-- Read-only inventory of observed enum-like values before migration mapping approval.
-- Run against the source PostgreSQL database; this query does not modify source data.
BEGIN TRANSACTION READ ONLY;

SELECT 'connections.status' AS field, status::text AS value, COUNT(*)::bigint AS row_count
FROM public.connections
GROUP BY status

UNION ALL

SELECT 'exchanges.status', status::text, COUNT(*)::bigint
FROM public.exchanges
GROUP BY status

UNION ALL

SELECT 'user_skills.skill_type', skill_type::text, COUNT(*)::bigint
FROM public.user_skills
GROUP BY skill_type

UNION ALL

SELECT 'notifications.type', type::text, COUNT(*)::bigint
FROM public.notifications
GROUP BY type

UNION ALL

SELECT 'notifications.is_read', is_read::text, COUNT(*)::bigint
FROM public.notifications
GROUP BY is_read

UNION ALL

SELECT 'notifications.link_format',
       CASE
         WHEN link IS NULL THEN 'NULL'
         WHEN btrim(link) = '' THEN 'EMPTY'
         WHEN link ~* '^https?://' THEN 'ABSOLUTE_URL'
         WHEN left(btrim(link), 1) = '/' THEN 'RELATIVE_PATH'
         ELSE 'OTHER'
       END AS value,
       COUNT(*)::bigint
FROM public.notifications
GROUP BY 2

UNION ALL

SELECT 'notifications.title_over_160', (char_length(title) > 160)::text, COUNT(*)::bigint
FROM public.notifications
GROUP BY 2

UNION ALL

SELECT 'notifications.message_over_1000', (char_length(message) > 1000)::text, COUNT(*)::bigint
FROM public.notifications
GROUP BY 2

UNION ALL

SELECT 'notifications.link_over_255', (char_length(link) > 255)::text, COUNT(*)::bigint
FROM public.notifications
GROUP BY 2

UNION ALL

SELECT 'notifications.created_at_nullness', (created_at IS NULL)::text, COUNT(*)::bigint
FROM public.notifications
GROUP BY 2

UNION ALL

SELECT 'notifications.created_at_utc_month',
       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS value,
       COUNT(*)::bigint
FROM public.notifications
WHERE created_at IS NOT NULL
GROUP BY 2

UNION ALL

SELECT 'reports.status', status::text, COUNT(*)::bigint
FROM public.reports
GROUP BY status

UNION ALL

SELECT 'posts.post_type', post_type::text, COUNT(*)::bigint
FROM public.posts
GROUP BY post_type

ORDER BY field, value NULLS FIRST;

COMMIT;
