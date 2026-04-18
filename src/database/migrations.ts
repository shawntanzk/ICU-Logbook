import type { SQLiteDatabase } from 'expo-sqlite';

// Each migration runs exactly once, keyed by version number.
// Add new entries here when the schema evolves — never edit existing ones.
const MIGRATIONS: { version: number; statements: string[] }[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS case_logs (
        id            TEXT    PRIMARY KEY NOT NULL,
        date          TEXT    NOT NULL,
        diagnosis     TEXT    NOT NULL,
        icd10_code    TEXT    NOT NULL DEFAULT '',
        organ_systems TEXT    NOT NULL DEFAULT '[]',
        cobatrice_domains TEXT NOT NULL DEFAULT '[]',
        supervision_level TEXT NOT NULL,
        reflection    TEXT    NOT NULL DEFAULT '',
        created_at    TEXT    NOT NULL,
        updated_at    TEXT    NOT NULL,
        synced        INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS procedure_logs (
        id              TEXT    PRIMARY KEY NOT NULL,
        case_id         TEXT,
        procedure_type  TEXT    NOT NULL,
        attempts        INTEGER NOT NULL DEFAULT 1,
        success         INTEGER NOT NULL DEFAULT 1,
        complications   TEXT    NOT NULL DEFAULT '',
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        synced          INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES case_logs(id) ON DELETE SET NULL
      )`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (1)`,
    ],
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Determine current DB version
  let currentVersion = 0;
  try {
    const row = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    );
    currentVersion = row?.version ?? 0;
  } catch {
    // schema_version table doesn't exist yet — run from scratch
    currentVersion = 0;
  }

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  for (const migration of pending) {
    for (const statement of migration.statements) {
      await db.execAsync(statement);
    }
    // Update version after each successful migration
    await db.runAsync(
      'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
      [migration.version]
    );
  }
}
