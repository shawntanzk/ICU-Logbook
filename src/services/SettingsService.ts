import { getDatabase } from '../database/client';

// Thin key/value facade over the app_settings table. Used for values that
// need to persist across launches but don't belong in the domain tables
// (device ID, consent status, first-run flag, etc.). Web platform falls
// back to an in-memory map since SQLite is unavailable.

const memoryStore = new Map<string, string>();

export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  } catch {
    memoryStore.set(key, value);
  }
}
