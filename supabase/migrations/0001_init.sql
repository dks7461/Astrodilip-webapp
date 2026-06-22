-- =====================================================================
-- Astro Dilip Sharma — initial Supabase schema
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Idempotent-ish: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- =====================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('client','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pending','confirmed','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','paid','refunded','waived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('pending','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('pending','active','completed','cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles (mirrors auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  birth_date  text,
  birth_time  text,
  birth_place text,
  role        user_role not null default 'client',
  created_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);
-- Phone doubles as an alternate login identifier, so it must be unique when set.
create unique index if not exists profiles_phone_uniq on public.profiles (phone) where phone is not null;

-- ---------------------------------------------------------------------
-- consultation_types (display/config; Cal.com owns scheduling)
-- ---------------------------------------------------------------------
create table if not exists public.consultation_types (
  id             text primary key,            -- 'chat' | 'audio' | 'video'
  title          text not null,
  description    text,
  cal_event_slug text,                         -- which Cal.com event type to embed
  image          text,
  price          numeric(10,2) not null default 0,  -- display only (payments deferred)
  duration       int not null default 30,
  sort_order     int not null default 0,
  is_active      boolean not null default true
);

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  price       numeric(10,2) not null default 0,
  image       text,
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- bookings (populated by the cal-webhook Edge Function)
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  cal_booking_uid text unique,
  event_type      text,                         -- 'chat' | 'audio' | 'video'
  title           text,
  attendee_name   text,
  attendee_email  text,
  start_time      timestamptz,
  end_time        timestamptz,
  meeting_url     text,                          -- Google Meet link (null for chat)
  status          booking_status not null default 'pending',
  payment_status  payment_status not null default 'waived',
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_start_idx on public.bookings (start_time);
create index if not exists bookings_email_idx on public.bookings (attendee_email);

-- ---------------------------------------------------------------------
-- course_enrollments
-- ---------------------------------------------------------------------
create table if not exists public.course_enrollments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete set null,
  course_id      uuid references public.courses(id) on delete set null,
  user_name      text,
  user_email     text,
  amount         numeric(10,2),
  status         enrollment_status not null default 'pending',
  payment_status payment_status not null default 'waived',
  created_at     timestamptz not null default now()
);
create index if not exists enroll_user_idx on public.course_enrollments (user_id);

-- ---------------------------------------------------------------------
-- blogs (also the public "experiences" board)
-- ---------------------------------------------------------------------
create table if not exists public.blogs (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  excerpt      text not null,
  display_date text,
  author       text not null,
  image        text,
  status       content_status not null default 'pending',
  created_at   timestamptz not null default now()
);
create index if not exists blogs_status_idx on public.blogs (status, created_at desc);

-- ---------------------------------------------------------------------
-- messages (realtime chat)
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  conversation uuid not null,                    -- = the client's profile id
  sender_id    uuid references public.profiles(id) on delete set null,
  sender_name  text,
  sender_role  text,                             -- 'client' | 'admin'
  text         text,
  file_path    text,                             -- Storage object path (or sticker URL)
  file_name    text,
  file_size    bigint,
  file_type    text,                             -- mime, or 'sticker'
  is_reminder  boolean not null default false,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists messages_convo_idx on public.messages (conversation, created_at);
alter table public.messages replica identity full;

-- ---------------------------------------------------------------------
-- site_content (key/value JSON for homepage blocks)
-- ---------------------------------------------------------------------
create table if not exists public.site_content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------
create table if not exists public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  text       text not null,
  image      text,
  rating     numeric(2,1) default 5,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Functions
-- =====================================================================

