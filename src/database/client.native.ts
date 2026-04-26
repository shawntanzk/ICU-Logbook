import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

// Singleton — one connection for the lifetime of the app.
// Swap out for a remote DB adapter here when adding cloud sync.
let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('icu_logbook.db');
    // WAL mode improves concurrent read/write performance
    await _db.execAsync('PRAGMA journal_mode = WAL;');
    await runMigrations(_db);
  }
  return _db;
}

// Call once at app startup to warm the connection and run migrations.
export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}

// Wipes every user-data row from the local cache. Keeps schema and
// schema_version intact so the next login doesn't re-run migrations or
// hit an empty-DB code path. Use for "delete my account" and the
// debug "clear all data" action.
export async function wipeLocalData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM case_logs;
    DELETE FROM procedure_logs;
    DELETE FROM app_settings;
  `);
}

// All clinical tables that carry an owner_id column.
const OWNED_TABLES = [
  'case_logs',
  'procedure_logs',
  'airway_logs',
  'arterial_line_logs',
  'cvc_logs',
  'uss_logs',
  'regional_block_logs',
  'ward_review_logs',
  'transfer_logs',
  'ed_attendance_logs',
  'medicine_placement_logs',
] as const;

/**
 * Re-assigns every locally-owned row from `fromUserId` to `toUserId`.
 * Called when a guest user signs in or signs up — their offline data
 * migrates to their new Supabase account so the next sync uploads it.
 * Sets synced = 0 on all re-attributed rows so SyncService picks them up.
 */
export async function reAttributeLocalData(
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const table of OWNED_TABLES) {
      await db.runAsync(
        `UPDATE ${table} SET owner_id = ?, synced = 0 WHERE owner_id = ?`,
        [toUserId, fromUserId],
      );
    }
  });
}
