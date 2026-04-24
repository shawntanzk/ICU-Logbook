import { getDatabase } from '../database/client';
import { MedicinePlacementLog, MedicinePlacementLogInput } from '../models/MedicinePlacementLog';
import { generateUUID } from '../utils/uuid';
import { nowISO } from '../utils/dateUtils';
import { supervisionToCoded } from '../data/supervision';
import { specialtyToCoded } from '../data/specialties';
import { cobatriceToCoded } from '../data/cobatrice';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { currentUserId } from './AuthScope';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

interface MedPlacementRow {
  id: string; start_date: string; end_date: string | null;
  specialty: string; hospital: string | null; ward: string | null;
  patient_count: number | null;
  teaching_delivered: number; teaching_recipient: string | null;
  cobatrice_domains: string; reflection: string | null;
  supervision_level: string; supervisor_user_id: string | null;
  external_supervisor_name: string | null;
  owner_id: string | null; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; synced: number;
  deleted_at: string | null;
  schema_version: string;
  specialty_coded: string | null;
  cobatrice_domains_coded: string;
  supervision_level_coded: string | null;
  provenance: string | null; quality: string | null;
  consent_status: string; license: string;
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function rowToModel(row: MedPlacementRow): MedicinePlacementLog {
  return {
    id: row.id,
    startDate: row.start_date, endDate: row.end_date ?? undefined,
    specialty: row.specialty as MedicinePlacementLog['specialty'],
    hospital: row.hospital ?? undefined, ward: row.ward ?? undefined,
    patientCount: row.patient_count ?? undefined,
    teachingDelivered: row.teaching_delivered === 1,
    teachingRecipient: row.teaching_recipient as MedicinePlacementLog['teachingRecipient'] ?? undefined,
    cobatriceDomains: parseJSON<string[]>(row.cobatrice_domains, []),
    reflection: row.reflection ?? undefined,
    supervisionLevel: row.supervision_level as MedicinePlacementLog['supervisionLevel'],
    supervisorUserId: row.supervisor_user_id,
    externalSupervisorName: row.external_supervisor_name,
    ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    synced: row.synced === 1,
    schemaVersion: row.schema_version,
    specialtyCoded: parseJSON<CodedValue | null>(row.specialty_coded, null),
    cobatriceDomainsCoded: parseJSON<CodedValue[]>(row.cobatrice_domains_coded, []),
    supervisionLevelCoded: parseJSON<CodedValue | null>(row.supervision_level_coded, null) ?? supervisionToCoded(row.supervision_level)!,
    provenance: parseJSON(row.provenance, { appVersion: '0.0.0', schemaVersion: '1.0.0', deviceId: 'unknown', platform: 'ios' as const, locale: 'en-GB', timezone: 'UTC' }),
    quality: parseJSON(row.quality, { completeness: 0, codingConfidence: 0 }),
    consentStatus: (row.consent_status as MedicinePlacementLog['consentStatus']) ?? 'anonymous',
    license: row.license || DEFAULT_LICENSE,
  };
}

class MedicinePlacementServiceImpl {
  async findAll(): Promise<MedicinePlacementLog[]> {
    const db = await getDatabase();
    const userId = currentUserId();
    const rows = await db.getAllAsync<MedPlacementRow>(
      `SELECT * FROM medicine_placement_logs WHERE deleted_at IS NULL AND (owner_id = ? OR owner_id IS NULL) ORDER BY start_date DESC`,
      [userId ?? '']
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<MedicinePlacementLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<MedPlacementRow>(
      `SELECT * FROM medicine_placement_logs WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    return row ? rowToModel(row) : null;
  }

  async create(input: MedicinePlacementLogInput): Promise<MedicinePlacementLog> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = nowISO();
    const provenance = await captureProvenance();
    const consent = await getConsent();
    const specialtyCoded = specialtyToCoded(input.specialty);
    const cobatriceCoded = input.cobatriceDomains.map(cobatriceToCoded).filter((v): v is CodedValue => v !== null);
    const supervisionCoded = supervisionToCoded(input.supervisionLevel)!;
    const externalName = input.externalSupervisorName?.trim() || null;
    const supervisorId = externalName ? null : (input.supervisorUserId ?? null);

    await db.runAsync(
      `INSERT INTO medicine_placement_logs
        (id, start_date, end_date, specialty, hospital, ward,
         patient_count, teaching_delivered, teaching_recipient,
         cobatrice_domains, reflection,
         supervision_level, supervisor_user_id, external_supervisor_name,
         owner_id, created_at, updated_at, synced, schema_version,
         specialty_coded, cobatrice_domains_coded, supervision_level_coded,
         provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.startDate, input.endDate ?? null,
        input.specialty, input.hospital ?? null, input.ward ?? null,
        input.patientCount ?? null,
        input.teachingDelivered ? 1 : 0, input.teachingRecipient ?? null,
        JSON.stringify(input.cobatriceDomains), input.reflection ?? null,
        input.supervisionLevel, supervisorId, externalName,
        currentUserId(), now, now,
        CURRENT_SCHEMA_VERSION,
        specialtyCoded ? JSON.stringify(specialtyCoded) : null,
        JSON.stringify(cobatriceCoded),
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
      'UPDATE medicine_placement_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
      [now, now, id]
    );
  }
}

export const MedicinePlacementService = new MedicinePlacementServiceImpl();