-- is_admin(): true when the current auth user has role 'admin'.
-- SECURITY DEFINER so it can read profiles without tripping profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- handle_new_user(): create a profile row whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- email_for_phone(): resolve a registered phone number to its account email so
-- the client can "log in via phone" (email remains the auth credential).
-- SECURITY DEFINER so anon callers can look up the email to pass to signInWithPassword.
create or replace function public.email_for_phone(p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where phone = p_phone limit 1;
$$;

-- admin_stats(): dashboard aggregate, admin-only.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select jsonb_build_object(
    'totalUsers',        (select count(*) from public.profiles where role = 'client'),
    'totalBookings',     (select count(*) from public.bookings),
    'completedSessions', (select count(*) from public.bookings where status = 'completed'),
    'totalRevenue',      (select coalesce(sum(amount),0) from public.course_enrollments where payment_status = 'paid'),
    'recentBookings',    (
      select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select attendee_name as "userName", start_time as date, event_type as "consultationType", status
        from public.bookings order by created_at desc limit 5
      ) r
    )
  ) into result;
  return result;
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.consultation_types  enable row level security;
alter table public.courses             enable row level security;
alter table public.bookings            enable row level security;
alter table public.course_enrollments  enable row level security;
alter table public.blogs               enable row level security;
alter table public.messages            enable row level security;
alter table public.site_content        enable row level security;
alter table public.testimonials        enable row level security;

-- profiles -------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- consultation_types (public read, admin write) ------------------------
drop policy if exists ct_read on public.consultation_types;
create policy ct_read on public.consultation_types
  for select using (true);
drop policy if exists ct_admin on public.consultation_types;
create policy ct_admin on public.consultation_types
  for all using (public.is_admin()) with check (public.is_admin());

-- courses --------------------------------------------------------------
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select using (true);
drop policy if exists courses_admin on public.courses;
create policy courses_admin on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- bookings -------------------------------------------------------------
-- Written by the Edge Function via the service-role key (bypasses RLS).
-- Clients may read their own (by user_id or matching email); admin reads all.
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or attendee_email = (select email from public.profiles where id = auth.uid())
  );

-- Admin can update/delete booking rows (status changes from the dashboard).
drop policy if exists bookings_admin on public.bookings;
create policy bookings_admin on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- course_enrollments ---------------------------------------------------
drop policy if exists enroll_select on public.course_enrollments;
create policy enroll_select on public.course_enrollments
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists enroll_insert on public.course_enrollments;
create policy enroll_insert on public.course_enrollments
  for insert with check (user_id = auth.uid());
drop policy if exists enroll_admin on public.course_enrollments;
create policy enroll_admin on public.course_enrollments
  for all using (public.is_admin()) with check (public.is_admin());

-- blogs ----------------------------------------------------------------
drop policy if exists blogs_read on public.blogs;
create policy blogs_read on public.blogs
  for select using (status = 'published' or public.is_admin());
drop policy if exists blogs_public_submit on public.blogs;
create policy blogs_public_submit on public.blogs
  for insert with check (status = 'pending' or public.is_admin());
drop policy if exists blogs_admin_update on public.blogs;
create policy blogs_admin_update on public.blogs
  for update using (public.is_admin());
drop policy if exists blogs_admin_delete on public.blogs;
create policy blogs_admin_delete on public.blogs
  for delete using (public.is_admin());

-- messages -------------------------------------------------------------
drop policy if exists msg_select on public.messages;
create policy msg_select on public.messages
  for select using (
    sender_id = auth.uid()
    or conversation = auth.uid()
    or public.is_admin()
  );
drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages
  for insert with check (sender_id = auth.uid());
drop policy if exists msg_admin on public.messages;
create policy msg_admin on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- site_content (public read, admin write) ------------------------------
drop policy if exists sc_read on public.site_content;
create policy sc_read on public.site_content
  for select using (true);
drop policy if exists sc_admin on public.site_content;
create policy sc_admin on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());

-- testimonials (public read, admin write) ------------------------------
drop policy if exists tm_read on public.testimonials;
create policy tm_read on public.testimonials
  for select using (true);
drop policy if exists tm_admin on public.testimonials;
create policy tm_admin on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Realtime publication
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;
