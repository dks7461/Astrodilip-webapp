# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Astrology consultation web app for "Astro Dilip Sharma". A React (Vite) SPA backed by **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions) for website data and live chat, and **Cal.com** (self-hosted on Render) for booking consultations — Cal.com handles scheduling, Gmail email notifications, and Google Meet links. There is **no custom Node/Express server** (the old Express + Socket.IO + MongoDB backend and the WebRTC stack were removed).

See [SETUP.md](SETUP.md) for full provisioning steps. Payments (Razorpay) are currently deferred.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/` (static SPA)
- `npm run preview` — preview the built output
- `npm run lint` — ESLint (note: there are pre-existing `'React' is defined but never used` and strict react-compiler `setState-in-effect` errors across legacy page files; build is the functional gate)

No test runner is configured.

## Architecture

### Auth & identity
Supabase Auth. [src/context/AuthContext.jsx](src/context/AuthContext.jsx) (wrapped in [src/main.jsx](src/main.jsx)) exposes `session`, `user`, `profile`, `role`, `isAdmin`, and keeps the realtime token in sync. A `profiles` row mirrors each `auth.users` row via a DB trigger and holds `role` (`client`|`admin`). The single admin is a normal account flipped to `role='admin'` once (see SETUP). `/admin` is gated by [src/components/RequireAdmin.jsx](src/components/RequireAdmin.jsx). Identity is `user.id` (a UUID) everywhere — there is no more `localStorage` user object.

### Data access
Frontend talks to Supabase directly via [src/lib/supabaseClient.js](src/lib/supabaseClient.js) using `supabase.from(...)` queries and RPCs; **RLS enforces access**. Key RPCs: `admin_stats()`. The DB schema, RLS policies, storage buckets, and seed live in [supabase/migrations/](supabase/migrations/) and [supabase/seed.sql](supabase/seed.sql). When adding tables, add matching RLS policies (clients see only their own rows; `is_admin()` sees all; config tables are public-read/admin-write).

### Booking & meetings (Cal.com)
[src/pages/Booking.jsx](src/pages/Booking.jsx) reads `consultation_types` and renders the themed `@calcom/embed-react` widget for the selected event slug. Cal.com sends emails + creates Google Meet links. Bookings are mirrored into Supabase by the **`cal-webhook` Edge Function** ([supabase/functions/cal-webhook/](supabase/functions/cal-webhook/)) which upserts into `bookings` keyed on `cal_booking_uid`. [src/pages/MyBookings.jsx](src/pages/MyBookings.jsx) and the admin Meetings tab read `bookings` with live `postgres_changes` subscriptions.

### Realtime chat
Supabase Realtime. Messages persist in the `messages` table (one conversation per client, keyed by the client's user id). Clients subscribe filtered by `conversation`; the admin subscribes unfiltered (RLS-safe). Attachments upload to the private `chat-files` Storage bucket under `<conversationId>/...` (so both the client and admin can read them), rendered via signed URLs. Online status uses Realtime **Presence** on `presence:consultations`. See [src/pages/Chat.jsx](src/pages/Chat.jsx) and the chat tab in [src/pages/Admin.jsx](src/pages/Admin.jsx).

### Admin CMS
[src/pages/Admin.jsx](src/pages/Admin.jsx) is the dashboard: tabs for Chat, Meetings, Users (delete via the `delete-user` Edge Function), Blogs (CRUD + approve public "experience" submissions), Courses (CRUD), Content (consultation types, homepage stats, testimonials), and Stats. Public pages read this data: [src/pages/Courses.jsx](src/pages/Courses.jsx) (courses), [src/pages/Home.jsx](src/pages/Home.jsx) (stats + blogs), Booking (consultation types). Images upload to the public `public-images` bucket (admin-only write).

### Design system
Warm theme: primary orange `#FF6B00`, cream bg `#FFE999`, dark brown text/border `#1A1400`, skeuomorphic hard shadows (`4px 4px 0`). Tokens in [src/index.css](src/index.css). Keep new UI consistent with these; the admin dashboard reuses [src/pages/Chat.css](src/pages/Chat.css) classes plus shared inline style objects (`btnPrimary`, `btnGhost`, `inputStyle`).

## Environment variables
Vite (`VITE_`-prefixed, see [.env.example](.env.example)): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CALCOM_URL`, `VITE_CALCOM_USERNAME`, `VITE_VEDIC_ASTRO_API_KEY`. The Supabase **service-role** key is used only in Edge Function secrets, never in the frontend.

## Known placeholders (not yet dynamic)
The Panchang widget and Reports-page geocoding (`src/components/PanchangWidget.jsx`, `src/pages/Reports.jsx`) are still static. Payments are deferred — `bookings.payment_status` defaults to `waived`; stats revenue comes from `course_enrollments` marked `paid` (₹0 until payments resume).
