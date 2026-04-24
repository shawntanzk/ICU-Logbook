import { getDatabase } from '../database/client';
import { USSLog, USSLogInput } from '../models/USSLog';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { supervisionToCoded } from '../data/supervision';
import { ussStudyTypeToCoded } from '../data/ussStudyTypes';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface USSRow {
  id: string; case_id: string | null; date: string;
  study_type: string; performed: number; formal_report: number;
  findings: string | null;
  supervision_level: string; supervisor_user_id: string | null;
  external_supervisor_name: string | null;
  owner_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; synced: number;
  deleted_at: string | null;
  schema_version: string; study_type_coded: string | null;
  supervision_level_coded: string | null;
  provenance: string | null; quality: string | null;
  consent_status: string; license: string;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function rowToModel(row: USSRow): USSLog {
  return {
    id: row.id, caseId: row.case_id ?? undefined, date: row.date,
    studyType: row.study_type as USSLog['studyType'],
    performed: row.performed === 1,
    formalReport: row.formal_report === 1,
    findings: row.findings ?? undefined,
    supervisionLevel: row.supervision_level as USSLog['supervisionLevel'],
    supervisorUserId: row.supervisor_user_id,
    externalSupervisorName: row.external_supervisor_name,
    ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    synced: row.synced === 1,
    schemaVersion: row.schema_version,
    studyTypeCoded: parseJSON<CodedValue | null>(row.study_type_coded, null),
    supervisionLevelCoded: parseJSON<CodedValue | null>(row.supervision_level_coded, null) ?? supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, { appVersion: '0.0.0', schemaVersion: '1.0.0', deviceId: 'unknown', platform: 'ios' as const, locale: 'en-GB', timezone: 'UTC' }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as USSLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class USSServiceImpl {
  async findAll(): Promise<USSLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<USSRow>(
      `SELECT * FROM uss_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findByCaseId(caseId: string): Promise<USSLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<USSRow>(
      `SELECT * FROM uss_logs WHERE case_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [caseId]
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<USSLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<USSRow>(
      `SELECT * FROM uss_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: USSLogInput): Promise<USSLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const studyTypeCoded = ussStudyTypeToCoded(input.studyType);
    const supervisionCoded = supervisionToCoded(input.supervisionLevel)!;
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO uss_logs
        (id, case_id, date, study_type, performed, formal_report, findings,
         supervision_level, supervisor_user_id, external_supervisor_name,
         owner_id, created_at, updated_at, synced, schema_version,
         study_type_coded, supervision_level_coded, provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.caseId ?? null, input.date, input.studyType,
        input.performed ? 1 : 0, input.formalReport ? 1 : 0,
        input.findings ?? null, input.supervisionLevel,
        supervisorId, externalName, currentUserId(), now, now,
        CURRENT_SCHEMA_VERSION,
        studyTypeCoded ? JSON.stringify(studyTypeCoded) : null,
        JSON.stringify(supervisionCoded),
        JSON.stringify(provenance),
        JSON.stringify({ completeness: 0.5, codingConfidence: 0.8 }),
        consent, DEFAULT_LICENSE,
      ]
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      'UPDATE uss_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }

  async getStudyTypeCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<{ study_type: string; count: number }>(
      `SELECT study_type, COUNT(*) as count FROM uss_logs
       WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL)
       GROUP BY study_type`,
      [userId ?? '']
    );
    return Object.fromEntries(rows.map((r) => [r.study_type, r.count]));
  }
}

export const USSService = new USSServiceImpl();
