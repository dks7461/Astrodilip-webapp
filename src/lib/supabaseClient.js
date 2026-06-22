import { createClient } from '@supabase/supabase-js';

// Supabase project credentials come from Vite env vars (see .env.example).
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set for the app to talk
// to Supabase (auth, database, realtime, storage).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear console warning during development instead of failing silently
  // with confusing network errors deep inside the app.
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project credentials. ' +
      'The UI will render but data/auth/realtime calls will fail until configured.'
  );
}

// Fall back to harmless placeholders so createClient does not throw and white-screen
// the whole app when env vars are not yet set (e.g. first local run).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Well-known logical id used for the single astrologer/admin in chat conversations.
// The actual admin auth user id is resolved at runtime; this is only a display fallback.
export const ADMIN_ROLE = 'admin';
