import { getDatabase } from '../database/client';
import { ProcedureLog, ProcedureLogInput } from '../models/ProcedureLog';
import { IDataService } from './DataService';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { procedureToCoded } from '../data/procedures';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { scoreProcedure } from './QualityService';
import { procedureScopedWhere, currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface ProcedureRow {
  id: string;
  case_id: string | null;
  procedure_type: string;
  attempts: number;
  success: number;
  complications: string;
  created_at: string;
  updated_at: string;
  synced: number;
  schema_version: string;
  procedure_type_coded: string | null;
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

function rowToModel(row: ProcedureRow): ProcedureLog {
  return {
    id: row.id,
    caseId: row.case_id ?? undefined,
    procedureType: row.procedure_type,
    attempts: row.attempts,
    success: row.success === 1,
    complications: row.complications,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: row.synced === 1,

    schemaVersion: row.schema_version || '1.0.0',
    procedureTypeCoded:
      parseJSON<CodedValue | null>(row.procedure_type_coded, null) ??
      procedureToCoded(row.procedure_type)!,
    provenance: parseJSON(row.provenance, {
      appVersion: '0.0.0',
      schemaVersion: '1.0.0',
      deviceId: 'unknown',
      platform: 'ios' as const,
      locale: 'en-GB',
      timezone: 'UTC',
    }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as ProcedureLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
    ownerId: row.owner_id,
    supervisorUserId: row.supervisor_user_id,
    observerUserId: row.observer_user_id,
    externalSupervisorName: row.external_supervisor_name,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
  };
}

class ProcedureServiceImpl implements IDataService<ProcedureLog, ProcedureLogInput> {
  async findAll(): Promise<ProcedureLog[]> {
    const db = await getDatabase();
    const scope = procedureScopedWhere();
    const rows = await db.getAllAsync<ProcedureRow>(
      `SELECT * FROM procedure_logs WHERE deleted_at IS NULL AND ${scope.clause} ORDER BY created_at DESC`,
      scope.params
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<ProcedureLog | null> {
    const db = await getDatabase();
    const scope = procedureScopedWhere();
    const row = await db.getFirstAsync<ProcedureRow>(
      `SELECT * FROM procedure_logs WHERE id = ? AND deleted_at IS NULL AND ${scope.clause}`,
      [id, ...scope.params]
    );
    return row ? rowToModel(row) : null;
  }

  async findByCaseId(caseId: string): Promise<ProcedureLog[]> {
    const db = await getDatabase();
    const scope = procedureScopedWhere();
    const rows = await db.getAllAsync<ProcedureRow>(
      `SELECT * FROM procedure_logs WHERE case_id = ? AND deleted_at IS NULL AND ${scope.clause} ORDER BY created_at DESC`,
      [caseId, ...scope.params]
    );
    return rows.map(rowToModel);
  }

  async create(input: ProcedureLogInput): Promise<ProcedureLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const coded = procedureToCoded(input.procedureType)!;
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const draft: ProcedureLog = {
      ...input,
      id,
      ownerId: currentUserId(),
      createdAt: now,
      updatedAt: now,
      synced: false,
      approvedBy: null,
      approvedAt: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      procedureTypeCoded: coded,
      provenance,
      quality: { completeness: 0, codingConfidence: 0 },
      consentStatus: consent,
      license: DEFAULT_LICENSE,
    };
    const quality = scoreProcedure(draft);
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO procedure_logs
        (id, case_id, procedure_type, attempts, success, complications,
         created_at, updated_at, synced,
         schema_version, procedure_type_coded, provenance, quality,
         consent_status, license, owner_id, supervisor_user_id,
         observer_user_id, external_supervisor_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.caseId ?? null,
        input.procedureType,
        input.attempts,
        input.success ? 1 : 0,
        input.complications ?? '',
        now,
        now,
        CURRENT_SCHEMA_VERSION,
        JSON.stringify(coded),
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

  async update(id: string, input: Partial<ProcedureLogInput>): Promise<ProcedureLog> {
    const db = await getDatabase();
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Procedure ${id} not found`);

    const merged = { ...existing, ...input };
    const coded = procedureToCoded(merged.procedureType)!;
    const now = nowISO();
    const draft: ProcedureLog = { ...existing, ...merged, procedureTypeCoded: coded, updatedAt: now };
    const quality = scoreProcedure(draft);
    const mergedExternalName = merged.externalSupervisorName?.trim() || null;
    const mergedSupervisorId = mergedExternalName
      ? null
      : (merged.supervisorUserId ?? null);
    const supervisorChanged =
      (existing.supervisorUserId ?? null) !== mergedSupervisorId;

    const updateSql = supervisorChanged
      ? `UPDATE procedure_logs SET
          case_id = ?, procedure_type = ?, attempts = ?, success = ?,
          complications = ?, updated_at = ?, synced = 0,
          procedure_type_coded = ?, quality = ?,
          supervisor_user_id = ?, observer_user_id = ?,
          external_supervisor_name = ?,
          approved_by = NULL, approved_at = NULL
         WHERE id = ?`
      : `UPDATE procedure_logs SET
          case_id = ?, procedure_type = ?, attempts = ?, success = ?,
          complications = ?, updated_at = ?, synced = 0,
          procedure_type_coded = ?, quality = ?,
          supervisor_user_id = ?, observer_user_id = ?,
          external_supervisor_name = ?
         WHERE id = ?`;

    await db.runAsync(updateSql, [
      merged.caseId ?? null,
      merged.procedureType,
      merged.attempts,
      merged.success ? 1 : 0,
      merged.complications ?? '',
      now,
      JSON.stringify(coded),
      JSON.stringify(quality),
      mergedSupervisorId,
      merged.observerUserId ?? null,
      mergedExternalName,
      id,
    ]);
    return (await this.findById(id))!;
  }

  async approve(id: string): Promise<ProcedureLog> {
    const db = await getDatabase();
    const userId = currentUserId();
    if (!userId) throw new Error('Not signed in.');
    const row = await db.getFirstAsync<{ supervisor_user_id: string | null }>(
      'SELECT supervisor_user_id FROM procedure_logs WHERE id = ?',
      [id]
    );
    if (!row) throw new Error(`Procedure ${id} not found`);
    if (row.supervisor_user_id !== userId) {
      throw new Error('Only the tagged supervisor can approve this procedure.');
    }
    const now = nowISO();
    await db.runAsync(
      'UPDATE procedure_logs SET approved_by = ?, approved_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [userId, now, now, id]
    );
    return (await this.findById(id))!;
  }

  async revokeApproval(id: string): Promise<ProcedureLog> {
    const db = await getDatabase();
    const userId = currentUserId();
    if (!userId) throw new Error('Not signed in.');
    const row = await db.getFirstAsync<{ supervisor_user_id: string | null }>(
      'SELECT supervisor_user_id FROM procedure_logs WHERE id = ?',
      [id]
    );
    if (!row) throw new Error(`Procedure ${id} not found`);
    if (row.supervisor_user_id !== userId) {
      throw new Error('Only the tagged supervisor can revoke approval.');
    }
    await db.runAsync(
      'UPDATE procedure_logs SET approved_by = NULL, approved_at = NULL, updated_at = ?, synced = 0 WHERE id = ?',
      [nowISO(), id]
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      'UPDATE procedure_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }

  async getSuccessRate(): Promise<number> {
    const db = await getDatabase();
    const scope = procedureScopedWhere();
    const row = await db.getFirstAsync<{ total: number; successful: number }>(
      `SELECT COUNT(*) as total, SUM(success) as successful FROM procedure_logs WHERE deleted_at IS NULL AND ${scope.clause}`,
      scope.params
    );
    if (!row || row.total === 0) return 0;
    return Math.round(((row.successful ?? 0) / row.total) * 100);
  }

  async getTypeCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const scope = procedureScopedWhere();
    const rows = await db.getAllAsync<{ procedure_type: string; count: number }>(
      `SELECT procedure_type, COUNT(*) as count FROM procedure_logs WHERE deleted_at IS NULL AND ${scope.clause} GROUP BY procedure_type`,
      scope.params
    );
    return Object.fromEntries(
      rows.map((r: { procedure_type: string; count: number }) => [r.procedure_type, r.count])
    );
  }
}

export const ProcedureService = new ProcedureServiceImpl();
