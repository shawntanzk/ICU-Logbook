import { getServerDatabase } from '../database/serverClient';
import { getSetting, setSetting } from './SettingsService';
import { generateSalt, generateToken, hashPassword, verifyPassword } from './passwordHash';
import { generateUUID } from '../utils/uuid';

// Authentication against the mock server DB. Session tokens live on the
// server-side `sessions` table (validity + expiry) and the *active* token
// for this device is cached in the local app_settings (the "cookie"). On
// launch, `restoreSession()` reads the cached token and revalidates it.
//
// When swapping to Supabase, replace the bodies of the six exported
// functions — every caller in the app reads/writes through this file only.

const SESSION_TOKEN_KEY = 'active_session_token';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type UserRole = 'admin' | 'user';

export interface AuthedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface SignInResult {
  ok: boolean;
  user?: AuthedUser;
  error?: string;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  password_hash: string;
  password_salt: string;
  disabled: number;
}

function rowToUser(row: UserRow): AuthedUser {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const db = await getServerDatabase();
  const row = await db.getFirstAsync<UserRow>(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );
  if (!row) return { ok: false, error: 'No account with that email.' };
  if (row.disabled) return { ok: false, error: 'This account has been disabled.' };

  const valid = await verifyPassword(password, row.password_salt, row.password_hash);
  if (!valid) return { ok: false, error: 'Incorrect password.' };

  // Mint a new session. We don't revoke the previous token here, so a user
  // can stay signed in on multiple devices (matches the Supabase default).
  const token = await generateToken();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO sessions (token, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
    [token, row.id, new Date(now).toISOString(), new Date(now + SESSION_DURATION_MS).toISOString()]
  );
  await setSetting(SESSION_TOKEN_KEY, token);

  return { ok: true, user: rowToUser(row) };
}

export async function restoreSession(): Promise<AuthedUser | null> {
  const token = await getSetting(SESSION_TOKEN_KEY);
  if (!token) return null;

  const db = await getServerDatabase();
  const row = await db.getFirstAsync<UserRow & { expires_at: string }>(
    `SELECT u.*, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
      LIMIT 1`,
    [token]
  );
  if (!row) {
    await setSetting(SESSION_TOKEN_KEY, '');
    return null;
  }
  if (new Date(row.expires_at).getTime() < Date.now() || row.disabled) {
    await signOut();
    return null;
  }
  return rowToUser(row);
}

export async function signOut(): Promise<void> {
  const token = await getSetting(SESSION_TOKEN_KEY);
  if (token) {
    try {
      const db = await getServerDatabase();
      await db.runAsync('DELETE FROM sessions WHERE token = ?', [token]);
    } catch {
      // best-effort — local token clear below is what actually logs the user out
    }
  }
  await setSetting(SESSION_TOKEN_KEY, '');
}

// ─── First-run setup ─────────────────────────────────────────────────────────

// True when the server DB has zero users — triggers the initial-admin
// setup screen instead of the login screen.
export async function hasAnyUser(): Promise<boolean> {
  const db = await getServerDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  );
  return (row?.count ?? 0) > 0;
}

// Create the very first admin and immediately sign them in. Refuses to
// run if any user already exists, so it can't be used to bypass the
// Admin Panel's user-management flow.
export async function createFirstAdmin(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<SignInResult> {
  if (await hasAnyUser()) {
    return { ok: false, error: 'Setup has already been completed.' };
  }
  await createUser({ ...input, role: 'admin' });
  return signIn(input.email, input.password);
}

// ─── Admin / user management ─────────────────────────────────────────────────

export interface ManagedUser extends AuthedUser {
  disabled: boolean;
  createdAt: string;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const db = await getServerDatabase();
  const rows = await db.getAllAsync<UserRow & { created_at: string }>(
    'SELECT * FROM users ORDER BY created_at ASC'
  );
  return rows.map((r) => ({
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

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!input.displayName.trim()) {
    throw new Error('Please enter a display name.');
  }

  const db = await getServerDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existing) throw new Error('A user with that email already exists.');

  const salt = await generateSalt();
  const hash = await hashPassword(input.password, salt);
  const now = new Date().toISOString();
  const id = generateUUID();

  await db.runAsync(
    `INSERT INTO users
       (id, email, display_name, role, password_hash, password_salt, created_at, updated_at, disabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, email, input.displayName.trim(), input.role, hash, salt, now, now]
  );

  return {
    id,
    email,
    displayName: input.displayName.trim(),
    role: input.role,
    disabled: false,
    createdAt: now,
  };
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const db = await getServerDatabase();
  await db.runAsync(
    'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    [role, new Date().toISOString(), userId]
  );
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<void> {
  const db = await getServerDatabase();
  await db.runAsync(
    'UPDATE users SET disabled = ?, updated_at = ? WHERE id = ?',
    [disabled ? 1 : 0, new Date().toISOString(), userId]
  );
  if (disabled) {
    // Kill existing sessions so the disabled account is booted on next request.
    await db.runAsync('DELETE FROM sessions WHERE user_id = ?', [userId]);
  }
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
  const db = await getServerDatabase();
  const salt = await generateSalt();
  const hash = await hashPassword(newPassword, salt);
  await db.runAsync(
    'UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?',
    [hash, salt, new Date().toISOString(), userId]
  );
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await getServerDatabase();
  await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
}

// ─── User lookup helpers ─────────────────────────────────────────────────────

// Returns id → display_name for every user, used to render owner /
// supervisor / observer badges in the case list and detail screens.
export async function getUserDirectory(): Promise<Record<string, string>> {
  const db = await getServerDatabase();
  const rows = await db.getAllAsync<{ id: string; display_name: string }>(
    'SELECT id, display_name FROM users'
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.display_name]));
}
