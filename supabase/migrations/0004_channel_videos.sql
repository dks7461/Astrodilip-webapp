-- =====================================================================
-- channel_videos: admin-curated YouTube videos shown on the public Videos
-- page. Public-read/admin-write, same pattern as `courses`.
-- =====================================================================

create table if not exists public.channel_videos (
  id           uuid primary key default gen_random_uuid(),
  youtube_id   text not null,     -- the 11-char YouTube video ID
  url          text not null,     -- original URL pasted by the admin
  title        text,
  created_at   timestamptz not null default now()
);
create index if not exists channel_videos_created_idx on public.channel_videos (created_at desc);

alter table public.channel_videos enable row level security;

drop policy if exists cv_read on public.channel_videos;
create policy cv_read on public.channel_videos
  for select using (true);

drop policy if exists cv_admin on public.channel_videos;
create policy cv_admin on public.channel_videos
  for all using (public.is_admin()) with check (public.is_admin());
