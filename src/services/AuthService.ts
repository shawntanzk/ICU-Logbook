import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

// Auth now goes through Supabase. Every caller in the app imports from
// this file only, so swapping implementations (e.g. to another provider)
// means editing this one module.
//
// Passwords never touch local storage. The Supabase client persists the
// JWT session in AsyncStorage and refreshes it in the background.
//
// Bootstrap model: there's no in-app "first-run admin" flow anymore.
// Anyone can sign up (email+password or Google). The first admin is
// promoted from the Supabase dashboard — see SETUP.md.

export type UserRole = 'admin' | 'user';

export interface AuthedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  country: string | null;
  profileComplete: boolean;
}

export interface SignInResult {
  ok: boolean;
  user?: AuthedUser;
  error?: string;
  // Set when signUp succeeded but email-confirmation is required, so
  // the UI can prompt the user to check their inbox instead of trying
  // to show a session that doesn't exist yet.
  needsEmailConfirmation?: boolean;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  disabled: boolean;
  country: string | null;
  // med_reg_hmac is selected to check if set, but the hash value is not used client-side.
  med_reg_hmac: string | null;
}

function rowToUser(row: ProfileRow): AuthedUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    country: row.country,
    profileComplete: !!row.country && !!row.med_reg_hmac,
  };
}

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, disabled, country, med_reg_hmac')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProfileRow) ?? null;
}

// ─── Set medical registration (called post-signup for OAuth users) ────────────
// The actual hashing happens inside the 'register' or 'set-registration'
// Edge Function — the plaintext never reaches the database.
export async function setMedicalRegistration(input: {
  country: string;
  medRegNumber: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('set-registration', {
    body: {
      country: input.country.toUpperCase(),
      med_reg_number: input.medRegNumber.trim(),
    },
  });
  if (error) return { ok: false, error: error.message };
  const payload = data as { ok: boolean; error?: string };
  if (!payload?.ok) return { ok: false, error: payload?.error ?? 'Could not save registration.' };
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Sign in failed.' };

  const profile = await loadProfile(data.user.id);
  if (!profile) return { ok: false, error: 'Profile not found.' };
  if (profile.disabled) {
    await supabase.auth.signOut();
    return { ok: false, error: 'This account has been disabled.' };
  }
  return { ok: true, user: rowToUser(profile) };
}

// Self-signup with email + password. The handle_new_user trigger
// creates the matching profile row. If the project has email
// confirmation enabled (default), signUp succeeds but no session is
// returned — the caller should prompt the user to check their inbox.
export async function signUp(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<SignInResult> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { display_name: input.displayName.trim() } },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Sign up failed.' };
  }
  if (!data.session) {
    // Email confirmation required — no session yet.
    return { ok: false, needsEmailConfirmation: true };
  }
  // Session exists → fetch profile and return the signed-in user.
  const profile = await loadProfile(data.user.id);
  if (!profile) return { ok: false, error: 'Profile not found after signup.' };
  return { ok: true, user: rowToUser(profile) };
}

// Shared browser + PKCE-code dance used by both sign-in and identity
// linking. The caller supplies the Supabase call that yields the OAuth
// URL ({ data: { url } }); this helper opens it, catches the deep-link
// redirect, and runs `exchangeCodeForSession` on the returned ?code.
async function runOAuthFlow(
  getUrl: (redirectTo: string) => Promise<{ data: { url?: string | null } | null; error: { message: string } | null }>,
): Promise<{ ok: true } | { ok: false; error: string; cancelled?: boolean }> {
  // NOTE: pass the path WITHOUT a leading slash. Linking.createURL
  // with '/foo' emits `iculogbook:///foo` (three slashes), which
  // Supabase treats as a different URL from the `iculogbook://foo`
  // variant listed in Additional Redirect URLs. Passing 'foo' gives
  // `iculogbook://foo` — matches the allowlist, Supabase redirects
  // cleanly, the deep-link opens the app.
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await getUrl(redirectTo);
  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? 'Could not start OAuth flow.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'Sign-in was cancelled.', cancelled: true };
  }

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (!code) {
    const oauthErr = url.searchParams.get('error_description') ?? url.searchParams.get('error');
    return { ok: false, error: oauthErr ?? 'No auth code returned.' };
  }

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) return { ok: false, error: exchangeErr.message };
  return { ok: true };
}

// Google OAuth sign-in via PKCE + in-app browser. Requires: app.json
// `scheme` set, Google provider enabled in the Supabase dashboard,
// and `iculogbook://auth-callback` registered as a redirect URL.
export async function signInWithGoogle(): Promise<SignInResult> {
  const flow = await runOAuthFlow((redirectTo) =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
  );
  if (!flow.ok) return { ok: false, error: flow.error };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: 'Could not complete sign-in.' };
  const profile = await loadProfile(data.user.id);
  if (!profile) return { ok: false, error: 'Profile not found.' };
  if (profile.disabled) {
    await supabase.auth.signOut();
    return { ok: false, error: 'This account has been disabled.' };
  }
  return { ok: true, user: rowToUser(profile) };
}

// ─── Identity linking (for already-signed-in users) ──────────────────
//
// Supabase supports multiple identities per account. A user who signed
// up with email+password can attach Google (or vice versa) so either
// method signs them into the same account. Requires "Manual linking"
// to be enabled in *Authentication → Settings* on the dashboard.

