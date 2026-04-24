import { getDatabase } from '../database/client';
import { CVCLog, CVCLogInput } from '../models/CVCLog';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { supervisionToCoded } from '../data/supervision';
import { cvcSiteToCoded } from '../data/cvcSites';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface CVCRow {
  id: string; case_id: string | null; date: string;
  site: string; is_second_cvc: number; is_vascath: number;
  uss_guided: number; attempts: number; success: number;
  complications: string | null;
  supervision_level: string; supervisor_user_id: string | null;
  external_supervisor_name: string | null;
  owner_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; synced: number;
  deleted_at: string | null;
  schema_version: string; site_coded: string | null;
  supervision_level_coded: string | null;
  provenance: string | null; quality: string | null;
  consent_status: string; license: string;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function rowToModel(row: CVCRow): CVCLog {
  return {
    id: row.id, caseId: row.case_id ?? undefined, date: row.date,
    site: row.site as CVCLog['site'],
    isSecondCVC: row.is_second_cvc === 1,
    isVascath: row.is_vascath === 1,
    ussGuided: row.uss_guided === 1,
    attempts: row.attempts, success: row.success === 1,
    complications: row.complications ?? undefined,
    supervisionLevel: row.supervision_level as CVCLog['supervisionLevel'],
    supervisorUserId: row.supervisor_user_id,
    externalSupervisorName: row.external_supervisor_name,
    ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    synced: row.synced === 1,
    schemaVersion: row.schema_version,
    siteCoded: parseJSON<CodedValue | null>(row.site_coded, null),
    supervisionLevelCoded: parseJSON<CodedValue | null>(row.supervision_level_coded, null) ?? supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, { appVersion: '0.0.0', schemaVersion: '1.0.0', deviceId: 'unknown', platform: 'ios' as const, locale: 'en-GB', timezone: 'UTC' }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as CVCLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class CVCServiceImpl {
  async findAll(): Promise<CVCLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<CVCRow>(
      `SELECT * FROM cvc_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findByCaseId(caseId: string): Promise<CVCLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CVCRow>(
      `SELECT * FROM cvc_logs WHERE case_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [caseId]
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<CVCLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CVCRow>(
      `SELECT * FROM cvc_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: CVCLogInput): Promise<CVCLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const siteCoded = cvcSiteToCoded(input.site);
    const supervisionCoded = supervisionToCoded(input.supervisionLevel)!;
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO cvc_logs
        (id, case_id, date, site, is_second_cvc, is_vascath,
         uss_guided, attempts, success, complications,
         supervision_level, supervisor_user_id, external_supervisor_name,
         owner_id, created_at, updated_at, synced, schema_version,
         site_coded, supervision_level_coded, provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.caseId ?? null, input.date, input.site,
        input.isSecondCVC ? 1 : 0, input.isVascath ? 1 : 0,
        input.ussGuided ? 1 : 0, input.attempts, input.success ? 1 : 0,
        input.complications ?? null, input.supervisionLevel,
        supervisorId, externalName, currentUserId(), now, now,
        CURRENT_SCHEMA_VERSION,
        siteCoded ? JSON.stringify(siteCoded) : null,
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
      'UPDATE cvc_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }

  async getSiteCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<{ site: string; count: number }>(
      `SELECT site, COUNT(*) as count FROM cvc_logs
       WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL)
       GROUP BY site`,
      [userId ?? '']
    );
    return Object.fromEntries(rows.map((r) => [r.site, r.count]));
  }

  async getSuccessRate(): Promise<number | null> {
    const db = await getDatabase();
    const userId = currentUserId();
    const row = await db.getFirstAsync<{ total: number; succeeded: number }>(
      `SELECT COUNT(*) as total, SUM(success) as succeeded
       FROM cvc_logs
       WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL)`,
      [userId ?? '']
    );
    if (!row || row.total === 0) return null;
    return (row.succeeded ?? 0) / row.total;
  }
}

export const CVCService = new CVCServiceImpl();
