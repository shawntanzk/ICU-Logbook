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
