// supabase/functions/admin-users/index.ts
//
// Admin-only Edge Function for user management. Supabase's service-role key
// must never be shipped inside the client app, so any operation that needs
// it (create user, delete user, force password reset) is routed through
// this function.
//
// Request shape:
//   POST /functions/v1/admin-users
//   Authorization: Bearer <end-user-jwt>    ← the signed-in admin's JWT
//   { "action": "createUser" | "deleteUser" | "resetPassword", ...params }
//
// Response:
//   { ok: true, data?: ... } | { ok: false, error: string }
//
// Auth model:
//   1. Read the caller's JWT from the Authorization header.
//   2. Use the anon key to fetch auth.users row for that JWT.
//   3. Check app_metadata.role === 'admin'. If not, return 403.
//   4. Only then use the service-role client to perform the action.
//
// Deploy:
//   supabase functions deploy admin-users --no-verify-jwt
// (The --no-verify-jwt flag is intentional — we verify manually above so
// we can return a JSON error body instead of Supabase's opaque 401.)

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// CORS for the React Native / Expo client. Widen origin to your web
// domain(s) in production — '*' is fine for mobile-only.
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

interface AdminUser {
  id: string;
  app_metadata?: { role?: string };
}

async function resolveAdmin(authHeader: string | null): Promise<AdminUser | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const u = data.user as unknown as AdminUser;
  if (u.app_metadata?.role !== 'admin') return null;
  return u;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Body must be JSON' }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // deleteSelf is the only action available to non-admins: any signed-in
  // user may erase their own account (GDPR Art. 17). Resolve the caller
  // via the same JWT path but without the admin check.
  if (body.action === 'deleteSelf') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ ok: false, error: 'Authentication required' }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await caller.auth.getUser(token);
    if (error || !data.user) return json({ ok: false, error: 'Invalid session' }, 401);
    const userId = data.user.id;
    // ON DELETE CASCADE on profiles.id → auth.users removes the profile
    // row; clinical rows are removed here so RLS doesn't orphan them.
    await sb.from('case_logs').delete().eq('owner_id', userId);
    await sb.from('procedure_logs').delete().eq('owner_id', userId);
    const { error: delErr } = await sb.auth.admin.deleteUser(userId);
    if (delErr) return json({ ok: false, error: delErr.message }, 400);
    return json({ ok: true });
  }

  const admin = await resolveAdmin(req.headers.get('Authorization'));
  if (!admin) return json({ ok: false, error: 'Admin authentication required' }, 403);

  try {
    switch (body.action) {
      case 'createUser': {
        const { email, password, displayName, role } = body;
        if (!email || !password) return json({ ok: false, error: 'email and password required' }, 400);
        const { data, error } = await sb.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: displayName ?? '' },
          app_metadata: { role: role ?? 'user' },
        });
        if (error) return json({ ok: false, error: error.message }, 400);
        return json({ ok: true, data: { id: data.user?.id } });
      }

      case 'deleteUser': {
        const { userId } = body;
        if (!userId) return json({ ok: false, error: 'userId required' }, 400);
        if (userId === admin.id) {
          return json({ ok: false, error: 'Refusing to delete your own admin account' }, 400);
        }
        const { error } = await sb.auth.admin.deleteUser(userId);
        if (error) return json({ ok: false, error: error.message }, 400);
        return json({ ok: true });
      }

      case 'resetPassword': {
        // Issues a password-recovery link. Supabase emails it to the user;
        // returning the link in the body would be a credential-leak risk.
        const { email } = body;
        if (!email) return json({ ok: false, error: 'email required' }, 400);
        const { error } = await sb.auth.admin.generateLink({
          type: 'recovery',
          email,
        });
        if (error) return json({ ok: false, error: error.message }, 400);
        return json({ ok: true });
      }

      case 'setRole': {
        const { userId, role } = body;
        if (!userId || !role) return json({ ok: false, error: 'userId and role required' }, 400);
        const { error } = await sb.auth.admin.updateUserById(userId, {
          app_metadata: { role },
        });
        if (error) return json({ ok: false, error: error.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ ok: false, error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
