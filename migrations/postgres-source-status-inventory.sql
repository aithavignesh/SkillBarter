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

SELECT 'reports.status', status::text, COUNT(*)::bigint
FROM public.reports
GROUP BY status

UNION ALL

SELECT 'posts.post_type', post_type::text, COUNT(*)::bigint
FROM public.posts
GROUP BY post_type

ORDER BY field, value NULLS FIRST;

COMMIT;
