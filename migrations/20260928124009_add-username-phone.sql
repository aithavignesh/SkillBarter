-- SkillBarter profile identity migration
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username VARCHAR(30),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

UPDATE public.users
SET phone = '+' || substring(email FROM '^([0-9]{10,15})@phone\\.skillbarter\\.(com|local)$')
WHERE phone IS NULL
  AND email ~ '^[0-9]{10,15}@phone\\.skillbarter\\.(com|local)$';

UPDATE public.users
SET username = lower(regexp_replace(split_part(trim(full_name), ' ', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || id
WHERE username IS NULL OR trim(username) = '';

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
  ON public.users (lower(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx
  ON public.users (phone)
  WHERE phone IS NOT NULL;

ALTER TABLE public.users
  ADD CONSTRAINT users_username_format_chk
  CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,30}$');
