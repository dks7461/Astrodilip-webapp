# Setup Guide — Astro Dilip Sharma Web App

This app is a React (Vite) SPA backed by **Supabase** (auth, database, realtime, storage,
edge functions) for the website + chat, and **Cal.com** (self-hosted on Render) for booking
consultations, sending Gmail notifications, and generating Google Meet links.

There is no longer any custom Node/Express server.

---

## 1. Environment variables

Copy `.env.example` → `.env` and fill in:

| Var | What |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_CALCOM_URL` | Base URL of your self-hosted Cal.com instance |
| `VITE_CALCOM_USERNAME` | The astrologer's Cal.com username |
| `VITE_VEDIC_ASTRO_API_KEY` | (optional) Reports page astrology API key |

Local dev: `npm install` then `npm run dev`. Build: `npm run build` (static output in `dist/`).

---

## 2. Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_storage.sql`
   - `supabase/seed.sql`
3. **Create the admin account:** sign up through the app with the astrologer's email,
   then in SQL run:
   ```sql
   update public.profiles set role = 'admin' where email = 'ADMIN_EMAIL_HERE';
   ```
   That account can now reach `/admin`.
4. **Edge Functions** (Supabase CLI: `supabase functions deploy <name>`):
   - `cal-webhook` — receives Cal.com booking webhooks → writes to `bookings`.
     Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CAL_WEBHOOK_SECRET`.
   - `delete-user` — admin-only user deletion.
     Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
5. Auth settings: enable Email/password. Decide whether to require email confirmation
   (signup UI handles both cases).

---

## 3. Cal.com (self-hosted on Render)

1. Deploy Cal.com (https://github.com/calcom/cal.com) as a Render web service backed by a
   **Render Postgres** (Cal.com manages its own schema — keep it separate from Supabase).
2. Configure env on the Cal.com service: database URL, `NEXTAUTH_SECRET`,
   `CALENDSO_ENCRYPTION_KEY`, app URL, **Google OAuth** (Calendar + Meet) and
   **Gmail SMTP** (`EMAIL_SERVER_*` / `EMAIL_FROM`) for notifications.
3. Sign in to Cal.com, connect Google Calendar, and create three event types whose slugs
   match `consultation_types.cal_event_slug` (default `chat`, `audio`, `video`).
   Set **audio** and **video** locations to **Google Meet**; **chat** has no location.
4. Add a **webhook** → URL `https://<project-ref>.functions.supabase.co/cal-webhook`,
   subscribed to `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`, with a
   signing secret equal to the function's `CAL_WEBHOOK_SECRET`.

---

## 4. Hosting the frontend

Deploy `dist/` to any static host (Vercel/Netlify/Render static). `vercel.json` includes the
SPA rewrite and security headers; `public/_headers` covers Netlify.

---

## 5. Security TODO (do this!)

- The previously committed **live Razorpay keys must be rotated** — they were exposed in git
  history (`server/.env`). Payments are currently deferred; re-enable later via a Razorpay
  Edge Function.
- Never expose the Supabase **service-role** key to the frontend — it lives only in Edge
  Function secrets.
