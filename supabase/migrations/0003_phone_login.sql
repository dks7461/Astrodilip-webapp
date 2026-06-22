-- =====================================================================
-- Phone capture at signup + "login via phone" support.
-- CREATE OR REPLACE everywhere, so this is safe to run even if 0001 already ran.
-- =====================================================================

-- Capture phone (from signup metadata) into profiles alongside name/email.
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
    nullif(new.raw_user_meta_data->>'phone', ''),
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Resolve the email associated with a phone number so the client can sign in
-- with phone + password (Supabase signInWithPassword needs the email).
-- SECURITY DEFINER so it can read across profiles despite RLS; returns only
-- the email and only when an exact phone match exists.
create or replace function public.email_for_phone(p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where phone = p_phone limit 1;
$$;

-- Allow anonymous + authenticated callers to invoke the lookup (needed before login).
grant execute on function public.email_for_phone(text) to anon, authenticated;
