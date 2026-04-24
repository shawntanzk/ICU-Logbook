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
  {
    // v3 — attach each log to its author so supervisors/trainees see
    // only records they're entitled to. Nullable so legacy rows remain
    // visible to admins (and to callers who run with no active user).
    version: 3,
    statements: [
      `ALTER TABLE case_logs ADD COLUMN owner_id TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN owner_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_case_logs_owner ON case_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_procedure_logs_owner ON procedure_logs(owner_id)`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (3)`,
    ],
  },
  {
    // v4 — per-case supervisor and observer references. A user sees a
    // case if they're its owner, supervisor, or observer (see AuthScope).
    // Both nullable so existing rows are unaffected and a case may have
    // neither (e.g. an unsupervised solo log).
    version: 4,
    statements: [
      `ALTER TABLE case_logs ADD COLUMN supervisor_user_id TEXT`,
      `ALTER TABLE case_logs ADD COLUMN observer_user_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_case_logs_supervisor ON case_logs(supervisor_user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_case_logs_observer ON case_logs(observer_user_id)`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (4)`,
    ],
  },
  {
    // v5 — mirror v4 onto procedure_logs so procedures also carry a
    // supervisor and observer, and a user can see procedures they
    // supervised or observed (not just owned).
    version: 5,
    statements: [
      `ALTER TABLE procedure_logs ADD COLUMN supervisor_user_id TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN observer_user_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_procedure_logs_supervisor ON procedure_logs(supervisor_user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_procedure_logs_observer ON procedure_logs(observer_user_id)`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (5)`,
    ],
  },
  {
    // v6 — approval workflow + off-system supervisor name.
    //   approved_by / approved_at    → set when a tagged supervisor
    //                                   approves the record; cleared on
    //                                   revoke.
    //   external_supervisor_name     → freeform name used when the
    //                                   supervisor has no account; in
    //                                   that case supervisor_user_id is
    //                                   null and approval is impossible
    //                                   (no account to act as approver).
    version: 6,
    statements: [
      `ALTER TABLE case_logs ADD COLUMN approved_by TEXT`,
      `ALTER TABLE case_logs ADD COLUMN approved_at TEXT`,
      `ALTER TABLE case_logs ADD COLUMN external_supervisor_name TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN approved_by TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN approved_at TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN external_supervisor_name TEXT`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (6)`,
    ],
  },
  {
    // v7 — sync bookkeeping. server_updated_at caches the last server
    // timestamp we saw, used to detect stale-local writes. deleted_at
    // is a soft-delete tombstone so a local delete syncs up without
    // confusing a conflicting remote edit. conflict is 1 when a push
    // was rejected; the UI surfaces these for manual resolution.
    version: 7,
    statements: [
      `ALTER TABLE case_logs ADD COLUMN server_updated_at TEXT`,
      `ALTER TABLE case_logs ADD COLUMN deleted_at TEXT`,
      `ALTER TABLE case_logs ADD COLUMN conflict INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE procedure_logs ADD COLUMN server_updated_at TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN deleted_at TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN conflict INTEGER NOT NULL DEFAULT 0`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (7)`,
    ],
  },
  {
    // v8 — push retry bookkeeping. A non-conflict sync error increments
    // sync_retry_count; SyncService skips rows that exceed MAX_RETRIES
    // so one failing row doesn't wedge the whole queue. sync_last_error
    // is surfaced in the Conflicts UI for debugging.
    version: 8,
    statements: [
      `ALTER TABLE case_logs ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE case_logs ADD COLUMN sync_last_error TEXT`,
      `ALTER TABLE procedure_logs ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE procedure_logs ADD COLUMN sync_last_error TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_case_logs_sync ON case_logs(synced, conflict)`,
      `CREATE INDEX IF NOT EXISTS idx_procedure_logs_sync ON procedure_logs(synced, conflict)`,
      `INSERT OR IGNORE INTO schema_version (version) VALUES (8)`,
    ],
  },
  {
    // v9 — full parity with NW Deanery spreadsheet.
    // Adds patient demographics, episode classification, outcome, teaching,
    // and expanded semantic-layer columns to case_logs.
    // Also upgrades supervision to the 5-level ICM scale (old 3-level values
    // are kept as-is; the UI/service layer maps them on read).
    version: 9,
    statements: [
      // Patient demographics (no PII — age string only, no DOB)
      `ALTER TABLE case_logs ADD COLUMN patient_age TEXT`,           // e.g. '45', '2/12', '1/52'
      `ALTER TABLE case_logs ADD COLUMN patient_sex TEXT`,           // M / F / Other / Unknown

      // Episode classification
      `ALTER TABLE case_logs ADD COLUMN case_number TEXT`,
      `ALTER TABLE case_logs ADD COLUMN primary_specialty TEXT`,
      `ALTER TABLE case_logs ADD COLUMN level_of_care TEXT`,         // '1' | '2' | '3'
      `ALTER TABLE case_logs ADD COLUMN admitted INTEGER`,           // 0 | 1 | NULL
      `ALTER TABLE case_logs ADD COLUMN cardiac_arrest INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE case_logs ADD COLUMN involvement TEXT`,            // major | minor | procedure_only
      `ALTER TABLE case_logs ADD COLUMN reviewed_again INTEGER NOT NULL DEFAULT 0`,

      // Outcome / communication
      `ALTER TABLE case_logs ADD COLUMN outcome TEXT`,
      `ALTER TABLE case_logs ADD COLUMN communicated_with_relatives INTEGER NOT NULL DEFAULT 0`,

      // Teaching
      `ALTER TABLE case_logs ADD COLUMN teaching_delivered INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE case_logs ADD COLUMN teaching_recipient TEXT`,

      // Expanded semantic layer
      `ALTER TABLE case_logs ADD COLUMN specialty_coded TEXT`,       // JSON CodedValue | null
      `ALTER TABLE case_logs ADD COLUMN level_of_care_coded TEXT`,   // JSON CodedValue | null
      `ALTER TABLE case_logs ADD COLUMN outcome_coded TEXT`,         // JSON CodedValue | null

      // Indices
      `CREATE INDEX IF NOT EXISTS idx_case_logs_specialty ON case_logs(primary_specialty)`,
      `CREATE INDEX IF NOT EXISTS idx_case_logs_level ON case_logs(level_of_care)`,
      `CREATE INDEX IF NOT EXISTS idx_case_logs_outcome ON case_logs(outcome)`,
      `CREATE INDEX IF NOT EXISTS idx_case_logs_date ON case_logs(date)`,

      `INSERT OR IGNORE INTO schema_version (version) VALUES (9)`,
    ],
  },
  {
    // v10 — new sub-entity tables: airway_logs, arterial_line_logs, cvc_logs,
    // uss_logs, regional_block_logs, ward_review_logs, transfer_logs,
    // ed_attendance_logs, medicine_placement_logs.
    // All tables follow the same governance pattern as case_logs:
    // owner_id, supervisor_user_id, approved_by/at, synced/conflict/deleted_at,
    // schema_version, provenance, quality, consent_status, license.
    version: 10,
    statements: [
      // ── airway_logs ──────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS airway_logs (
        id                       TEXT PRIMARY KEY NOT NULL,
        case_id                  TEXT,
        date                     TEXT NOT NULL,
        is_rsi                   INTEGER NOT NULL DEFAULT 0,
        induction_agent          TEXT,
        induction_agent_other    TEXT,
        neuromuscular_agent      TEXT,
        neuromuscular_agent_other TEXT,
        device                   TEXT,
        tube_size                REAL,
        tube_type                TEXT,
        attempts                 INTEGER NOT NULL DEFAULT 1,
        success                  INTEGER NOT NULL DEFAULT 1,
        cormack_lehane_grade     TEXT,
        dae_used                 INTEGER NOT NULL DEFAULT 0,
        dae_items                TEXT NOT NULL DEFAULT '[]',
        supervision_level        TEXT NOT NULL,
        supervisor_user_id       TEXT,
        external_supervisor_name TEXT,
        notes                    TEXT,
        owner_id                 TEXT,
        approved_by              TEXT,
        approved_at              TEXT,
        created_at               TEXT NOT NULL,
        updated_at               TEXT NOT NULL,
        synced                   INTEGER NOT NULL DEFAULT 0,
        conflict                 INTEGER NOT NULL DEFAULT 0,
        deleted_at               TEXT,
        server_updated_at        TEXT,
        sync_retry_count         INTEGER NOT NULL DEFAULT 0,
        sync_last_error          TEXT,
        schema_version           TEXT NOT NULL DEFAULT '3.0.0',
        device_coded             TEXT,
        supervision_level_coded  TEXT,
        provenance               TEXT,
        quality                  TEXT,
        consent_status           TEXT NOT NULL DEFAULT 'anonymous',
        license                  TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0',
        FOREIGN KEY (case_id) REFERENCES case_logs(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_airway_logs_case ON airway_logs(case_id)`,
      `CREATE INDEX IF NOT EXISTS idx_airway_logs_owner ON airway_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_airway_logs_sync ON airway_logs(synced, conflict)`,

      // ── arterial_line_logs ───────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS arterial_line_logs (
        id                       TEXT PRIMARY KEY NOT NULL,
        case_id                  TEXT,
        date                     TEXT NOT NULL,
        site                     TEXT NOT NULL,
        uss_guided               INTEGER NOT NULL DEFAULT 0,
        attempts                 INTEGER NOT NULL DEFAULT 1,
        success                  INTEGER NOT NULL DEFAULT 1,
        complications            TEXT,
        supervision_level        TEXT NOT NULL,
        supervisor_user_id       TEXT,
        external_supervisor_name TEXT,
        owner_id                 TEXT,
        approved_by              TEXT,
        approved_at              TEXT,
        created_at               TEXT NOT NULL,
        updated_at               TEXT NOT NULL,
        synced                   INTEGER NOT NULL DEFAULT 0,
        conflict                 INTEGER NOT NULL DEFAULT 0,
        deleted_at               TEXT,
        server_updated_at        TEXT,
        sync_retry_count         INTEGER NOT NULL DEFAULT 0,
        sync_last_error          TEXT,
        schema_version           TEXT NOT NULL DEFAULT '3.0.0',
        site_coded               TEXT,
        supervision_level_coded  TEXT,
        provenance               TEXT,
        quality                  TEXT,
        consent_status           TEXT NOT NULL DEFAULT 'anonymous',
        license                  TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0',
        FOREIGN KEY (case_id) REFERENCES case_logs(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_case ON arterial_line_logs(case_id)`,
      `CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_owner ON arterial_line_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_sync ON arterial_line_logs(synced, conflict)`,

      // ── cvc_logs ─────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS cvc_logs (
        id                       TEXT PRIMARY KEY NOT NULL,
        case_id                  TEXT,
        date                     TEXT NOT NULL,
        site                     TEXT NOT NULL,
        is_second_cvc            INTEGER NOT NULL DEFAULT 0,
        is_vascath               INTEGER NOT NULL DEFAULT 0,
        uss_guided               INTEGER NOT NULL DEFAULT 0,
        attempts                 INTEGER NOT NULL DEFAULT 1,
        success                  INTEGER NOT NULL DEFAULT 1,
        complications            TEXT,
        supervision_level        TEXT NOT NULL,
        supervisor_user_id       TEXT,
        external_supervisor_name TEXT,
        owner_id                 TEXT,
        approved_by              TEXT,
        approved_at              TEXT,
        created_at               TEXT NOT NULL,
        updated_at               TEXT NOT NULL,
        synced                   INTEGER NOT NULL DEFAULT 0,
        conflict                 INTEGER NOT NULL DEFAULT 0,
        deleted_at               TEXT,
        server_updated_at        TEXT,
        sync_retry_count         INTEGER NOT NULL DEFAULT 0,
        sync_last_error          TEXT,
        schema_version           TEXT NOT NULL DEFAULT '3.0.0',
        site_coded               TEXT,
        supervision_level_coded  TEXT,
        provenance               TEXT,
        quality                  TEXT,
        consent_status           TEXT NOT NULL DEFAULT 'anonymous',
        license                  TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0',
        FOREIGN KEY (case_id) REFERENCES case_logs(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cvc_logs_case ON cvc_logs(case_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cvc_logs_owner ON cvc_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cvc_logs_sync ON cvc_logs(synced, conflict)`,

      // ── uss_logs ──────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS uss_logs (
        id                       TEXT PRIMARY KEY NOT NULL,
        case_id                  TEXT,
        date                     TEXT NOT NULL,
        study_type               TEXT NOT NULL,
        performed                INTEGER NOT NULL DEFAULT 1,
        formal_report            INTEGER NOT NULL DEFAULT 0,
        findings                 TEXT,
        supervision_level        TEXT NOT NULL,
        supervisor_user_id       TEXT,
        external_supervisor_name TEXT,
        owner_id                 TEXT,
        approved_by              TEXT,
        approved_at              TEXT,
        created_at               TEXT NOT NULL,
        updated_at               TEXT NOT NULL,
        synced                   INTEGER NOT NULL DEFAULT 0,
        conflict                 INTEGER NOT NULL DEFAULT 0,
        deleted_at               TEXT,
        server_updated_at        TEXT,
        sync_retry_count         INTEGER NOT NULL DEFAULT 0,
        sync_last_error          TEXT,
        schema_version           TEXT NOT NULL DEFAULT '3.0.0',
        study_type_coded         TEXT,
        supervision_level_coded  TEXT,
        provenance               TEXT,
        quality                  TEXT,
        consent_status           TEXT NOT NULL DEFAULT 'anonymous',
        license                  TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0',
        FOREIGN KEY (case_id) REFERENCES case_logs(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_uss_logs_case ON uss_logs(case_id)`,
      `CREATE INDEX IF NOT EXISTS idx_uss_logs_owner ON uss_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_uss_logs_sync ON uss_logs(synced, conflict)`,

      // ── regional_block_logs ───────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS regional_block_logs (
        id                       TEXT PRIMARY KEY NOT NULL,
        case_id                  TEXT,
        date                     TEXT NOT NULL,
        block_type               TEXT NOT NULL,
        block_type_other         TEXT,
        uss_guided               INTEGER NOT NULL DEFAULT 1,
        catheter                 INTEGER NOT NULL DEFAULT 0,
        attempts                 INTEGER NOT NULL DEFAULT 1,
        success                  INTEGER NOT NULL DEFAULT 1,
        complications            TEXT,
        supervision_level        TEXT NOT NULL,
        supervisor_user_id       TEXT,
        external_supervisor_name TEXT,
        owner_id                 TEXT,
        approved_by              TEXT,
        approved_at              TEXT,
        created_at               TEXT NOT NULL,
        updated_at               TEXT NOT NULL,
        synced                   INTEGER NOT NULL DEFAULT 0,
        conflict                 INTEGER NOT NULL DEFAULT 0,
        deleted_at               TEXT,
        server_updated_at        TEXT,
        sync_retry_count         INTEGER NOT NULL DEFAULT 0,
        sync_last_error          TEXT,
        schema_version           TEXT NOT NULL DEFAULT '3.0.0',
        block_type_coded         TEXT,
        supervision_level_coded  TEXT,
        provenance               TEXT,
        quality                  TEXT,
        consent_status           TEXT NOT NULL DEFAULT 'anonymous',
        license                  TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0',
        FOREIGN KEY (case_id) REFERENCES case_logs(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_regional_block_logs_case ON regional_block_logs(case_id)`,
      `CREATE INDEX IF NOT EXISTS idx_regional_block_logs_owner ON regional_block_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_regional_block_logs_sync ON regional_block_logs(synced, conflict)`,

      // ── ward_review_logs ─────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS ward_review_logs (
        id                            TEXT PRIMARY KEY NOT NULL,
        date                          TEXT NOT NULL,
        patient_age                   TEXT,
        patient_sex                   TEXT,
        referring_specialty           TEXT,
        diagnosis                     TEXT NOT NULL,
        icd10_code                    TEXT NOT NULL DEFAULT '',
        review_outcome                TEXT NOT NULL DEFAULT 'advice_only',
        communicated_with_relatives   INTEGER NOT NULL DEFAULT 0,
        cobatrice_domains             TEXT NOT NULL DEFAULT '[]',
        reflection                    TEXT,
        supervision_level             TEXT NOT NULL,
        supervisor_user_id            TEXT,
        external_supervisor_name      TEXT,
        owner_id                      TEXT,
        approved_by                   TEXT,
        approved_at                   TEXT,
        created_at                    TEXT NOT NULL,
        updated_at                    TEXT NOT NULL,
        synced                        INTEGER NOT NULL DEFAULT 0,
        conflict                      INTEGER NOT NULL DEFAULT 0,
        deleted_at                    TEXT,
        server_updated_at             TEXT,
        sync_retry_count              INTEGER NOT NULL DEFAULT 0,
        sync_last_error               TEXT,
        schema_version                TEXT NOT NULL DEFAULT '3.0.0',
        diagnosis_coded               TEXT,
        cobatrice_domains_coded       TEXT NOT NULL DEFAULT '[]',
        supervision_level_coded       TEXT,
        provenance                    TEXT,
        quality                       TEXT,
        consent_status                TEXT NOT NULL DEFAULT 'anonymous',
        license                       TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ward_review_logs_owner ON ward_review_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ward_review_logs_sync ON ward_review_logs(synced, conflict)`,

      // ── transfer_logs ─────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS transfer_logs (
        id                            TEXT PRIMARY KEY NOT NULL,
        date                          TEXT NOT NULL,
        patient_age                   TEXT,
        patient_sex                   TEXT,
        diagnosis                     TEXT NOT NULL,
        icd10_code                    TEXT NOT NULL DEFAULT '',
        transfer_type                 TEXT NOT NULL DEFAULT 'inter_hospital',
        transfer_mode                 TEXT NOT NULL DEFAULT 'land_ambulance',
        from_location                 TEXT,
        to_location                   TEXT,
        level_of_care                 TEXT,
        procedures_during_transfer    TEXT NOT NULL DEFAULT '[]',
        communicated_with_relatives   INTEGER NOT NULL DEFAULT 0,
        reflection                    TEXT,
        supervision_level             TEXT NOT NULL,
        supervisor_user_id            TEXT,
        external_supervisor_name      TEXT,
        owner_id                      TEXT,
        approved_by                   TEXT,
        approved_at                   TEXT,
        created_at                    TEXT NOT NULL,
        updated_at                    TEXT NOT NULL,
        synced                        INTEGER NOT NULL DEFAULT 0,
        conflict                      INTEGER NOT NULL DEFAULT 0,
        deleted_at                    TEXT,
        server_updated_at             TEXT,
        sync_retry_count              INTEGER NOT NULL DEFAULT 0,
        sync_last_error               TEXT,
        schema_version                TEXT NOT NULL DEFAULT '3.0.0',
        diagnosis_coded               TEXT,
        supervision_level_coded       TEXT,
        provenance                    TEXT,
        quality                       TEXT,
        consent_status                TEXT NOT NULL DEFAULT 'anonymous',
        license                       TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_transfer_logs_owner ON transfer_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transfer_logs_sync ON transfer_logs(synced, conflict)`,

      // ── ed_attendance_logs ────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS ed_attendance_logs (
        id                            TEXT PRIMARY KEY NOT NULL,
        date                          TEXT NOT NULL,
        patient_age                   TEXT,
        patient_sex                   TEXT,
        diagnosis                     TEXT NOT NULL,
        icd10_code                    TEXT NOT NULL DEFAULT '',
        icu_admission                 INTEGER NOT NULL DEFAULT 0,
        presenting_category           TEXT,
        cardiac_arrest                INTEGER NOT NULL DEFAULT 0,
        communicated_with_relatives   INTEGER NOT NULL DEFAULT 0,
        cobatrice_domains             TEXT NOT NULL DEFAULT '[]',
        reflection                    TEXT,
        supervision_level             TEXT NOT NULL,
        supervisor_user_id            TEXT,
        external_supervisor_name      TEXT,
        owner_id                      TEXT,
        approved_by                   TEXT,
        approved_at                   TEXT,
        created_at                    TEXT NOT NULL,
        updated_at                    TEXT NOT NULL,
        synced                        INTEGER NOT NULL DEFAULT 0,
        conflict                      INTEGER NOT NULL DEFAULT 0,
        deleted_at                    TEXT,
        server_updated_at             TEXT,
        sync_retry_count              INTEGER NOT NULL DEFAULT 0,
        sync_last_error               TEXT,
        schema_version                TEXT NOT NULL DEFAULT '3.0.0',
        diagnosis_coded               TEXT,
        cobatrice_domains_coded       TEXT NOT NULL DEFAULT '[]',
        supervision_level_coded       TEXT,
        provenance                    TEXT,
        quality                       TEXT,
        consent_status                TEXT NOT NULL DEFAULT 'anonymous',
        license                       TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ed_attendance_logs_owner ON ed_attendance_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ed_attendance_logs_sync ON ed_attendance_logs(synced, conflict)`,

      // ── medicine_placement_logs ───────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS medicine_placement_logs (
        id                            TEXT PRIMARY KEY NOT NULL,
        start_date                    TEXT NOT NULL,
        end_date                      TEXT,
        specialty                     TEXT NOT NULL,
        hospital                      TEXT,
        ward                          TEXT,
        patient_count                 INTEGER,
        teaching_delivered            INTEGER NOT NULL DEFAULT 0,
        teaching_recipient            TEXT,
        cobatrice_domains             TEXT NOT NULL DEFAULT '[]',
        reflection                    TEXT,
        supervision_level             TEXT NOT NULL,
        supervisor_user_id            TEXT,
        external_supervisor_name      TEXT,
        owner_id                      TEXT,
        approved_by                   TEXT,
        approved_at                   TEXT,
        created_at                    TEXT NOT NULL,
        updated_at                    TEXT NOT NULL,
        synced                        INTEGER NOT NULL DEFAULT 0,
        conflict                      INTEGER NOT NULL DEFAULT 0,
        deleted_at                    TEXT,
        server_updated_at             TEXT,
        sync_retry_count              INTEGER NOT NULL DEFAULT 0,
        sync_last_error               TEXT,
        schema_version                TEXT NOT NULL DEFAULT '3.0.0',
        specialty_coded               TEXT,
        cobatrice_domains_coded       TEXT NOT NULL DEFAULT '[]',
        supervision_level_coded       TEXT,
        provenance                    TEXT,
        quality                       TEXT,
        consent_status                TEXT NOT NULL DEFAULT 'anonymous',
        license                       TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_medicine_placement_logs_owner ON medicine_placement_logs(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_medicine_placement_logs_sync ON medicine_placement_logs(synced, conflict)`,

      `INSERT OR IGNORE INTO schema_version (version) VALUES (10)`,
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
