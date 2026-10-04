-- Add durable comments for community feed posts.
create table if not exists public.post_comments (
  id bigserial primary key,
  post_id integer not null references public.posts(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_content_length check (char_length(trim(content)) between 1 and 1000)
);

create index if not exists idx_post_comments_post_id_created_at
  on public.post_comments(post_id, created_at);

create index if not exists idx_post_comments_user_id
  on public.post_comments(user_id);

alter table public.post_comments enable row level security;

drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select"
  on public.post_comments
  for select
  using (true);

drop policy if exists "post_comments_insert" on public.post_comments;
create policy "post_comments_insert"
  on public.post_comments
  for insert
  with check (user_id = public.requesting_user_id());

drop policy if exists "post_comments_delete" on public.post_comments;
create policy "post_comments_delete"
  on public.post_comments
  for delete
  using (user_id = public.requesting_user_id());
