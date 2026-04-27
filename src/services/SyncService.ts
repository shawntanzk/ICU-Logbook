import { ISyncService, SyncResult, SyncStatus } from './DataService';
import { getDatabase } from '../database/client';
import { supabase } from './supabase';
import { isOfflineOnly } from '../store/offlineStore';
import { isGuestMode } from '../store/guestStore';
import { getAuthState } from './authState';
import { getSetting, setSetting } from './SettingsService';
import { nowISO } from '../utils/dateUtils';
import { reportError } from './errorReporting';

// Two-way sync between local SQLite and Supabase.
//
// Push: every row with synced=0 is upserted to Supabase. Soft-deleted
// rows (deleted_at != null) are pushed the same way — Postgres just
// stores the tombstone, and other clients learn about the delete on
// their next pull.
//
// Pull: rows whose server_updated_at exceeds our last-pull watermark
// are fetched in pages of PAGE_SIZE and inserted-or-replaced into the
// local DB, except where the local row has unsynced edits — in that
// case we set conflict=1 and leave the local row alone, so the user
// can resolve manually.
//
// Conflict policy: last-writer-wins by server_updated_at. Supabase is
// authoritative once a row is pushed; until then, the local copy is.
//
// Push errors: transient network / 5xx errors bump a retry counter
// and back off. A row only gets flagged conflict=1 when Postgres
// reports a unique-violation or the response comes back with a
// server_updated_at newer than the client knew about.

const LAST_PULL_KEY = 'sync_last_pull_at';
const LAST_SYNC_KEY = 'sync_last_synced_at';
const PAGE_SIZE = 500;
const MAX_RETRIES = 5;

const CASE_COLUMNS = [
  'id', 'date', 'diagnosis', 'icd10_code', 'organ_systems', 'cobatrice_domains',
  'supervision_level', 'notes', 'reflection', 'created_at', 'updated_at',
  'schema_version', 'diagnosis_coded', 'organ_systems_coded',
  'cobatrice_domains_coded', 'supervision_level_coded',
  'provenance', 'quality', 'consent_status', 'license', 'owner_id',
  'supervisor_user_id', 'observer_user_id', 'external_supervisor_name',
  'approved_by', 'approved_at', 'deleted_at',
];

const PROC_COLUMNS = [
  'id', 'case_id', 'procedure_type', 'attempts', 'success', 'complications',
  'created_at', 'updated_at',
  'schema_version', 'procedure_type_coded', 'provenance', 'quality',
  'consent_status', 'license', 'owner_id', 'supervisor_user_id',
  'observer_user_id', 'external_supervisor_name',
  'approved_by', 'approved_at', 'deleted_at',
];

// JSON-typed columns on Supabase (jsonb). We store these as TEXT in
// SQLite and need to parse before pushing / stringify after pulling.
const CASE_JSON_COLS = new Set([
  'organ_systems', 'cobatrice_domains', 'diagnosis_coded',
  'organ_systems_coded', 'cobatrice_domains_coded', 'supervision_level_coded',
  'provenance', 'quality',
]);
const PROC_JSON_COLS = new Set([
  'procedure_type_coded', 'provenance', 'quality',
]);

type TableName = 'case_logs' | 'procedure_logs';

function safeParse(s: unknown): unknown {
  if (typeof s !== 'string' || s === '') return s;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function rowToPayload(row: Record<string, unknown>, jsonCols: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = jsonCols.has(k) ? safeParse(v) : v;
  }
  // success in SQLite is INTEGER, Supabase column is boolean
  if ('success' in out) out.success = !!out.success;
  return out;
}

function payloadToRow(payload: Record<string, unknown>, jsonCols: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (jsonCols.has(k)) {
      out[k] = v == null ? null : (typeof v === 'string' ? v : JSON.stringify(v));
    } else if (k === 'success') {
      out[k] = v ? 1 : 0;
    } else {
      out[k] = v ?? null;
    }
  }
  return out;
}

