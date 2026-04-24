// supabase/functions/register/index.ts
//
// Public self-registration endpoint.
//
// Why an Edge Function instead of calling supabase.auth.signUp() directly?
//   • The medical registration number must be hashed SERVER-SIDE so the
//     plaintext never touches the database. The HMAC key (MED_REG_PEPPER)
//     lives only in this function's environment — not in the client bundle
//     and not in the database.
//   • We use the service-role client to write the hash atomically at the
//     moment of account creation, avoiding a race between signup and the
//     subsequent "complete profile" call.
//
// Security model:
//   • Registration number is normalised (UPPER + strip whitespace) then
//     HMAC-SHA256'd with a 256-bit random pepper stored as a Supabase
//     secret (MED_REG_PEPPER). Only this function and the validator
//     function share that secret.
//   • The resulting 64-char hex digest is stored in profiles.med_reg_hmac.
//   • Even with full DB access the original number cannot be recovered.
//   • The validator does: hmac(candidate) == stored_hmac → match.
//
// Deploy:
//   supabase secrets set MED_REG_PEPPER=$(openssl rand -hex 32)
//   supabase functions deploy register --no-verify-jwt

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MED_REG_PEPPER     = Deno.env.get('MED_REG_PEPPER') ?? '';

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

// ── HMAC-SHA256 using Web Crypto (native in Deno) ────────────────────────────
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

// Normalise: uppercase + remove all whitespace (handles "AB 1234" and "AB1234" identically)
function normalise(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

// ── Input validation ─────────────────────────────────────────────────────────
function validateInputs(body: any): string | null {
  if (!body.email || typeof body.email !== 'string') return 'email is required';
  if (!body.password || typeof body.password !== 'string') return 'password is required';
  if (body.password.length < 8) return 'password must be at least 8 characters';
  if (!body.display_name || typeof body.display_name !== 'string') return 'display_name is required';
  if (!body.country || typeof body.country !== 'string') return 'country is required';
  if (body.country.length !== 2) return 'country must be an ISO 3166-1 alpha-2 code (e.g. "AU")';
  if (!body.med_reg_number || typeof body.med_reg_number !== 'string') return 'med_reg_number is required';
  if (body.med_reg_number.trim().length < 2) return 'med_reg_number is too short';
  return null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Request body must be JSON' }, 400);
  }

  const validationError = validateInputs(body);
  if (validationError) return json({ ok: false, error: validationError }, 400);

  if (!MED_REG_PEPPER) {
    console.error('MED_REG_PEPPER secret is not configured');
    return json({ ok: false, error: 'Server misconfiguration — contact support' }, 500);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create the auth user (service role bypasses email confirmation flow
  //    — Supabase will still send the confirmation email if the project has
  //    email confirmation enabled, but the account is created immediately).
  const email = body.email.trim().toLowerCase();
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: false,           // don't auto-confirm; Supabase emails the link
    user_metadata: {
      display_name: body.display_name.trim(),
      country: body.country.toUpperCase(),
    },
    app_metadata: { role: 'user' },
  });

  if (authErr) {
    // Surface useful duplicate-email error to the client.
    const isDuplicate = authErr.message.toLowerCase().includes('already registered')
      || authErr.message.toLowerCase().includes('already exists')
      || authErr.message.toLowerCase().includes('unique');
    return json(
      { ok: false, error: isDuplicate ? 'An account with this email already exists.' : authErr.message },
      isDuplicate ? 409 : 400,
    );
  }

  const userId = authData.user!.id;

  // 2. Compute the HMAC hash of the registration number.
  const hash = await hmacSha256Hex(normalise(body.med_reg_number), MED_REG_PEPPER);

  // 3. Upsert the profile. The fn_profiles_on_auth_insert trigger already
  //    created the row; we update it with country + hash.
  //    (We use upsert with ON CONFLICT to handle any timing edge case.)
  const { error: profileErr } = await sb.from('profiles').upsert({
    id: userId,
    email,
    display_name: body.display_name.trim(),
    country: body.country.toUpperCase(),
    med_reg_hmac: hash,
    med_reg_set_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (profileErr) {
    // Roll back: delete the auth user so the account doesn't exist half-formed.
    await sb.auth.admin.deleteUser(userId);
    return json({ ok: false, error: 'Failed to save profile — please try again.' }, 500);
  }

  // 4. Check whether a session was issued (email confirmation disabled)
  //    or whether the user must confirm first.
  const needsEmailConfirmation = !authData.session;

  return json({ ok: true, needsEmailConfirmation });
});
