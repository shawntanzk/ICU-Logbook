import { getDatabase } from '../database/client';
import { WardReviewLog, WardReviewLogInput } from '../models/WardReviewLog';
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

interface WardReviewRow {
  id: string; date: string;
  patient_age: string | null; patient_sex: string | null;
  referring_specialty: string | null;
  diagnosis: string; icd10_code: string;
  review_outcome: string;
  communicated_with_relatives: number;
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

function rowToModel(row: WardReviewRow): WardReviewLog {
  return {
    id: row.id, date: row.date,
    patientAge: row.patient_age ?? undefined,
    patientSex: row.patient_sex as WardReviewLog['patientSex'] ?? undefined,
    referringSpecialty: row.referring_specialty as WardReviewLog['referringSpecialty'] ?? undefined,
    diagnosis: row.diagnosis, icd10Code: row.icd10_code,
    reviewOutcome: row.review_outcome as WardReviewLog['reviewOutcome'],
    communicatedWithRelatives: row.communicated_with_relatives === 1,
    cobatriceDomains: parseJSON<string[]>(row.cobatrice_domains, []),
    reflection: row.reflection ?? undefined,
    supervisionLevel: row.supervision_level as WardReviewLog['supervisionLevel'],
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
    consentStatus: (row.consent_status as WardReviewLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class WardReviewServiceImpl {
  async findAll(): Promise<WardReviewLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<WardReviewRow>(
      `SELECT * FROM ward_review_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<WardReviewLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<WardReviewRow>(
      `SELECT * FROM ward_review_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: WardReviewLogInput): Promise<WardReviewLog> {
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
      `INSERT INTO ward_review_logs
        (id, date, patient_age, patient_sex, referring_specialty,
         diagnosis, icd10_code, review_outcome, communicated_with_relatives,
         cobatrice_domains, reflection,
         supervision_level, supervisor_user_id, external_supervisor_name,
         owner_id, created_at, updated_at, synced, schema_version,
         diagnosis_coded, cobatrice_domains_coded, supervision_level_coded,
         provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.date,
        input.patientAge ?? null, input.patientSex ?? null,
        input.referringSpecialty ?? null,
        input.diagnosis, input.icd10Code ?? '',
        input.reviewOutcome, input.communicatedWithRelatives ? 1 : 0,
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
      'UPDATE ward_review_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }
}

export const WardReviewService = new WardReviewServiceImpl();
