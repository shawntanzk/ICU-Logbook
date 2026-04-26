// supabase/functions/validate-registration/index.ts
//
// Standalone validator endpoint — NOT exposed to the mobile app.
// Used by training programme directors / registration bodies to verify
// that a given medical registration number belongs to an ICU Logbook account.
//
// Authentication:
//   Callers must supply the VALIDATOR_SECRET (a separate secret from
//   MED_REG_PEPPER) in the X-Validator-Secret header. This secret is
//   given only to authorised validators; it is never embedded in the app.
//
// What it reveals:
//   • Whether the registration number is present in the system.
//   • The country and registration timestamp IF found.
//   • It does NOT reveal the user's name, email, or any clinical data.
//   This is the minimum needed to confirm "this trainee is registered."
//
// Request:
//   POST /functions/v1/validate-registration
//   X-Validator-Secret: <VALIDATOR_SECRET>
//   { "med_reg_number": "ABC12345" }
//
// Response (found):
//   { "found": true, "country": "AU", "registered_at": "2026-04-24T..." }
//
// Response (not found):
//   { "found": false }
//
// Deploy:
//   supabase secrets set MED_REG_PEPPER=$(same value as register function)
//   supabase secrets set VALIDATOR_SECRET=$(openssl rand -hex 32)
//   supabase functions deploy validate-registration --no-verify-jwt

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MED_REG_PEPPER   = Deno.env.get('MED_REG_PEPPER') ?? '';
const VALIDATOR_SECRET = Deno.env.get('VALIDATOR_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-validator-secret',
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
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalise(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

// Constant-time string comparison to prevent timing attacks on secret comparison
async function safeCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ka = enc.encode(a);
  const kb = enc.encode(b);
  if (ka.length !== kb.length) return false;
  // Use HMAC to compare — this is constant-time
  const key = await crypto.subtle.importKey('raw', enc.encode('cmp'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const [ha, hb] = await Promise.all([
    crypto.subtle.sign('HMAC', key, ka),
    crypto.subtle.sign('HMAC', key, kb),
  ]);
  const ua = new Uint8Array(ha);
  const ub = new Uint8Array(hb);
  return ua.every((byte, i) => byte === ub[i]);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  // ── Auth: validate VALIDATOR_SECRET header ──────────────────────────────────
  if (!VALIDATOR_SECRET) {
    console.error('VALIDATOR_SECRET is not configured');
    return json({ error: 'Server misconfiguration' }, 500);
  }

  const suppliedSecret = req.headers.get('X-Validator-Secret') ?? '';
  const secretOk = await safeCompare(suppliedSecret, VALIDATOR_SECRET);
  if (!secretOk) {
    return json({ error: 'Forbidden' }, 403);
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  if (!body.med_reg_number || typeof body.med_reg_number !== 'string') {
    return json({ error: 'med_reg_number is required' }, 400);
  }

  if (!MED_REG_PEPPER) {
    console.error('MED_REG_PEPPER is not configured');
    return json({ error: 'Server misconfiguration' }, 500);
  }

  // ── Compute hash + look up ──────────────────────────────────────────────────
  const hash = await hmacSha256Hex(normalise(body.med_reg_number), MED_REG_PEPPER);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await sb
    .from('profiles')
    .select('country, med_reg_set_at')
    .eq('med_reg_hmac', hash)
    .maybeSingle();

  if (error) {
    console.error('DB lookup error:', error.message);
    return json({ error: 'Lookup failed — try again later' }, 500);
  }

  if (!data) {
    return json({ found: false });
  }

  return json({
    found: true,
    country: data.country,
    registered_at: data.med_reg_set_at,
  });
});
