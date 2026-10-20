-- Read-only inventory of observed enum-like values before migration mapping approval.
-- Run against the source PostgreSQL database; this query does not modify source data.
BEGIN TRANSACTION READ ONLY;

-- 0) Capture source provenance in the private output; sanitize before sharing.
SELECT current_database() AS database_name,
       current_schema() AS current_schema,
       current_setting('server_version') AS server_version,
       current_user AS effective_role,
       session_user AS session_role,
       transaction_timestamp() AS inventory_transaction_started_at;

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

SELECT 'notifications.created_at_utc_range',
       'min=' || COALESCE(to_char(MIN(created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.US'), 'NONE')
         || ',max=' || COALESCE(to_char(MAX(created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.US'), 'NONE') AS value,
       COUNT(created_at)::bigint
FROM public.notifications

UNION ALL

SELECT 'reports.status', status::text, COUNT(*)::bigint
FROM public.reports
GROUP BY status

UNION ALL

SELECT 'posts.post_type', post_type::text, COUNT(*)::bigint
FROM public.posts
GROUP BY post_type

UNION ALL

SELECT 'users.email_normalized_duplicate_groups', 'duplicate_groups', COUNT(*)::bigint
FROM (
  SELECT lower(btrim(email)) AS normalized_value
  FROM public.users
  WHERE email IS NOT NULL AND btrim(email) <> ''
  GROUP BY lower(btrim(email))
  HAVING COUNT(*) > 1
) AS duplicate_emails

UNION ALL

SELECT 'users.username_normalized_duplicate_groups', 'duplicate_groups', COUNT(*)::bigint
FROM (
  SELECT lower(btrim(username)) AS normalized_value
  FROM public.users
  WHERE username IS NOT NULL AND btrim(username) <> ''
  GROUP BY lower(btrim(username))
  HAVING COUNT(*) > 1
) AS duplicate_usernames

UNION ALL

SELECT 'users.phone_trimmed_duplicate_groups', 'duplicate_groups', COUNT(*)::bigint
FROM (
  SELECT btrim(phone) AS normalized_value
  FROM public.users
  WHERE phone IS NOT NULL AND btrim(phone) <> ''
  GROUP BY btrim(phone)
  HAVING COUNT(*) > 1
) AS duplicate_phones

UNION ALL

SELECT 'users.phone_nullness', (phone IS NULL)::text, COUNT(*)::bigint
FROM public.users
GROUP BY 2

UNION ALL

SELECT 'users.email_nullness', (email IS NULL)::text, COUNT(*)::bigint
FROM public.users
GROUP BY 2

UNION ALL

SELECT 'users.email_blankness', (email IS NOT NULL AND btrim(email) = '')::text, COUNT(*)::bigint
FROM public.users
GROUP BY 2

UNION ALL

SELECT 'users.username_nullness', (username IS NULL)::text, COUNT(*)::bigint
FROM public.users
GROUP BY 2

UNION ALL

SELECT 'users.username_blankness', (username IS NOT NULL AND btrim(username) = '')::text, COUNT(*)::bigint
FROM public.users
GROUP BY 2

UNION ALL

SELECT 'users.password_hash_nullness', (password_hash IS NULL)::text, COUNT(*)::bigint
FROM public.users
GROUP BY 2

UNION ALL

SELECT 'users.full_name_nullness', (full_name IS NULL)::text, COUNT(*)::bigint
FROM public.users
GROUP BY 2

UNION ALL

SELECT 'users.full_name_over_100', (char_length(full_name) > 100)::text, COUNT(*)::bigint
FROM public.users
WHERE full_name IS NOT NULL
GROUP BY 2

UNION ALL

SELECT 'skills.name_over_80', (char_length(name) > 80)::text, COUNT(*)::bigint
FROM public.skills
WHERE name IS NOT NULL
GROUP BY 2

UNION ALL

SELECT 'skills.category_over_80', (char_length(category) > 80)::text, COUNT(*)::bigint
FROM public.skills
WHERE category IS NOT NULL
GROUP BY 2

UNION ALL

SELECT 'messages.content_over_5000', (char_length(content) > 5000)::text, COUNT(*)::bigint
FROM public.messages
WHERE content IS NOT NULL
GROUP BY 2

UNION ALL

SELECT 'reviews.comment_over_2000', (char_length(comment) > 2000)::text, COUNT(*)::bigint
FROM public.reviews
WHERE comment IS NOT NULL
GROUP BY 2

UNION ALL

SELECT 'posts.content_over_5000', (char_length(content) > 5000)::text, COUNT(*)::bigint
FROM public.posts
WHERE content IS NOT NULL
GROUP BY 2

ORDER BY field, value NULLS FIRST;

COMMIT;
