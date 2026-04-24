import { getDatabase } from '../database/client';
import { TransferLog, TransferLogInput } from '../models/TransferLog';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { supervisionToCoded } from '../data/supervision';
import { icd10ToCoded } from '../data/icd10';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface TransferRow {
  id: string; date: string;
  patient_age: string | null; patient_sex: string | null;
  diagnosis: string; icd10_code: string;
  transfer_type: string; transfer_mode: string;
  from_location: string | null; to_location: string | null;
  level_of_care: string | null;
  procedures_during_transfer: string;
  communicated_with_relatives: number;
  reflection: string | null;
  supervision_level: string; supervisor_user_id: string | null;
  external_supervisor_name: string | null;
  owner_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; synced: number;
  deleted_at: string | null;
  schema_version: string;
  diagnosis_coded: string | null;
  supervision_level_coded: string | null;
  provenance: string | null; quality: string | null;
  consent_status: string; license: string;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function rowToModel(row: TransferRow): TransferLog {
  return {
    id: row.id, date: row.date,
    patientAge: row.patient_age ?? undefined,
    patientSex: row.patient_sex as TransferLog['patientSex'] ?? undefined,
    diagnosis: row.diagnosis, icd10Code: row.icd10_code,
    transferType: row.transfer_type as TransferLog['transferType'],
    transferMode: row.transfer_mode as TransferLog['transferMode'],
    fromLocation: row.from_location ?? undefined,
    toLocation: row.to_location ?? undefined,
    levelOfCare: row.level_of_care as TransferLog['levelOfCare'] ?? undefined,
    proceduresDuringTransfer: parseJSON<string[]>(row.procedures_during_transfer, []),
    communicatedWithRelatives: row.communicated_with_relatives === 1,
    reflection: row.reflection ?? undefined,
    supervisionLevel: row.supervision_level as TransferLog['supervisionLevel'],
    supervisorUserId: row.supervisor_user_id,
    externalSupervisorName: row.external_supervisor_name,
    ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    synced: row.synced === 1,
    schemaVersion: row.schema_version,
    diagnosisCoded: parseJSON<CodedValue | null>(row.diagnosis_coded, null),
    supervisionLevelCoded: parseJSON<CodedValue | null>(row.supervision_level_coded, null) ?? supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, { appVersion: '0.0.0', schemaVersion: '1.0.0', deviceId: 'unknown', platform: 'ios' as const, locale: 'en-GB', timezone: 'UTC' }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as TransferLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class TransferServiceImpl {
  async findAll(): Promise<TransferLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<TransferRow>(
      `SELECT * FROM transfer_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<TransferLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<TransferRow>(
      `SELECT * FROM transfer_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: TransferLogInput): Promise<TransferLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const diagnosisCoded = input.icd10Code ? icd10ToCoded(input.icd10Code) : null;
    const supervisionCoded = supervisionToCoded(input.supervisionLevel)!;
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO transfer_logs
        (id, date, patient_age, patient_sex, diagnosis, icd10_code,
         transfer_type, transfer_mode, from_location, to_location,
         level_of_care, procedures_during_transfer,
         communicated_with_relatives, reflection,
         supervision_level, supervisor_user_id, external_supervisor_name,
         owner_id, created_at, updated_at, synced, schema_version,
         diagnosis_coded, supervision_level_coded, provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.date,
        input.patientAge ?? null, input.patientSex ?? null,
        input.diagnosis, input.icd10Code ?? '',
        input.transferType, input.transferMode,
        input.fromLocation ?? null, input.toLocation ?? null,
        input.levelOfCare ?? null,
        JSON.stringify(input.proceduresDuringTransfer ?? []),
        input.communicatedWithRelatives ? 1 : 0,
        input.reflection ?? null,
        input.supervisionLevel, supervisorId, externalName,
        currentUserId(), now, now,
        CURRENT_SCHEMA_VERSION,
        diagnosisCoded ? JSON.stringify(diagnosisCoded) : null,
        JSON.stringify(supervisionCoded),
        JSON.stringify(provenance),
        JSON.stringify({ completeness: 0.5, codingConfidence: 0.7 }),
        consent, DEFAULT_LICENSE,
      ]
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      'UPDATE transfer_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }
}

export const TransferService = new TransferServiceImpl();
