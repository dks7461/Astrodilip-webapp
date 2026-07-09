-- =====================================================================
-- payments: Razorpay orders for paid consultations. Written only by the
-- create-razorpay-order / verify-razorpay-payment Edge Functions using the
-- service-role key — no client-side insert/update policy exists on purpose,
-- so a payment can only ever be marked 'paid' after a verified Razorpay
-- signature, never by a direct client request.
-- =====================================================================

create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  consultation_type    text not null references public.consultation_types(id),
  amount               numeric(10,2) not null,
  razorpay_order_id    text unique not null,
  razorpay_payment_id  text,
  status               text not null default 'created' check (status in ('created', 'paid', 'failed')),
  claimed_by_booking   text,               -- cal_booking_uid once consumed by a booking (prevents reuse)
  created_at           timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_lookup_idx on public.payments (user_id, consultation_type, status);

alter table public.bookings add column if not exists payment_id uuid references public.payments(id);

alter table public.payments enable row level security;

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
