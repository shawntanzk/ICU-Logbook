// supabase/functions/set-registration/index.ts
//
// Sets the medical registration number for an already-authenticated user.
// Used by OAuth (Google) users who signed up without going through the
// /register endpoint and are directed to CompleteRegistrationScreen.
//
// Authentication:
//   Standard Supabase JWT (Authorization: Bearer <token>) — the function
//   verifies it and extracts the caller's user ID. Service-role key never
//   leaves the server.
//
// Deploy:
//   supabase functions deploy set-registration
//   (JWT verification is handled automatically by Supabase runtime)

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const MED_REG_PEPPER   = Deno.env.get('MED_REG_PEPPER') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function hmacSha256Hex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalise(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  // ── Verify caller JWT ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ ok: false, error: 'Authentication required' }, 401);

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
  if (authErr || !user) return json({ ok: false, error: 'Invalid session' }, 401);

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Body must be JSON' }, 400); }

  if (!body.country || typeof body.country !== 'string' || body.country.length !== 2) {
    return json({ ok: false, error: 'country must be an ISO 3166-1 alpha-2 code' }, 400);
  }
  if (!body.med_reg_number || typeof body.med_reg_number !== 'string' || body.med_reg_number.trim().length < 2) {
    return json({ ok: false, error: 'med_reg_number is required' }, 400);
  }

  if (!MED_REG_PEPPER) {
    console.error('MED_REG_PEPPER secret is not configured');
    return json({ ok: false, error: 'Server misconfiguration' }, 500);
  }

  // ── Hash + persist ─────────────────────────────────────────────────────────
  const hash = await hmacSha256Hex(normalise(body.med_reg_number), MED_REG_PEPPER);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: updateErr } = await sb
    .from('profiles')
    .update({
      country: body.country.toUpperCase(),
      med_reg_hmac: hash,
      med_reg_set_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateErr) {
    console.error('Profile update error:', updateErr.message);
    return json({ ok: false, error: 'Failed to save — please try again.' }, 500);
  }

  return json({ ok: true });
});
