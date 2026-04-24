import { getDatabase } from '../database/client';
import { RegionalBlockLog, RegionalBlockLogInput } from '../models/RegionalBlockLog';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { supervisionToCoded } from '../data/supervision';
import { regionalBlockToCoded } from '../data/regionalBlocks';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface BlockRow {
  id: string; case_id: string | null; date: string;
  block_type: string; block_type_other: string | null;
  uss_guided: number; catheter: number;
  attempts: number; success: number; complications: string | null;
  supervision_level: string; supervisor_user_id: string | null;
  external_supervisor_name: string | null;
  owner_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; synced: number;
  deleted_at: string | null;
  schema_version: string; block_type_coded: string | null;
  supervision_level_coded: string | null;
  provenance: string | null; quality: string | null;
  consent_status: string; license: string;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function rowToModel(row: BlockRow): RegionalBlockLog {
  return {
    id: row.id, caseId: row.case_id ?? undefined, date: row.date,
    blockType: row.block_type as RegionalBlockLog['blockType'],
    blockTypeOther: row.block_type_other ?? undefined,
    ussGuided: row.uss_guided === 1,
    catheter: row.catheter === 1,
    attempts: row.attempts, success: row.success === 1,
    complications: row.complications ?? undefined,
    supervisionLevel: row.supervision_level as RegionalBlockLog['supervisionLevel'],
    supervisorUserId: row.supervisor_user_id,
    externalSupervisorName: row.external_supervisor_name,
    ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    synced: row.synced === 1,
    schemaVersion: row.schema_version,
    blockTypeCoded: parseJSON<CodedValue | null>(row.block_type_coded, null),
    supervisionLevelCoded: parseJSON<CodedValue | null>(row.supervision_level_coded, null) ?? supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, { appVersion: '0.0.0', schemaVersion: '1.0.0', deviceId: 'unknown', platform: 'ios' as const, locale: 'en-GB', timezone: 'UTC' }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as RegionalBlockLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class RegionalBlockServiceImpl {
  async findAll(): Promise<RegionalBlockLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<BlockRow>(
      `SELECT * FROM regional_block_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findByCaseId(caseId: string): Promise<RegionalBlockLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<BlockRow>(
      `SELECT * FROM regional_block_logs WHERE case_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [caseId]
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<RegionalBlockLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<BlockRow>(
      `SELECT * FROM regional_block_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: RegionalBlockLogInput): Promise<RegionalBlockLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const blockCoded = regionalBlockToCoded(input.blockType);
    const supervisionCoded = supervisionToCoded(input.supervisionLevel)!;
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO regional_block_logs
        (id, case_id, date, block_type, block_type_other, uss_guided, catheter,
         attempts, success, complications,
         supervision_level, supervisor_user_id, external_supervisor_name,
         owner_id, created_at, updated_at, synced, schema_version,
         block_type_coded, supervision_level_coded, provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.caseId ?? null, input.date, input.blockType,
        input.blockTypeOther ?? null,
        input.ussGuided ? 1 : 0, input.catheter ? 1 : 0,
        input.attempts, input.success ? 1 : 0,
        input.complications ?? null, input.supervisionLevel,
        supervisorId, externalName, currentUserId(), now, now,
        CURRENT_SCHEMA_VERSION,
        blockCoded ? JSON.stringify(blockCoded) : null,
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
      'UPDATE regional_block_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }

  async getBlockTypeCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<{ block_type: string; count: number }>(
      `SELECT block_type, COUNT(*) as count FROM regional_block_logs
       WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL)
       GROUP BY block_type`,
      [userId ?? '']
    );
    return Object.fromEntries(rows.map((r) => [r.block_type, r.count]));
  }

  async getSuccessRate(): Promise<number | null> {
    const db = await getDatabase();
    const userId = currentUserId();
    const row = await db.getFirstAsync<{ total: number; succeeded: number }>(
      `SELECT COUNT(*) as total, SUM(success) as succeeded
       FROM regional_block_logs
       WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL)`,
      [userId ?? '']
    );
    if (!row || row.total === 0) return null;
    return (row.succeeded ?? 0) / row.total;
  }
}

export const RegionalBlockService = new RegionalBlockServiceImpl();
