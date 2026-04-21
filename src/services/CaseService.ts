import { getDatabase } from '../database/client';
import { CaseLog, CaseLogInput } from '../models/CaseLog';
import { IDataService } from './DataService';
import { generateUUID } from '../utils/uuid';
import { nowISO, startOfMonthISO } from '../utils/dateUtils';
import { icd10ToCoded } from '../data/icd10';
import { organSystemToCoded } from '../data/organSystems';
import { cobatriceToCoded } from '../data/cobatrice';
import { supervisionToCoded } from '../data/supervision';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { scoreCase } from './QualityService';
import { caseScopedWhere, currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

// SQLite row shape. v2 adds nine JSON/metadata columns alongside the
// original v1 columns. Old columns stay authoritative for queries the UI
// already runs (date, diagnosis, etc.); the coded columns are what the
// export pipeline reads.
interface CaseRow {
  id: string;
  date: string;
  diagnosis: string;
  icd10_code: string;
  organ_systems: string;
  cobatrice_domains: string;
  supervision_level: string;
  reflection: string;
  created_at: string;
  updated_at: string;
  synced: number;
  schema_version: string;
  diagnosis_coded: string | null;
  organ_systems_coded: string;
  cobatrice_domains_coded: string;
  supervision_level_coded: string | null;
  provenance: string | null;
  quality: string | null;
  consent_status: string;
  license: string;
  owner_id: string | null;
  supervisor_user_id: string | null;
  observer_user_id: string | null;
  external_supervisor_name: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function rowToModel(row: CaseRow): CaseLog {
  return {
    id: row.id,
    ownerId: row.owner_id,
    supervisorUserId: row.supervisor_user_id,
    observerUserId: row.observer_user_id,
    externalSupervisorName: row.external_supervisor_name,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    date: row.date,
    diagnosis: row.diagnosis,
    icd10Code: row.icd10_code,
    organSystems: parseJSON<string[]>(row.organ_systems, []),
    cobatriceDomains: parseJSON<string[]>(row.cobatrice_domains, []),
    supervisionLevel: row.supervision_level as CaseLog['supervisionLevel'],
    reflection: row.reflection,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: row.synced === 1,

    schemaVersion: row.schema_version || '1.0.0',
    diagnosisCoded: parseJSON<CodedValue | null>(row.diagnosis_coded, null),
    organSystemsCoded: parseJSON<CodedValue[]>(row.organ_systems_coded, []),
    cobatriceDomainsCoded: parseJSON<CodedValue[]>(row.cobatrice_domains_coded, []),
    supervisionLevelCoded:
      parseJSON<CodedValue | null>(row.supervision_level_coded, null) ??
      supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, {
      appVersion: '0.0.0',
      schemaVersion: '1.0.0',
      deviceId: 'unknown',
      platform: 'ios' as const,
      locale: 'en-GB',
      timezone: 'UTC',
    }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as CaseLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

// Derive all CodedValue fields from the raw user input. Kept pure so the
// unit tests can feed in any CaseLogInput shape.
function codify(input: CaseLogInput): Pick<
  CaseLog,
  'diagnosisCoded' | 'organSystemsCoded' | 'cobatriceDomainsCoded' | 'supervisionLevelCoded'
> {
  return {
    diagnosisCoded: input.icd10Code ? icd10ToCoded(input.icd10Code) : null,
    organSystemsCoded: input.organSystems
      .map(organSystemToCoded)
      .filter((v): v is CodedValue => v !== null),
    cobatriceDomainsCoded: input.cobatriceDomains
      .map(cobatriceToCoded)
      .filter((v): v is CodedValue => v !== null),
    supervisionLevelCoded: supervisionToCoded(input.supervisionLevel)!,
  };
}

class CaseServiceImpl implements IDataService<CaseLog, CaseLogInput> {
  async findAll(): Promise<CaseLog[]> {
    const db = await getDatabase();
    const scope = caseScopedWhere();
    const rows = await db.getAllAsync<CaseRow>(
      `SELECT * FROM case_logs WHERE deleted_at IS NULL AND ${scope.clause} ORDER BY date DESC, created_at DESC`,
      scope.params
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<CaseLog | null> {
    const db = await getDatabase();
    const scope = caseScopedWhere();
    const row = await db.getFirstAsync<CaseRow>(
      `SELECT * FROM case_logs WHERE id = ? AND deleted_at IS NULL AND ${scope.clause}`,
      [id, ...scope.params]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: CaseLogInput): Promise<CaseLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();

    const coded = codify(input);
    const provenance = await captureProvenance();
    const consent = await getConsent();

    // Quality needs the fully-constructed record, so compute on a draft.
    const draft: CaseLog = {
      ...input,
      id,
      ownerId: currentUserId(),
      createdAt: now,
      updatedAt: now,
      synced: false,
      approvedBy: null,
      approvedAt: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      ...coded,
      provenance,
      quality: { completeness: 0, codingConfidence: 0 },
      consentStatus: consent,
      license: DEFAULT_LICENSE,
    };
    const quality = scoreCase(draft);

    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO case_logs
        (id, date, diagnosis, icd10_code, organ_systems, cobatrice_domains,
         supervision_level, reflection, created_at, updated_at, synced,
         schema_version, diagnosis_coded, organ_systems_coded,
         cobatrice_domains_coded, supervision_level_coded,
         provenance, quality, consent_status, license, owner_id,
         supervisor_user_id, observer_user_id, external_supervisor_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.date,
        input.diagnosis,
        input.icd10Code ?? '',
        JSON.stringify(input.organSystems),
        JSON.stringify(input.cobatriceDomains),
        input.supervisionLevel,
        input.reflection ?? '',
        now,
        now,
        CURRENT_SCHEMA_VERSION,
        coded.diagnosisCoded ? JSON.stringify(coded.diagnosisCoded) : null,
        JSON.stringify(coded.organSystemsCoded),
        JSON.stringify(coded.cobatriceDomainsCoded),
        JSON.stringify(coded.supervisionLevelCoded),
        JSON.stringify(provenance),
        JSON.stringify(quality),
        consent,
        DEFAULT_LICENSE,
        currentUserId(),
        supervisorId,
        input.observerUserId ?? null,
        externalName,
      ]
    );
    return (await this.findById(id))!;
  }

  async update(id: string, input: Partial<CaseLogInput>): Promise<CaseLog> {
    const db = await getDatabase();
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Case ${id} not found`);

    const merged: CaseLogInput = {
      date: input.date ?? existing.date,
      diagnosis: input.diagnosis ?? existing.diagnosis,
      icd10Code: input.icd10Code ?? existing.icd10Code,
      organSystems: input.organSystems ?? existing.organSystems,
      cobatriceDomains: input.cobatriceDomains ?? existing.cobatriceDomains,
      supervisionLevel: input.supervisionLevel ?? existing.supervisionLevel,
      supervisorUserId: input.supervisorUserId ?? existing.supervisorUserId,
      observerUserId: input.observerUserId ?? existing.observerUserId,
      externalSupervisorName:
        input.externalSupervisorName ?? existing.externalSupervisorName,
      reflection: input.reflection ?? existing.reflection,
    };
    const mergedExternalName = merged.externalSupervisorName?.trim() || null;
    const mergedSupervisorId = mergedExternalName
      ? null
      : (merged.supervisorUserId ?? null);
    // Changing the supervisor invalidates any prior approval.
    const supervisorChanged =
      (existing.supervisorUserId ?? null) !== mergedSupervisorId;
    const coded = codify(merged);
    const now = nowISO();
    const draft: CaseLog = { ...existing, ...merged, ...coded, updatedAt: now };
    const quality = scoreCase(draft);

    const updateSql = supervisorChanged
      ? `UPDATE case_logs SET
          date = ?, diagnosis = ?, icd10_code = ?, organ_systems = ?,
          cobatrice_domains = ?, supervision_level = ?, reflection = ?,
          updated_at = ?, synced = 0,
          diagnosis_coded = ?, organ_systems_coded = ?,
          cobatrice_domains_coded = ?, supervision_level_coded = ?,
          quality = ?, supervisor_user_id = ?, observer_user_id = ?,
          external_supervisor_name = ?,
          approved_by = NULL, approved_at = NULL
         WHERE id = ?`
      : `UPDATE case_logs SET
          date = ?, diagnosis = ?, icd10_code = ?, organ_systems = ?,
          cobatrice_domains = ?, supervision_level = ?, reflection = ?,
          updated_at = ?, synced = 0,
          diagnosis_coded = ?, organ_systems_coded = ?,
          cobatrice_domains_coded = ?, supervision_level_coded = ?,
          quality = ?, supervisor_user_id = ?, observer_user_id = ?,
          external_supervisor_name = ?
         WHERE id = ?`;

    await db.runAsync(updateSql, [
      merged.date,
      merged.diagnosis,
      merged.icd10Code ?? '',
      JSON.stringify(merged.organSystems),
      JSON.stringify(merged.cobatriceDomains),
      merged.supervisionLevel,
      merged.reflection ?? '',
      now,
      coded.diagnosisCoded ? JSON.stringify(coded.diagnosisCoded) : null,
      JSON.stringify(coded.organSystemsCoded),
      JSON.stringify(coded.cobatriceDomainsCoded),
      JSON.stringify(coded.supervisionLevelCoded),
      JSON.stringify(quality),
      mergedSupervisorId,
      merged.observerUserId ?? null,
      mergedExternalName,
      id,
    ]);
    return (await this.findById(id))!;
  }

  // Soft delete — marks the row as deleted locally and queues a tombstone
  // for sync. The row stays in the table (filtered out by all read paths)
  // until the next push reaches Supabase, after which the remote row is
  // also marked deleted. This keeps web/mobile clients consistent.
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      'UPDATE case_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }

  // Approve a case — only the tagged supervisor may approve. Returns
  // the updated row so callers can refresh local state.
  async approve(id: string): Promise<CaseLog> {
    const db = await getDatabase();
    const userId = currentUserId();
    if (!userId) throw new Error('Not signed in.');
    const row = await db.getFirstAsync<{ supervisor_user_id: string | null }>(
      'SELECT supervisor_user_id FROM case_logs WHERE id = ?',
      [id]
    );
    if (!row) throw new Error(`Case ${id} not found`);
    if (row.supervisor_user_id !== userId) {
      throw new Error('Only the tagged supervisor can approve this case.');
    }
    await db.runAsync(
      'UPDATE case_logs SET approved_by = ?, approved_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [userId, nowISO(), nowISO(), id]
    );
    return (await this.findById(id))!;
  }

  async revokeApproval(id: string): Promise<CaseLog> {
    const db = await getDatabase();
    const userId = currentUserId();
    if (!userId) throw new Error('Not signed in.');
    const row = await db.getFirstAsync<{ supervisor_user_id: string | null }>(
      'SELECT supervisor_user_id FROM case_logs WHERE id = ?',
      [id]
    );
    if (!row) throw new Error(`Case ${id} not found`);
    if (row.supervisor_user_id !== userId) {
      throw new Error('Only the tagged supervisor can revoke approval.');
    }
    await db.runAsync(
      'UPDATE case_logs SET approved_by = NULL, approved_at = NULL, updated_at = ?, synced = 0 WHERE id = ?',
      [nowISO(), id]
    );
    return (await this.findById(id))!;
  }

  // ─── Derived queries ────────────────────────────────────────────────────────

  async countThisMonth(): Promise<number> {
    const db = await getDatabase();
    const scope = caseScopedWhere();
    const start = startOfMonthISO();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM case_logs WHERE created_at >= ? AND deleted_at IS NULL AND ${scope.clause}`,
      [start, ...scope.params]
    );
    return row?.count ?? 0;
  }

  async getDomainCounts(): Promise<Record<string, number>> {
    const cases = await this.findAll();
    const counts: Record<string, number> = {};
    for (const c of cases) {
      for (const d of c.cobatriceDomains) {
        counts[d] = (counts[d] ?? 0) + 1;
      }
    }
    return counts;
  }

  async findByDateRange(from: string, to: string): Promise<CaseLog[]> {
    const db = await getDatabase();
    const scope = caseScopedWhere();
    const rows = await db.getAllAsync<CaseRow>(
      `SELECT * FROM case_logs WHERE date >= ? AND date <= ? AND deleted_at IS NULL AND ${scope.clause} ORDER BY date DESC`,
      [from, to, ...scope.params]
    );
    return rows.map(rowToModel);
  }
}

export const CaseService = new CaseServiceImpl();
