import type { SQLiteDatabase } from 'expo-sqlite';

// Mock "remote" SQLite DB. Declared so TS can resolve `../database/serverClient`
// without picking a platform implementation. Real code lives in
// serverClient.native.ts (iOS/Android) and serverClient.web.ts (stub). This
// database is the eventual Supabase Postgres analogue — it owns users,
// sessions, and role assignments. Swap the one file when going live.

export function getServerDatabase(): Promise<SQLiteDatabase>;
export function initializeServerDatabase(): Promise<void>;
