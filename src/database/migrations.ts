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
  {
    // v2 — FAIR / semantic-export upgrade. Adds terminology-bound JSON
    // columns, provenance, quality, consent and schema-version tags. The
    // original columns are preserved so existing rows remain queryable
    // and legacy UI code keeps working without a rewrite.
    version: 2,
    statements: [
      // Per-install key/value store (device ID, consent status, etc.)
      `CREATE TABLE IF NOT EXISTS app_settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`,

      // case_logs — coded + metadata columns
      `ALTER TABLE case_logs ADD COLUMN schema_version TEXT NOT NULL DEFAULT '2.0.0'`,
      `ALTER TABLE case_logs ADD COLUMN diagnosis_coded TEXT`,                              // JSON CodedValue | null
      `ALTER TABLE case_logs ADD COLUMN organ_systems_coded TEXT NOT NULL DEFAULT '[]'`,    // JSON CodedValue[]
      `ALTER TABLE case_logs ADD COLUMN cobatrice_domains_coded TEXT NOT NULL DEFAULT '[]'`,// JSON CodedValue[]
      `ALTER TABLE case_logs ADD COLUMN supervision_level_coded TEXT`,                      // JSON CodedValue
      `ALTER TABLE case_logs ADD COLUMN provenance TEXT`,                                   // JSON Provenance
      `ALTER TABLE case_logs ADD COLUMN quality TEXT`,                                      // JSON Quality
      `ALTER TABLE case_logs ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'anonymous'`,
      `ALTER TABLE case_logs ADD COLUMN license TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'`,

      // procedure_logs — coded + metadata columns
      `ALTER TABLE procedure_logs ADD COLUMN schema_version TEXT NOT NULL DEFAULT '2.0.0'`,
      `ALTER TABLE procedure_logs ADD COLUMN procedure_type_coded TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN provenance TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN quality TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'anonymous'`,
      `ALTER TABLE procedure_logs ADD COLUMN license TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'`,

      `INSERT OR IGNORE INTO schema_version (version) VALUES (2)`,
    ],
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  let currentVersion = 0;
  try {
    const row = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    );
    currentVersion = row?.version ?? 0;
  } catch {
    currentVersion = 0;
  }

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  for (const migration of pending) {
    for (const statement of migration.statements) {
      await db.execAsync(statement);
    }
    await db.runAsync(
      'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
      [migration.version]
    );
  }
}
