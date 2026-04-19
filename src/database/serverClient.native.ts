import * as SQLite from 'expo-sqlite';
import { runServerMigrations } from './serverMigrations';

// Second SQLite file on the device, acting as a stand-in for the remote
// server DB. Kept as a separate file so the mock<->real swap is literally
// one import — the rest of the app knows nothing about where users live.

let _serverDb: SQLite.SQLiteDatabase | null = null;

export async function getServerDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_serverDb) {
    _serverDb = await SQLite.openDatabaseAsync('icu_logbook_server.db');
    await _serverDb.execAsync('PRAGMA journal_mode = WAL;');
    await _serverDb.execAsync('PRAGMA foreign_keys = ON;');
    await runServerMigrations(_serverDb);
  }
  return _serverDb;
}

export async function initializeServerDatabase(): Promise<void> {
  await getServerDatabase();
}
