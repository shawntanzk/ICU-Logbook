import { getDatabase } from '../database/client';
import { EDAttendanceLog, EDAttendanceLogInput } from '../models/EDAttendanceLog';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { supervisionToCoded } from '../data/supervision';
import { cobatriceToCoded } from '../data/cobatrice';
import { icd10ToCoded } from '../data/icd10';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface EDRow {
  id: string; date: string;
  patient_age: string | null; patient_sex: string | null;
  diagnosis: string; icd10_code: string;
  icu_admission: number; presenting_category: string | null;
  cardiac_arrest: number; communicated_with_relatives: number;
  cobatrice_domains: string; reflection: string | null;
  supervision_level: string; supervisor_user_id: string | null;
  external_supervisor_name: string | null;
  owner_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; synced: number;
  deleted_at: string | null;
  schema_version: string;
  diagnosis_coded: string | null;
  cobatrice_domains_coded: string;
  supervision_level_coded: string | null;
  provenance: string | null; quality: string | null;
  consent_status: string; license: string;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function rowToModel(row: EDRow): EDAttendanceLog {
  return {
    id: row.id, date: row.date,
    patientAge: row.patient_age ?? undefined,
    patientSex: row.patient_sex as EDAttendanceLog['patientSex'] ?? undefined,
    diagnosis: row.diagnosis, icd10Code: row.icd10_code,
    icuAdmission: row.icu_admission === 1,
    presentingCategory: row.presenting_category as EDAttendanceLog['presentingCategory'] ?? undefined,
    cardiacArrest: row.cardiac_arrest === 1,
    communicatedWithRelatives: row.communicated_with_relatives === 1,
    cobatriceDomains: parseJSON<string[]>(row.cobatrice_domains, []),
    reflection: row.reflection ?? undefined,
    supervisionLevel: row.supervision_level as EDAttendanceLog['supervisionLevel'],
    supervisorUserId: row.supervisor_user_id,
    externalSupervisorName: row.external_supervisor_name,
    ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    synced: row.synced === 1,
    schemaVersion: row.schema_version,
    diagnosisCoded: parseJSON<CodedValue | null>(row.diagnosis_coded, null),
    cobatriceDomainsCoded: parseJSON<CodedValue[]>(row.cobatrice_domains_coded, []),
    supervisionLevelCoded: parseJSON<CodedValue | null>(row.supervision_level_coded, null) ?? supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, { appVersion: '0.0.0', schemaVersion: '1.0.0', deviceId: 'unknown', platform: 'ios' as const, locale: 'en-GB', timezone: 'UTC' }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as EDAttendanceLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class EDAttendanceServiceImpl {
  async findAll(): Promise<EDAttendanceLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<EDRow>(
      `SELECT * FROM ed_attendance_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<EDAttendanceLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<EDRow>(
      `SELECT * FROM ed_attendance_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: EDAttendanceLogInput): Promise<EDAttendanceLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const diagnosisCoded = input.icd10Code ? icd10ToCoded(input.icd10Code) : null;
    const cobatriceCoded = input.cobatriceDomains.map(cobatriceToCoded).filter((v): v is CodedValue => v !== null);
    const supervisionCoded = supervisionToCoded(input.supervisionLevel)!;
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO ed_attendance_logs
        (id, date, patient_age, patient_sex, diagnosis, icd10_code,
         icu_admission, presenting_category, cardiac_arrest,
         communicated_with_relatives, cobatrice_domains, reflection,
         supervision_level, supervisor_user_id, external_supervisor_name,
         owner_id, created_at, updated_at, synced, schema_version,
         diagnosis_coded, cobatrice_domains_coded, supervision_level_coded,
         provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.date,
        input.patientAge ?? null, input.patientSex ?? null,
        input.diagnosis, input.icd10Code ?? '',
        input.icuAdmission ? 1 : 0, input.presentingCategory ?? null,
        input.cardiacArrest ? 1 : 0,
        input.communicatedWithRelatives ? 1 : 0,
        JSON.stringify(input.cobatriceDomains), input.reflection ?? null,
        input.supervisionLevel, supervisorId, externalName,
        currentUserId(), now, now,
        CURRENT_SCHEMA_VERSION,
        diagnosisCoded ? JSON.stringify(diagnosisCoded) : null,
        JSON.stringify(cobatriceCoded),
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
      'UPDATE ed_attendance_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }
}

export const EDAttendanceService = new EDAttendanceServiceImpl();
