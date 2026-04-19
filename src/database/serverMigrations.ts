import type { SQLiteDatabase } from 'expo-sqlite';

// Schema for the mock server DB. Separate migration list from the local
// cache DB so they can evolve independently. Each migration runs once,
// keyed by version; never edit previous entries.

const MIGRATIONS: { version: number; statements: string[] }[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY NOT NULL
      )`,

      // Users — the authoritative account list. Roles:
      //   admin      → can manage users (via the Admin Panel)
      //   supervisor → read-only view of assigned trainees
      //   trainee    → writes own cases and procedures
      `CREATE TABLE IF NOT EXISTS users (
        id              TEXT    PRIMARY KEY NOT NULL,
        email           TEXT    NOT NULL UNIQUE,
        display_name    TEXT    NOT NULL,
        role            TEXT    NOT NULL CHECK (role IN ('admin','supervisor','trainee')),
        password_hash   TEXT    NOT NULL,
        password_salt   TEXT    NOT NULL,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        disabled        INTEGER NOT NULL DEFAULT 0
      )`,

      // Session tokens — issued on signIn, validated on app launch. A row
      // in `sessions` with `expires_at > now` is what makes a token valid.
      `CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT    PRIMARY KEY NOT NULL,
        user_id    TEXT    NOT NULL,
        created_at TEXT    NOT NULL,
        expires_at TEXT    NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Supervisor ↔ trainee assignments. Many-to-many so one supervisor
      // can watch multiple trainees and one trainee can have multiple
      // supervisors (e.g. primary + secondary).
      `CREATE TABLE IF NOT EXISTS supervisor_trainees (
        supervisor_id TEXT NOT NULL,
        trainee_id    TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        PRIMARY KEY (supervisor_id, trainee_id),
        FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (trainee_id)    REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,

      `INSERT OR IGNORE INTO schema_version (version) VALUES (1)`,
    ],
  },
  {
    // v2 — collapse the role hierarchy to just admin | user. The old
    // 'supervisor' / 'trainee' values are mapped to 'user'. We rebuild
    // the table because SQLite can't drop a CHECK constraint in place.
    // The supervisor_trainees table is left in place but no longer
    // referenced — supervision is now per-case (see local v4).
    version: 2,
    statements: [
      `CREATE TABLE users_new (
        id              TEXT    PRIMARY KEY NOT NULL,
        email           TEXT    NOT NULL UNIQUE,
        display_name    TEXT    NOT NULL,
        role            TEXT    NOT NULL CHECK (role IN ('admin','user')),
        password_hash   TEXT    NOT NULL,
        password_salt   TEXT    NOT NULL,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        disabled        INTEGER NOT NULL DEFAULT 0
      )`,
      `INSERT INTO users_new (id, email, display_name, role, password_hash, password_salt, created_at, updated_at, disabled)
        SELECT id, email, display_name,
               CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END,
               password_hash, password_salt, created_at, updated_at, disabled
          FROM users`,
      `DROP TABLE users`,
      `ALTER TABLE users_new RENAME TO users`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (2)`,
    ],
  },
];

export async function runServerMigrations(db: SQLiteDatabase): Promise<void> {
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
