import { getDatabase } from '../database/client';
import { CaseLog, CaseLogInput } from '../models/CaseLog';
import { IDataService } from './DataService';
import { generateUUID } from '../utils/uuid';
import { nowISO, startOfMonthISO } from '../utils/dateUtils';
import { icd10ToCoded } from '../data/icd10';
import { organSystemToCoded } from '../data/organSystems';
import { cobatriceToCoded } from '../data/cobatrice';
import { supervisionToCoded } from '../data/supervision';
import { specialtyToCoded } from '../data/specialties';
import { levelOfCareToCoded } from '../data/levelOfCare';
import { outcomeToCoded } from '../data/outcomes';
import type { PatientOutcome } from '../data/outcomes';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { scoreCase } from './QualityService';
import { caseScopedWhere, currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

// SQLite row shape — all columns in case_logs as of v9.
interface CaseRow {
  id: string;
  date: string;
  // Demographics
  patient_age: string | null;
  patient_sex: string | null;
  // Classification
  case_number: string | null;
  primary_specialty: string | null;
  level_of_care: string | null;
  admitted: number | null;
  cardiac_arrest: number;
  involvement: string | null;
  reviewed_again: number;
  // Diagnosis
  diagnosis: string;
  icd10_code: string;
  organ_systems: string;
  cobatrice_domains: string;
  // Outcome
  outcome: string | null;
  communicated_with_relatives: number;
  // Teaching
  teaching_delivered: number;
  teaching_recipient: string | null;
  // Supervision
  supervision_level: string;
  notes: string | null;
  reflection: string;
  created_at: string;
  updated_at: string;
  synced: number;
  schema_version: string;
  // Semantic
  diagnosis_coded: string | null;
  organ_systems_coded: string;
  cobatrice_domains_coded: string;
  supervision_level_coded: string | null;
  specialty_coded: string | null;
  level_of_care_coded: string | null;
  outcome_coded: string | null;
  // Provenance
  provenance: string | null;
  quality: string | null;
  consent_status: string;
  license: string;
  // Auth
  owner_id: string | null;
  supervisor_user_id: string | null;
  observer_user_id: string | null;
  external_supervisor_name: string | null;
  // Approval
  approved_by: string | null;
  approved_at: string | null;
  // Sync
  deleted_at: string | null;
  conflict: number;
  sync_retry_count: number;
  sync_last_error: string | null;
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
    deletedAt: row.deleted_at,
    conflict: row.conflict === 1,
    syncRetryCount: row.sync_retry_count ?? 0,
    syncLastError: row.sync_last_error ?? null,

    date: row.date,
    patientAge: row.patient_age ?? undefined,
    patientSex: (row.patient_sex as CaseLog['patientSex']) ?? undefined,
    caseNumber: row.case_number ?? undefined,
    primarySpecialty: row.primary_specialty ?? undefined,
    levelOfCare: (row.level_of_care as CaseLog['levelOfCare']) ?? undefined,
    admitted: row.admitted === null ? undefined : row.admitted === 1,
    cardiacArrest: row.cardiac_arrest === 1,
    involvement: (row.involvement as CaseLog['involvement']) ?? undefined,
    reviewedAgain: row.reviewed_again === 1,

    diagnosis: row.diagnosis,
    icd10Code: row.icd10_code,
    organSystems: parseJSON<string[]>(row.organ_systems, []),
    cobatriceDomains: parseJSON<string[]>(row.cobatrice_domains, []),

    outcome: (row.outcome as CaseLog['outcome']) ?? undefined,
    communicatedWithRelatives: row.communicated_with_relatives === 1,
    teachingDelivered: row.teaching_delivered === 1,
    teachingRecipient: (row.teaching_recipient as CaseLog['teachingRecipient']) ?? undefined,

    supervisionLevel: row.supervision_level as CaseLog['supervisionLevel'],
    notes: row.notes ?? undefined,
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
    specialtyCoded: parseJSON<CodedValue | null>(row.specialty_coded, null),
    levelOfCareCoded: parseJSON<CodedValue | null>(row.level_of_care_coded, null),
    outcomeCoded: parseJSON<CodedValue | null>(row.outcome_coded, null),

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

// Derive all CodedValue fields from raw user input.
function codify(input: CaseLogInput): Pick<
  CaseLog,
  | 'diagnosisCoded'
  | 'organSystemsCoded'
  | 'cobatriceDomainsCoded'
  | 'supervisionLevelCoded'
  | 'specialtyCoded'
  | 'levelOfCareCoded'
  | 'outcomeCoded'
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
    specialtyCoded: input.primarySpecialty ? specialtyToCoded(input.primarySpecialty) : null,
    levelOfCareCoded: input.levelOfCare ? levelOfCareToCoded(input.levelOfCare) : null,
    outcomeCoded: input.outcome ? outcomeToCoded(input.outcome as PatientOutcome) : null,
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

    const draft: CaseLog = {
      ...input,
      id,
      ownerId: currentUserId(),
      createdAt: now,
      updatedAt: now,
      synced: false,
      approvedBy: null,
      approvedAt: null,
      deletedAt: null,
      conflict: false,
      syncRetryCount: 0,
      syncLastError: null,
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
        (id, date,
         patient_age, patient_sex,
         case_number, primary_specialty, level_of_care,
         admitted, cardiac_arrest, involvement, reviewed_again,
         diagnosis, icd10_code, organ_systems, cobatrice_domains,
         outcome, communicated_with_relatives,
         teaching_delivered, teaching_recipient,
         supervision_level, notes, reflection,
         created_at, updated_at, synced,
         schema_version,
         diagnosis_coded, organ_systems_coded, cobatrice_domains_coded,
         supervision_level_coded, specialty_coded, level_of_care_coded, outcome_coded,
         provenance, quality, consent_status, license, owner_id,
         supervisor_user_id, observer_user_id, external_supervisor_name)
       VALUES (?, ?,
               ?, ?,
               ?, ?, ?,
               ?, ?, ?, ?,
               ?, ?, ?, ?,
               ?, ?,
               ?, ?,
               ?, ?, ?,
               ?, ?, 0,
               ?,
               ?, ?, ?,
               ?, ?, ?, ?,
               ?, ?, ?, ?, ?,
               ?, ?, ?)`,
      [
        id, input.date,
        input.patientAge ?? null, input.patientSex ?? null,
        input.caseNumber ?? null, input.primarySpecialty ?? null, input.levelOfCare ?? null,
        input.admitted === undefined ? null : input.admitted ? 1 : 0,
        input.cardiacArrest ? 1 : 0,
        input.involvement ?? null,
        input.reviewedAgain ? 1 : 0,
        input.diagnosis, input.icd10Code ?? '',
        JSON.stringify(input.organSystems), JSON.stringify(input.cobatriceDomains),
        input.outcome ?? null, input.communicatedWithRelatives ? 1 : 0,
        input.teachingDelivered ? 1 : 0, input.teachingRecipient ?? null,
        input.supervisionLevel, input.notes ?? null, input.reflection ?? '',
        now, now,
        CURRENT_SCHEMA_VERSION,
        coded.diagnosisCoded ? JSON.stringify(coded.diagnosisCoded) : null,
        JSON.stringify(coded.organSystemsCoded),
        JSON.stringify(coded.cobatriceDomainsCoded),
        JSON.stringify(coded.supervisionLevelCoded),
        coded.specialtyCoded ? JSON.stringify(coded.specialtyCoded) : null,
        coded.levelOfCareCoded ? JSON.stringify(coded.levelOfCareCoded) : null,
        coded.outcomeCoded ? JSON.stringify(coded.outcomeCoded) : null,
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
      patientAge: input.patientAge ?? existing.patientAge,
      patientSex: input.patientSex ?? existing.patientSex,
      caseNumber: input.caseNumber ?? existing.caseNumber,
      primarySpecialty: input.primarySpecialty ?? existing.primarySpecialty,
      levelOfCare: input.levelOfCare ?? existing.levelOfCare,
      admitted: input.admitted ?? existing.admitted,
      cardiacArrest: input.cardiacArrest ?? existing.cardiacArrest ?? false,
      involvement: input.involvement ?? existing.involvement,
      reviewedAgain: input.reviewedAgain ?? existing.reviewedAgain ?? false,
      diagnosis: input.diagnosis ?? existing.diagnosis,
      icd10Code: input.icd10Code ?? existing.icd10Code,
      organSystems: input.organSystems ?? existing.organSystems,
      cobatriceDomains: input.cobatriceDomains ?? existing.cobatriceDomains,
      outcome: input.outcome ?? existing.outcome,
      communicatedWithRelatives: input.communicatedWithRelatives ?? existing.communicatedWithRelatives ?? false,
      teachingDelivered: input.teachingDelivered ?? existing.teachingDelivered ?? false,
      teachingRecipient: input.teachingRecipient ?? existing.teachingRecipient,
      supervisionLevel: input.supervisionLevel ?? existing.supervisionLevel,
      notes: input.notes ?? existing.notes,
      supervisorUserId: input.supervisorUserId ?? existing.supervisorUserId,
      observerUserId: input.observerUserId ?? existing.observerUserId,
      externalSupervisorName: input.externalSupervisorName ?? existing.externalSupervisorName,
      reflection: input.reflection ?? existing.reflection,
    };

    const mergedExternalName = merged.externalSupervisorName?.trim() || null;
    const mergedSupervisorId = mergedExternalName
      ? null
      : (merged.supervisorUserId ?? null);

    const supervisorChanged =
      (existing.supervisorUserId ?? null) !== mergedSupervisorId;
    const coded = codify(merged);
    const now = nowISO();
    const draft: CaseLog = { ...existing, ...merged, ...coded, updatedAt: now };
    const quality = scoreCase(draft);

    const approvalReset = supervisorChanged
      ? `, approved_by = NULL, approved_at = NULL`
      : '';

    await db.runAsync(
      `UPDATE case_logs SET
        date = ?, patient_age = ?, patient_sex = ?,
        case_number = ?, primary_specialty = ?, level_of_care = ?,
        admitted = ?, cardiac_arrest = ?, involvement = ?, reviewed_again = ?,
        diagnosis = ?, icd10_code = ?, organ_systems = ?, cobatrice_domains = ?,
        outcome = ?, communicated_with_relatives = ?,
        teaching_delivered = ?, teaching_recipient = ?,
        supervision_level = ?, notes = ?, reflection = ?,
        updated_at = ?, synced = 0,
        diagnosis_coded = ?, organ_systems_coded = ?,
        cobatrice_domains_coded = ?, supervision_level_coded = ?,
        specialty_coded = ?, level_of_care_coded = ?, outcome_coded = ?,
        quality = ?,
        supervisor_user_id = ?, observer_user_id = ?, external_supervisor_name = ?
        ${approvalReset}
       WHERE id = ?`,
      [
        merged.date, merged.patientAge ?? null, merged.patientSex ?? null,
        merged.caseNumber ?? null, merged.primarySpecialty ?? null, merged.levelOfCare ?? null,
        merged.admitted === undefined ? null : merged.admitted ? 1 : 0,
        merged.cardiacArrest ? 1 : 0,
        merged.involvement ?? null,
        merged.reviewedAgain ? 1 : 0,
        merged.diagnosis, merged.icd10Code ?? '',
        JSON.stringify(merged.organSystems), JSON.stringify(merged.cobatriceDomains),
        merged.outcome ?? null, merged.communicatedWithRelatives ? 1 : 0,
        merged.teachingDelivered ? 1 : 0, merged.teachingRecipient ?? null,
        merged.supervisionLevel, merged.notes ?? null, merged.reflection ?? '',
        now,
        coded.diagnosisCoded ? JSON.stringify(coded.diagnosisCoded) : null,
        JSON.stringify(coded.organSystemsCoded),
        JSON.stringify(coded.cobatriceDomainsCoded),
        JSON.stringify(coded.supervisionLevelCoded),
        coded.specialtyCoded ? JSON.stringify(coded.specialtyCoded) : null,
        coded.levelOfCareCoded ? JSON.stringify(coded.levelOfCareCoded) : null,
        coded.outcomeCoded ? JSON.stringify(coded.outcomeCoded) : null,
        JSON.stringify(quality),
        mergedSupervisorId,
        merged.observerUserId ?? null,
        mergedExternalName,
        id,
      ]
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = nowISO();
    await db.runAsync(
      'UPDATE case_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }

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

  // ─── Derived queries ──────────────────────────────────────────────────────

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

  async getSpecialtyCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const scope = caseScopedWhere();
    const rows = await db.getAllAsync<{ specialty: string; count: number }>(
      `SELECT primary_specialty as specialty, COUNT(*) as count
       FROM case_logs
       WHERE deleted_at IS NULL AND primary_specialty IS NOT NULL AND ${scope.clause}
       GROUP BY primary_specialty`,
      scope.params
    );
    return Object.fromEntries(rows.map((r) => [r.specialty, r.count]));
  }

  async getLevelOfCareCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const scope = caseScopedWhere();
    const rows = await db.getAllAsync<{ level: string; count: number }>(
      `SELECT level_of_care as level, COUNT(*) as count
       FROM case_logs
       WHERE deleted_at IS NULL AND level_of_care IS NOT NULL AND ${scope.clause}
       GROUP BY level_of_care`,
      scope.params
    );
    return Object.fromEntries(rows.map((r) => [r.level, r.count]));
  }

  async getOutcomeCounts(): Promise<Record<string, number>> {
    const db = await getDatabase();
    const scope = caseScopedWhere();
    const rows = await db.getAllAsync<{ outcome: string; count: number }>(
      `SELECT outcome, COUNT(*) as count
       FROM case_logs
       WHERE deleted_at IS NULL AND outcome IS NOT NULL AND ${scope.clause}
       GROUP BY outcome`,
      scope.params
    );
    return Object.fromEntries(rows.map((r) => [r.outcome, r.count]));
  }

  /** Mortality rate = (died + withdrawn) / total with known outcome */
  async getMortalityRate(): Promise<number | null> {
    const counts = await this.getOutcomeCounts();
    const died = (counts['died'] ?? 0) + (counts['withdrawn'] ?? 0);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return died / total;
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
