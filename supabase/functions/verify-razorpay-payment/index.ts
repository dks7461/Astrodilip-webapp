// Supabase Edge Function: verify-razorpay-payment
// Verifies a Razorpay checkout signature server-side and marks the matching
// payments row as 'paid'. The client's word alone is never trusted — this
// HMAC check against the Razorpay secret is what actually confirms payment.
//
// Secrets required:
//   SUPABASE_URL               (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   RAZORPAY_KEY_SECRET
//
// The caller must be a logged-in user (verified via their bearer token).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}));
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return new Response(JSON.stringify({ error: 'Missing payment details' }), { status: 400, headers: corsHeaders });
  }

  const expected = await hmacHex(RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (expected !== razorpay_signature) {
    return new Response(JSON.stringify({ verified: false, error: 'Signature mismatch' }), { status: 400, headers: corsHeaders });
  }

  // Only flip a payment that belongs to this caller and is still pending —
  // never let a request mark someone else's order, or an already-processed
  // one, as paid.
  const { data: payment, error: updateErr } = await admin
    .from('payments')
    .update({ status: 'paid', razorpay_payment_id })
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('user_id', userData.user.id)
    .eq('status', 'created')
    .select()
    .maybeSingle();

  if (updateErr || !payment) {
    console.error('payment verify update failed', updateErr);
    return new Response(
      JSON.stringify({ verified: false, error: 'Payment record not found or already processed' }),
      { status: 404, headers: corsHeaders },
    );
  }

  return new Response(JSON.stringify({ verified: true, paymentId: payment.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
