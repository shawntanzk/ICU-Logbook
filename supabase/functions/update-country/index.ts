// supabase/functions/update-country/index.ts
//
// Updates the authenticated user's country on their profile.
// A database trigger (record_country_change) automatically writes an audit
// row to country_history every time profiles.country changes, so callers
// never need to touch that table directly.
//
// Deploy:
//   supabase functions deploy update-country

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;

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

  // ── Parse + validate body ──────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Body must be JSON' }, 400); }

  const country = typeof body.country === 'string'
    ? body.country.trim().toUpperCase()
    : null;

  if (!country || country.length !== 2) {
    return json({ ok: false, error: 'country must be an ISO 3166-1 alpha-2 code (e.g. "AU")' }, 400);
  }

  // ── Update profile (trigger writes to country_history automatically) ───────
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: updateErr } = await sb
    .from('profiles')
    .update({ country })
    .eq('id', user.id);

  if (updateErr) {
    console.error('Country update error:', updateErr.message);
    return json({ ok: false, error: 'Failed to update country — please try again.' }, 500);
  }

  return json({ ok: true, country });
});
