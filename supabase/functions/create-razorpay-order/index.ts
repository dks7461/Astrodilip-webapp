// Supabase Edge Function: create-razorpay-order
// Creates a Razorpay order for a consultation and records it as 'created' in
// public.payments. The Razorpay secret key never reaches the client — this
// is the only place that ever sees it.
//
// Secrets required:
//   SUPABASE_URL               (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//
// The caller must be a logged-in user (verified via their bearer token).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const { consultationTypeId } = await req.json().catch(() => ({}));
  if (!consultationTypeId) {
    return new Response(JSON.stringify({ error: 'Missing consultationTypeId' }), { status: 400, headers: corsHeaders });
  }

  const { data: consultType } = await admin
    .from('consultation_types')
    .select('id, price, is_active')
    .eq('id', consultationTypeId)
    .maybeSingle();
  if (!consultType || !consultType.is_active) {
    return new Response(JSON.stringify({ error: 'Invalid consultation type' }), { status: 400, headers: corsHeaders });
  }

  const amountPaise = Math.round(Number(consultType.price) * 100);
  if (amountPaise <= 0) {
    return new Response(JSON.stringify({ error: 'This consultation type does not require payment' }), { status: 400, headers: corsHeaders });
  }

  const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      notes: { user_id: userData.user.id, consultation_type: consultationTypeId },
    }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) {
    console.error('Razorpay order creation failed', order);
    return new Response(
      JSON.stringify({ error: order?.error?.description || 'Failed to create payment order' }),
      { status: 502, headers: corsHeaders },
    );
  }

  const { error: insertErr } = await admin.from('payments').insert({
    user_id: userData.user.id,
    consultation_type: consultationTypeId,
    amount: consultType.price,
    razorpay_order_id: order.id,
    status: 'created',
  });
  if (insertErr) {
    console.error('payments insert failed', insertErr);
    return new Response(JSON.stringify({ error: 'Failed to record payment order' }), { status: 500, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
