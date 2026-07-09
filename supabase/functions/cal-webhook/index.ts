// Supabase Edge Function: cal-webhook
// Receives Cal.com webhooks (BOOKING_CREATED / BOOKING_CANCELLED / BOOKING_RESCHEDULED)
// and mirrors them into the public.bookings table using the service-role key.
//
// Secrets (set via `supabase secrets set ...`):
//   SVC_ROLE_KEY        - Supabase service-role key (custom name to avoid SUPABASE_ prefix restriction)
//   CAL_WEBHOOK_SECRET  - the signing secret you set on the Cal.com webhook

import { createClient } from 'jsr:@supabase/supabase-js@2';

// SUPABASE_URL is auto-injected by the runtime; SVC_ROLE_KEY is our custom secret.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SVC_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('CAL_WEBHOOK_SECRET') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// Verify Cal.com's HMAC-SHA256 signature (header: x-cal-signature-256).
async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // no secret configured -> allow (dev only)
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // Cal.com sends the raw hex string (no prefix like "sha256=")
  return expected === signature.toLowerCase().replace(/^sha256=/, '');
}

// Map a Cal.com event type / location into our event_type + meeting url.
function classify(payload: Record<string, unknown>): { eventType: string; meetingUrl: string | null } {
  const title = String(payload.title ?? '').toLowerCase();
  const slug = String((payload.eventType as any)?.slug ?? '').toLowerCase();
  const haystack = `${slug} ${title}`;
  const eventType = haystack.includes('video')
    ? 'video'
    : haystack.includes('audio') || haystack.includes('voice') || haystack.includes('call')
    ? 'audio'
    : 'chat';

  // Google Meet link comes through in location or videoCallData.
  const location = String(payload.location ?? '');
  let meetingUrl: string | null = null;
  if (location.startsWith('http')) meetingUrl = location;
  const vcd = (payload as any).videoCallData;
  if (!meetingUrl && vcd?.url) meetingUrl = vcd.url;
  return { eventType, meetingUrl };
}

Deno.serve(async (req) => {
  // Cal.com sends OPTIONS for CORS preflight — handle it.
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, x-cal-signature-256',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();

  // Cal.com Ping test: sends a POST with a JSON body like {"triggerEvent":"PING",...}
  // The ping is signed, so we still verify it — but we must accept it gracefully.
  let parsedForPing: any = null;
  try { parsedForPing = JSON.parse(rawBody); } catch { /* ignore */ }
  const isPing = parsedForPing?.triggerEvent === 'PING';

  // Verify signature for all requests (including ping).
  const signature = req.headers.get('x-cal-signature-256');
  if (!(await verifySignature(rawBody, signature))) {
    console.error(
      `Signature mismatch. Received="${signature}" secretLen=${WEBHOOK_SECRET.length} bodyPreview=${rawBody.slice(0, 120)}`
    );
    return new Response(
      JSON.stringify({
        error: 'Invalid signature',
        received: signature,
        secretConfigured: WEBHOOK_SECRET.length > 0,
        bodyPreview: rawBody.slice(0, 120),
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Respond to ping with 200 immediately — no DB write needed.
  if (isPing) {
    console.log('Cal.com ping received and verified OK');
    return new Response(JSON.stringify({ ok: true, ping: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = parsedForPing ?? JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const triggerEvent: string = body.triggerEvent ?? '';
  const payload = body.payload ?? {};
  const calBookingUid: string | null = payload.uid ?? payload.bookingId?.toString() ?? null;

  if (!calBookingUid) {
    return new Response('Missing booking uid', { status: 400 });
  }

  // Primary attendee.
  const attendee = Array.isArray(payload.attendees) ? payload.attendees[0] : null;
  const attendeeEmail: string | null = attendee?.email ?? payload.responses?.email?.value ?? null;
  const attendeeName: string | null = attendee?.name ?? payload.responses?.name?.value ?? null;

  // Resolve our profile id by matching the attendee email.
  let userId: string | null = null;
  if (attendeeEmail) {
    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .eq('email', attendeeEmail)
      .maybeSingle();
    userId = prof?.id ?? null;
  }

  const { eventType, meetingUrl } = classify(payload);

  let status: 'pending' | 'confirmed' | 'completed' | 'cancelled' = 'confirmed';
  if (triggerEvent === 'BOOKING_CANCELLED') status = 'cancelled';

  // Look for a verified payment this user made for this consultation type that
  // hasn't been claimed by another booking yet (a user could pay, then book,
  // reschedule, etc. — claiming prevents one payment covering two bookings).
  let paymentStatus: 'waived' | 'paid' = 'waived';
  let paymentId: string | null = null;
  if (userId && status !== 'cancelled') {
    const { data: payment } = await admin
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .eq('consultation_type', eventType)
      .eq('status', 'paid')
      .is('claimed_by_booking', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (payment) {
      paymentStatus = 'paid';
      paymentId = payment.id;
      await admin.from('payments').update({ claimed_by_booking: calBookingUid }).eq('id', payment.id);
    }
  }

  const row = {
    cal_booking_uid: calBookingUid,
    user_id: userId,
    event_type: eventType,
    title: payload.title ?? null,
    attendee_name: attendeeName,
    attendee_email: attendeeEmail,
    start_time: payload.startTime ?? null,
    end_time: payload.endTime ?? null,
    meeting_url: eventType === 'chat' ? null : meetingUrl,
    status,
    payment_status: paymentStatus,
    payment_id: paymentId,
    notes: payload.additionalNotes ?? null,
  };

  // Upsert keyed on the Cal.com booking uid so reschedules/cancels update in place.
  const { error } = await admin
    .from('bookings')
    .upsert(row, { onConflict: 'cal_booking_uid' });

  if (error) {
    console.error('upsert failed', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