function placeholders(cols: string[]): string {
  return cols.map(() => '?').join(', ');
}

// Postgres error codes and message fragments that indicate a genuine
// row-level conflict (as opposed to a transient failure we should
// retry). Expand as new edge cases surface.
const CONFLICT_HINTS = [
  '23505',            // unique_violation
  'server_updated_at',
  'guard_approval',
];

function isConflictError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = err.code ?? '';
  const msg = (err.message ?? '').toLowerCase();
  return CONFLICT_HINTS.some((h) => code === h || msg.includes(h.toLowerCase()));
}

async function pushTable(
  tableName: TableName,
  _columns: string[],
  jsonCols: Set<string>,
): Promise<{ synced: number; failed: number; conflicts: number }> {
  const db = await getDatabase();
  // Skip rows that have failed too many times — user can force-reset
  // from the Conflict screen.
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${tableName} WHERE synced = 0 AND conflict = 0 AND (sync_retry_count IS NULL OR sync_retry_count < ?)`,
    [MAX_RETRIES]
  );
  if (rows.length === 0) return { synced: 0, failed: 0, conflicts: 0 };

  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  for (const row of rows) {
    const payload = rowToPayload(row, jsonCols);
    const { data, error } = await supabase
      .from(tableName)
      .upsert(payload, { onConflict: 'id' })
      .select('server_updated_at')
      .single();
    if (error) {
      if (isConflictError(error)) {
        conflicts++;
        await db.runAsync(
          `UPDATE ${tableName} SET conflict = 1, sync_last_error = ? WHERE id = ?`,
          [error.message ?? 'conflict', row.id as string]
        );
      } else {
        failed++;
        reportError(error, { op: 'pushTable', tableName, rowId: String(row.id) });
        await db.runAsync(
          `UPDATE ${tableName} SET sync_retry_count = COALESCE(sync_retry_count, 0) + 1, sync_last_error = ? WHERE id = ?`,
          [error.message ?? 'unknown', row.id as string]
        );
      }
      continue;
    }
    const serverUpdatedAt = (data as { server_updated_at?: string } | null)?.server_updated_at ?? nowISO();
    await db.runAsync(
      `UPDATE ${tableName} SET synced = 1, conflict = 0, sync_retry_count = 0, sync_last_error = NULL, server_updated_at = ? WHERE id = ?`,
      [serverUpdatedAt, row.id as string]
    );
    synced++;
  }
  return { synced, failed, conflicts };
}

async function pullTable(
  tableName: TableName,
  columns: string[],
  jsonCols: Set<string>,
  since: string | null,
): Promise<number> {
  const db = await getDatabase();
  const selectList = columns.concat('server_updated_at').join(', ');

  // Keyset paginate on server_updated_at so we can't miss rows that
  // arrive mid-pull. Supabase's `.range()` is 0-indexed inclusive.
  let applied = 0;
  let offset = 0;
  let highestSeen = since;
  // Safety cap — if something's wrong don't loop forever.
  const MAX_PAGES = 1000;

  for (let page = 0; page < MAX_PAGES; page++) {
    let query = supabase
      .from(tableName)
      .select(selectList)
      .order('server_updated_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (since) query = query.gt('server_updated_at', since);
    const { data, error } = await query;
    if (error) throw new Error(`Pull ${tableName} failed: ${error.message}`);
    const remoteRows = (data ?? []) as unknown as Record<string, unknown>[];
    if (remoteRows.length === 0) break;

    for (const remote of remoteRows) {
      const id = remote.id as string;
      const local = await db.getFirstAsync<{ id: string; updated_at: string; synced: number }>(
        `SELECT id, updated_at, synced FROM ${tableName} WHERE id = ?`,
        [id]
      );
      // Skip if local has unsynced edits — flag conflict and leave local alone.
      if (local && local.synced === 0) {
        await db.runAsync(`UPDATE ${tableName} SET conflict = 1 WHERE id = ?`, [id]);
        continue;
      }
      const localRow = payloadToRow(remote, jsonCols);
      const insertCols = [...columns, 'server_updated_at', 'synced', 'conflict'];
      const values = insertCols.map((c) => {
        if (c === 'synced') return 1;
        if (c === 'conflict') return 0;
        if (c === 'server_updated_at') return remote.server_updated_at ?? null;
        return localRow[c] ?? null;
      });
      await db.runAsync(
        `INSERT OR REPLACE INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders(insertCols)})`,
        values as (string | number | null)[]
      );
      applied++;
      const sua = remote.server_updated_at as string | undefined;
      if (sua && (!highestSeen || sua > highestSeen)) highestSeen = sua;
    }

    // Less than a full page means we're done.
    if (remoteRows.length < PAGE_SIZE) break;
    offset += remoteRows.length;
  }
  return applied;
}

class SyncServiceImpl implements ISyncService {
  // Single entry point — early-returns when offline-only or signed-out so
  // callers can fire-and-forget after every write without extra checks.
  async syncPending(): Promise<SyncResult> {
    if (isOfflineOnly()) return { synced: 0, failed: 0, pending: 0 };
    if (isGuestMode()) return { synced: 0, failed: 0, pending: 0 };
    const { userId } = getAuthState();
    if (!userId) return { synced: 0, failed: 0, pending: 0 };

    const since = await getSetting(LAST_PULL_KEY);

    // Push first so a freshly-edited row is uploaded before the pull
    // overwrites it with whatever the server thinks is current.
    const pushedCases = await pushTable('case_logs', CASE_COLUMNS, CASE_JSON_COLS);
    const pushedProcs = await pushTable('procedure_logs', PROC_COLUMNS, PROC_JSON_COLS);

    const pulledCases = await pullTable('case_logs', CASE_COLUMNS, CASE_JSON_COLS, since);
    const pulledProcs = await pullTable('procedure_logs', PROC_COLUMNS, PROC_JSON_COLS, since);

    const now = nowISO();
    await setSetting(LAST_PULL_KEY, now);
    await setSetting(LAST_SYNC_KEY, now);

    const synced = pushedCases.synced + pushedProcs.synced + pulledCases + pulledProcs;
    const failed = pushedCases.failed + pushedProcs.failed;
    const status = await this.getSyncStatus();
    return { synced, failed, pending: status.pendingCount };
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const db = await getDatabase();
    const pendingCases = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM case_logs WHERE synced = 0 AND conflict = 0'
    );
    const pendingProcs = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM procedure_logs WHERE synced = 0 AND conflict = 0'
    );
    const conflictCases = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM case_logs WHERE conflict = 1'
    );
    const conflictProcs = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM procedure_logs WHERE conflict = 1'
    );
    const lastSyncedAt = await getSetting(LAST_SYNC_KEY);
    return {
      lastSyncedAt,
      pendingCount: (pendingCases?.count ?? 0) + (pendingProcs?.count ?? 0),
      conflictCount: (conflictCases?.count ?? 0) + (conflictProcs?.count ?? 0),
    };
  }

  // List rows that are currently flagged conflict=1 so the UI can show
  // a resolution screen. Returns a flat list across both tables.
  async listConflicts(): Promise<Array<{
    table: TableName;
    id: string;
    updated_at: string;
    server_updated_at: string | null;
    sync_last_error: string | null;
  }>> {
    const db = await getDatabase();
    const caseRows = await db.getAllAsync<{
      id: string;
      updated_at: string;
      server_updated_at: string | null;
      sync_last_error: string | null;
    }>(
      'SELECT id, updated_at, server_updated_at, sync_last_error FROM case_logs WHERE conflict = 1'
    );
    const procRows = await db.getAllAsync<{
      id: string;
      updated_at: string;
      server_updated_at: string | null;
      sync_last_error: string | null;
    }>(
      'SELECT id, updated_at, server_updated_at, sync_last_error FROM procedure_logs WHERE conflict = 1'
    );
    return [
      ...caseRows.map((r) => ({ ...r, table: 'case_logs' as const })),
      ...procRows.map((r) => ({ ...r, table: 'procedure_logs' as const })),
    ];
  }

  // Resolve "keep local": mark synced=0, clear conflict, and push on
  // next sync — this wins the next round.
  async resolveKeepLocal(tableName: TableName, id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${tableName} SET conflict = 0, synced = 0, sync_retry_count = 0 WHERE id = ?`,
      [id]
    );
  }

  // Force a full 1:1 mirror of Supabase.
  //
  // Sequence:
  //   1. Push any locally-pending rows first so edits aren't lost.
  //   2. Wipe the pull watermark so the next pull fetches everything.
  //   3. Delete all local case_logs and procedure_logs (they'll be
  //      replaced by a full pull in step 4).
  //   4. Pull all rows from Supabase — no `since` filter.
  //   5. Update sync timestamps and reload UI stores.
  //
  // Hard-deletes done directly in Supabase are handled automatically:
  // those rows are simply absent from the pull response and are never
  // re-inserted locally.
  async forceFullSyncFromServer(): Promise<SyncResult> {
    if (isOfflineOnly()) return { synced: 0, failed: 0, pending: 0 };
    if (isGuestMode()) return { synced: 0, failed: 0, pending: 0 };
    const { userId } = getAuthState();
    if (!userId) return { synced: 0, failed: 0, pending: 0 };

    const db = await getDatabase();

    // 1. Push pending rows so any local edits reach the server first.
    const pushedCases = await pushTable('case_logs', CASE_COLUMNS, CASE_JSON_COLS);
    const pushedProcs = await pushTable('procedure_logs', PROC_COLUMNS, PROC_JSON_COLS);

    // 2. Reset the pull watermark.
    await db.runAsync(`DELETE FROM app_settings WHERE key = ?`, [LAST_PULL_KEY]);

    // 3. Wipe local clinical tables — the full pull will repopulate them.
    await db.runAsync(`DELETE FROM case_logs`);
    await db.runAsync(`DELETE FROM procedure_logs`);

    // 4. Pull everything (since = null ⟹ no timestamp filter).
    const pulledCases = await pullTable('case_logs', CASE_COLUMNS, CASE_JSON_COLS, null);
    const pulledProcs = await pullTable('procedure_logs', PROC_COLUMNS, PROC_JSON_COLS, null);

    // 5. Stamp new watermark.
    const now = nowISO();
    await setSetting(LAST_PULL_KEY, now);
    await setSetting(LAST_SYNC_KEY, now);

    const synced = pushedCases.synced + pushedProcs.synced + pulledCases + pulledProcs;
    const failed = pushedCases.failed + pushedProcs.failed;
    const status = await this.getSyncStatus();
    return { synced, failed, pending: status.pendingCount };
  }

  // Resolve "keep remote": pull the server row fresh and replace local.
  async resolveKeepRemote(tableName: TableName, id: string): Promise<void> {
    const db = await getDatabase();
    const jsonCols = tableName === 'case_logs' ? CASE_JSON_COLS : PROC_JSON_COLS;
    const columns = tableName === 'case_logs' ? CASE_COLUMNS : PROC_COLUMNS;
    const { data, error } = await supabase
      .from(tableName)
      .select(columns.concat('server_updated_at').join(', '))
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      // Remote row is gone — treat as delete.
      await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      return;
    }
    const row = payloadToRow(data as unknown as Record<string, unknown>, jsonCols);
    const insertCols = [...columns, 'server_updated_at', 'synced', 'conflict'];
    const values = insertCols.map((c) => {
      if (c === 'synced') return 1;
      if (c === 'conflict') return 0;
      if (c === 'server_updated_at') return (data as { server_updated_at?: string }).server_updated_at ?? null;
      return row[c] ?? null;
    });
    await db.runAsync(
      `INSERT OR REPLACE INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders(insertCols)})`,
      values as (string | number | null)[]
    );
  }
}

export const SyncService = new SyncServiceImpl();
