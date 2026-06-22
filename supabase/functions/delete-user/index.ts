// Supabase Edge Function: delete-user
// Admin-only. Deletes an auth user (cascades to their profile) and removes
// their chat messages. Must run with the service-role key.
//
// Secrets required:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// The caller must be an authenticated admin (verified via their JWT + profiles.role).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Verify the caller is an admin using their bearer token.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
  }

  const { userId } = await req.json().catch(() => ({}));
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: corsHeaders });
  }

  // Remove the user's chat messages (conversation keyed by their id).
  await admin.from('messages').delete().eq('conversation', userId);

  // Delete the auth user; the profiles FK cascade removes their profile row.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