export type IdentityProvider = 'email' | 'google' | string;

export interface LinkedIdentity {
  id: string;
  provider: IdentityProvider;
  email?: string;
  createdAt?: string;
}

export async function listIdentities(): Promise<LinkedIdentity[]> {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw new Error(error.message);
  return (data?.identities ?? []).map((i) => ({
    id: i.identity_id ?? i.id,
    provider: i.provider,
    email: (i.identity_data as { email?: string } | undefined)?.email,
    createdAt: i.created_at,
  }));
}

export async function linkGoogleIdentity(): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> {
  const flow = await runOAuthFlow((redirectTo) =>
    supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
  );
  if (!flow.ok) return { ok: false, error: flow.error, cancelled: flow.cancelled };
  return { ok: true };
}

export async function unlinkGoogleIdentity(): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) return { ok: false, error: error.message };
  const google = data?.identities?.find((i) => i.provider === 'google');
  if (!google) return { ok: false, error: 'Google is not linked to this account.' };
  if ((data?.identities?.length ?? 0) <= 1) {
    return {
      ok: false,
      error: 'Cannot unlink your only sign-in method. Set a password first.',
    };
  }
  const { error: unlinkErr } = await supabase.auth.unlinkIdentity(google);
  if (unlinkErr) return { ok: false, error: unlinkErr.message };
  return { ok: true };
}

export async function restoreSession(): Promise<AuthedUser | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const profile = await loadProfile(user.id);
  if (!profile || profile.disabled) {
    await supabase.auth.signOut();
    return null;
  }
  return rowToUser(profile);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Kick off the "I forgot my password" flow. Supabase mails a deep-link
// that comes back as iculogbook://auth-callback?code=…; the app's
// OAuth callback handler exchanges the code for a session, at which
// point the caller should push a "Set new password" screen.
export async function sendPasswordResetEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  // Path without a leading slash — see runOAuthFlow for why: `/foo`
  // produces `iculogbook:///foo` which Supabase treats as distinct
  // from the `iculogbook://foo` entry in the redirect allowlist.
  const redirectTo = Linking.createURL('auth-callback');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Update the current user's password. Requires an active session
// (either from a normal sign-in or the exchanged reset-link code).
export async function updatePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Permanently delete the current user's account and all owned rows.
// Irreversible. The Edge Function's `deleteSelf` branch runs server-side
// so we never ship the service-role key. After success the caller is
// signed out and should trigger a local wipe.
export async function deleteOwnAccount(): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'deleteSelf' },
  });
  if (error) return { ok: false, error: error.message };
  const payload = data as { ok: boolean; error?: string };
  if (!payload?.ok) return { ok: false, error: payload?.error ?? 'Delete failed' };
  await supabase.auth.signOut();
  return { ok: true };
}

// ─── Admin / user management ─────────────────────────────────────────

export interface ManagedUser extends AuthedUser {
  disabled: boolean;
  createdAt: string;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, disabled, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    role: r.role,
    disabled: !!r.disabled,
    createdAt: r.created_at,
  }));
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
}

// Admin user-management now routes through the `admin-users` Edge
// Function, which holds the service-role key server-side. We never
// ship that key in the client bundle. The function verifies the
// caller's JWT has `app_metadata.role === 'admin'` before doing
// anything.
async function invokeAdmin<T = unknown>(
  action: string,
  params: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  const payload = data as { ok: boolean; error?: string; data?: T };
  if (!payload?.ok) throw new Error(payload?.error ?? 'Admin action failed');
  return payload.data as T;
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  await invokeAdmin<{ id: string }>('createUser', {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    displayName: input.displayName,
    role: input.role,
  });
  // The auth.users row is created synchronously; the profiles row is
  // written by the on_auth_user_created trigger. Re-list so the caller
  // sees the new row without caring about eventual consistency.
  const rows = await listUsers();
  const created = rows.find((r) => r.email.toLowerCase() === input.email.trim().toLowerCase());
  if (!created) throw new Error('User created but profile row not found yet — refresh and try again.');
  return created;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  // Two writes: app_metadata in auth.users (what RLS reads) and the
  // mirrored column in profiles (what the admin UI lists). Doing both
  // keeps the two views consistent.
  await invokeAdmin('setRole', { userId, role });
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<void> {
  // Disabled is advisory (our own column) — not tied to Supabase auth.
  // RLS policies check it via profiles, so flipping this immediately
  // blocks reads/writes without touching auth.users.
  const { error } = await supabase.from('profiles').update({ disabled }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function resetUserPassword(userId: string, _newPassword: string): Promise<void> {
  // The Edge Function issues a recovery email rather than accepting a
  // plaintext password — returning one in a response body would be a
  // credential leak. We keep the second arg for signature compatibility
  // with the old call sites, but ignore it.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile?.email) throw new Error('User has no email on file.');
  await invokeAdmin('resetPassword', { email: profile.email });
}

export async function deleteUser(userId: string): Promise<void> {
  await invokeAdmin('deleteUser', { userId });
}

// ─── User lookup helpers ─────────────────────────────────────────────

export async function getUserDirectory(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('profiles').select('id, display_name');
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.id, r.display_name]));
}
