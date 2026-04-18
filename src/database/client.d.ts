import type { SQLiteDatabase } from 'expo-sqlite';

// Declared here so TS can resolve `../database/client` without picking one
// platform implementation over the other. The real code lives in
// `client.native.ts` (iOS/Android) and `client.web.ts` (stub). Metro does
// platform-specific file resolution at bundle time.

export function getDatabase(): Promise<SQLiteDatabase>;
export function initializeDatabase(): Promise<void>;
