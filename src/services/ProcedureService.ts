import { getDatabase } from '../database/client';
import { ProcedureLog, ProcedureLogInput } from '../models/ProcedureLog';
import { IDataService } from './DataService';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { procedureToCoded } from '../data/procedures';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { scoreProcedure } from './QualityService';
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
  };
}

class ProcedureServiceImpl implements IDataService<ProcedureLog, ProcedureLogInput> {
  async findAll(): Promise<ProcedureLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ProcedureRow>(
      'SELECT * FROM procedure_logs ORDER BY created_at DESC'
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<ProcedureLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ProcedureRow>(
      'SELECT * FROM procedure_logs WHERE id = ?',
      [id]
    );
    return row ? rowToModel(row) : null;
  }

  async findByCaseId(caseId: string): Promise<ProcedureLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ProcedureRow>(
      'SELECT * FROM procedure_logs WHERE case_id = ? ORDER BY created_at DESC',
      [caseId]
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
      createdAt: now,
      updatedAt: now,
      synced: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      procedureTypeCoded: coded,
      provenance,
      quality: { completeness: 0, codingConfidence: 0 },
      consentStatus: consent,
      license: DEFAULT_LICENSE,
    };
    const quality = scoreProcedure(draft);

    await db.runAsync(
      `INSERT INTO procedure_logs
        (id, case_id, procedure_type, attempts, success, complications,
         created_at, updated_at, synced,
         schema_version, procedure_type_coded, provenance, quality,
         consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
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

    await db.runAsync(
      `UPDATE procedure_logs SET
        case_id = ?, procedure_type = ?, attempts = ?, success = ?,
        complications = ?, updated_at = ?, synced = 0,
        procedure_type_coded = ?, quality = ?
       WHERE id = ?`,
      [
        merged.caseId ?? null,
        merged.procedureType,
        merged.attempts,
        merged.success ? 1 : 0,
        merged.complications ?? '',
        now,
        JSON.stringify(coded),
        JSON.stringify(quality),
        id,
      ]
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM procedure_logs WHERE id = ?', [id]);
  }

  async getSuccessRate(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number; successful: number }>(
      'SELECT COUNT(*) as total, SUM(success) as successful FROM procedure_logs'
    );
    if (!row || row.total === 0) return 0;
    return Math.round(((row.successful ?? 0) / row.total) * 100);
  }

  async getTypeCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ procedure_type: string; count: number }>(
      'SELECT procedure_type, COUNT(*) as count FROM procedure_logs GROUP BY procedure_type'
    );
    return Object.fromEntries(
      rows.map((r: { procedure_type: string; count: number }) => [r.procedure_type, r.count])
    );
  }
}

export const ProcedureService = new ProcedureServiceImpl();
