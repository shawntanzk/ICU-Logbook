import { getDatabase } from '../database/client';
import { AirwayLog, AirwayLogInput } from '../models/AirwayLog';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { supervisionToCoded } from '../data/supervision';
import { intubationDeviceToCoded } from '../data/airwayItems';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface AirwayRow {
  id: string; case_id: string | null; date: string;
  is_rsi: number;
  induction_agent: string | null; induction_agent_other: string | null;
  neuromuscular_agent: string | null; neuromuscular_agent_other: string | null;
  device: string | null; tube_size: number | null; tube_type: string | null;
  attempts: number; success: number;
  cormack_lehane_grade: string | null;
  dae_used: number; dae_items: string;
  supervision_level: string; supervisor_user_id: string | null;
  external_supervisor_name: string | null; notes: string | null;
  owner_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; synced: number;
  deleted_at: string | null;
  schema_version: string; device_coded: string | null;
  supervision_level_coded: string | null;
  provenance: string | null; quality: string | null;
  consent_status: string; license: string;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function rowToModel(row: AirwayRow): AirwayLog {
  return {
    id: row.id, caseId: row.case_id ?? undefined, date: row.date,
    isRsi: row.is_rsi === 1,
    inductionAgent: row.induction_agent as AirwayLog['inductionAgent'] ?? undefined,
    inductionAgentOther: row.induction_agent_other ?? undefined,
    neuromuscularAgent: row.neuromuscular_agent as AirwayLog['neuromuscularAgent'] ?? undefined,
    neuromuscularAgentOther: row.neuromuscular_agent_other ?? undefined,
    device: row.device as AirwayLog['device'] ?? undefined,
    tubeSize: row.tube_size ?? undefined,
    tubeType: row.tube_type as AirwayLog['tubeType'] ?? undefined,
    attempts: row.attempts, success: row.success === 1,
    cormackLehaneGrade: row.cormack_lehane_grade as AirwayLog['cormackLehaneGrade'] ?? undefined,
    daeUsed: row.dae_used === 1,
    daeItems: parseJSON<string[]>(row.dae_items, []),
    supervisionLevel: row.supervision_level as AirwayLog['supervisionLevel'],
    supervisorUserId: row.supervisor_user_id,
    externalSupervisorName: row.external_supervisor_name,
    notes: row.notes ?? undefined,
    ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    synced: row.synced === 1,
    schemaVersion: row.schema_version,
    deviceCoded: parseJSON<CodedValue | null>(row.device_coded, null),
    supervisionLevelCoded: parseJSON<CodedValue | null>(row.supervision_level_coded, null) ?? supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, { appVersion: '0.0.0', schemaVersion: '1.0.0', deviceId: 'unknown', platform: 'ios' as const, locale: 'en-GB', timezone: 'UTC' }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as AirwayLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class AirwayServiceImpl {
  async findAll(): Promise<AirwayLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<AirwayRow>(
      `SELECT * FROM airway_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findByCaseId(caseId: string): Promise<AirwayLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<AirwayRow>(
      `SELECT * FROM airway_logs WHERE case_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [caseId]
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<AirwayLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<AirwayRow>(
      `SELECT * FROM airway_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: AirwayLogInput): Promise<AirwayLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const deviceCoded = input.device ? intubationDeviceToCoded(input.device) : null;
    const supervisionCoded = supervisionToCoded(input.supervisionLevel)!;
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO airway_logs
        (id, case_id, date,
         is_rsi, induction_agent, induction_agent_other,
         neuromuscular_agent, neuromuscular_agent_other,
         device, tube_size, tube_type,
         attempts, success, cormack_lehane_grade,
         dae_used, dae_items,
         supervision_level, supervisor_user_id, external_supervisor_name, notes,
         owner_id, created_at, updated_at, synced, schema_version,
         device_coded, supervision_level_coded, provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.caseId ?? null, input.date,
        input.isRsi ? 1 : 0,
        input.inductionAgent ?? null, input.inductionAgentOther ?? null,
        input.neuromuscularAgent ?? null, input.neuromuscularAgentOther ?? null,
        input.device ?? null, input.tubeSize ?? null, input.tubeType ?? null,
        input.attempts, input.success ? 1 : 0, input.cormackLehaneGrade ?? null,
        input.daeUsed ? 1 : 0, JSON.stringify(input.daeItems ?? []),
        input.supervisionLevel, supervisorId, externalName, input.notes ?? null,
        currentUserId(), now, now,
        CURRENT_SCHEMA_VERSION,
        deviceCoded ? JSON.stringify(deviceCoded) : null,
        JSON.stringify(supervisionCoded),
        JSON.stringify(provenance),
        JSON.stringify({ completeness: 0.6, codingConfidence: 0.9 }),
        consent, DEFAULT_LICENSE,
      ]
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      'UPDATE airway_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }

  async getDeviceCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<{ device: string; count: number }>(
      `SELECT device, COUNT(*) as count FROM airway_logs
       WHERE deleted_at IS NULL AND device IS NOT NULL AND (owner_id = ? OR owner_id IS NULL)
       GROUP BY device`,
      [userId ?? '']
    );
    return Object.fromEntries(rows.map((r) => [r.device, r.count]));
  }

  async getDAECount(): Promise<number> {
    const db = await getDatabase();
    const userId = currentUserId();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM airway_logs
       WHERE deleted_at IS NULL AND dae_used = 1 AND (owner_id = ? OR owner_id IS NULL)`,
      [userId ?? '']
    );
    return row?.count ?? 0;
  }

  async getFirstPassSuccessRate(): Promise<number | null> {
    const db = await getDatabase();
    const userId = currentUserId();
    const row = await db.getFirstAsync<{ total: number; first_pass: number }>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN attempts = 1 AND success = 1 THEN 1 ELSE 0 END) as first_pass
       FROM airway_logs
       WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL)`,
      [userId ?? '']
    );
    if (!row || row.total === 0) return null;
    return row.first_pass / row.total;
  }
}

export const AirwayService = new AirwayServiceImpl();
