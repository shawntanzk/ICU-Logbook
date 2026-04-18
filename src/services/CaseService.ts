import { getDatabase } from '../database/client';
import { CaseLog, CaseLogInput } from '../models/CaseLog';
import { IDataService } from './DataService';
import { generateUUID } from '../utils/uuid';
import { nowISO, startOfMonthISO } from '../utils/dateUtils';
import { icd10ToCoded } from '../data/icd10';
import { organSystemToCoded } from '../data/organSystems';
import { cobatriceToCoded } from '../data/cobatrice';
import { supervisionToCoded } from '../data/supervision';
import { captureProvenance } from './ProvenanceService';
import { getConsent } from './ConsentService';
import { scoreCase } from './QualityService';
import { CURRENT_SCHEMA_VERSION, DEFAULT_LICENSE } from '../models/Provenance';
import type { CodedValue } from '../models/CodedValue';

// SQLite row shape. v2 adds nine JSON/metadata columns alongside the
// original v1 columns. Old columns stay authoritative for queries the UI
// already runs (date, diagnosis, etc.); the coded columns are what the
// export pipeline reads.
interface CaseRow {
  id: string;
  date: string;
  diagnosis: string;
  icd10_code: string;
  organ_systems: string;
  cobatrice_domains: string;
  supervision_level: string;
  reflection: string;
  created_at: string;
  updated_at: string;
  synced: number;
  schema_version: string;
  diagnosis_coded: string | null;
  organ_systems_coded: string;
  cobatrice_domains_coded: string;
  supervision_level_coded: string | null;
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

function rowToModel(row: CaseRow): CaseLog {
  return {
    id: row.id,
    date: row.date,
    diagnosis: row.diagnosis,
    icd10Code: row.icd10_code,
    organSystems: parseJSON<string[]>(row.organ_systems, []),
    cobatriceDomains: parseJSON<string[]>(row.cobatrice_domains, []),
    supervisionLevel: row.supervision_level as CaseLog['supervisionLevel'],
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

// Derive all CodedValue fields from the raw user input. Kept pure so the
// unit tests can feed in any CaseLogInput shape.
function codify(input: CaseLogInput): Pick<
  CaseLog,
  'diagnosisCoded' | 'organSystemsCoded' | 'cobatriceDomainsCoded' | 'supervisionLevelCoded'
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
  };
}

class CaseServiceImpl implements IDataService<CaseLog, CaseLogInput> {
  async findAll(): Promise<CaseLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CaseRow>(
      'SELECT * FROM case_logs ORDER BY date DESC, created_at DESC'
    );
    return rows.map(rowToModel);
  }

  async findById(id: string): Promise<CaseLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CaseRow>(
      'SELECT * FROM case_logs WHERE id = ?',
      [id]
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

    // Quality needs the fully-constructed record, so compute on a draft.
    const draft: CaseLog = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
      synced: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      ...coded,
      provenance,
      quality: { completeness: 0, codingConfidence: 0 },
      consentStatus: consent,
      license: DEFAULT_LICENSE,
    };
    const quality = scoreCase(draft);

    await db.runAsync(
      `INSERT INTO case_logs
        (id, date, diagnosis, icd10_code, organ_systems, cobatrice_domains,
         supervision_level, reflection, created_at, updated_at, synced,
         schema_version, diagnosis_coded, organ_systems_coded,
         cobatrice_domains_coded, supervision_level_coded,
         provenance, quality, consent_status, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.date,
        input.diagnosis,
        input.icd10Code ?? '',
        JSON.stringify(input.organSystems),
        JSON.stringify(input.cobatriceDomains),
        input.supervisionLevel,
        input.reflection ?? '',
        now,
        now,
        CURRENT_SCHEMA_VERSION,
        coded.diagnosisCoded ? JSON.stringify(coded.diagnosisCoded) : null,
        JSON.stringify(coded.organSystemsCoded),
        JSON.stringify(coded.cobatriceDomainsCoded),
        JSON.stringify(coded.supervisionLevelCoded),
        JSON.stringify(provenance),
        JSON.stringify(quality),
        consent,
        DEFAULT_LICENSE,
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
      diagnosis: input.diagnosis ?? existing.diagnosis,
      icd10Code: input.icd10Code ?? existing.icd10Code,
      organSystems: input.organSystems ?? existing.organSystems,
      cobatriceDomains: input.cobatriceDomains ?? existing.cobatriceDomains,
      supervisionLevel: input.supervisionLevel ?? existing.supervisionLevel,
      reflection: input.reflection ?? existing.reflection,
    };
    const coded = codify(merged);
    const now = nowISO();
    const draft: CaseLog = { ...existing, ...merged, ...coded, updatedAt: now };
    const quality = scoreCase(draft);

    await db.runAsync(
      `UPDATE case_logs SET
        date = ?, diagnosis = ?, icd10_code = ?, organ_systems = ?,
        cobatrice_domains = ?, supervision_level = ?, reflection = ?,
        updated_at = ?, synced = 0,
        diagnosis_coded = ?, organ_systems_coded = ?,
        cobatrice_domains_coded = ?, supervision_level_coded = ?,
        quality = ?
       WHERE id = ?`,
      [
        merged.date,
        merged.diagnosis,
        merged.icd10Code ?? '',
        JSON.stringify(merged.organSystems),
        JSON.stringify(merged.cobatriceDomains),
        merged.supervisionLevel,
        merged.reflection ?? '',
        now,
        coded.diagnosisCoded ? JSON.stringify(coded.diagnosisCoded) : null,
        JSON.stringify(coded.organSystemsCoded),
        JSON.stringify(coded.cobatriceDomainsCoded),
        JSON.stringify(coded.supervisionLevelCoded),
        JSON.stringify(quality),
        id,
      ]
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM case_logs WHERE id = ?', [id]);
  }

  // ─── Derived queries ────────────────────────────────────────────────────────

  async countThisMonth(): Promise<number> {
    const db = await getDatabase();
    const start = startOfMonthISO();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM case_logs WHERE created_at >= ?',
      [start]
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

  async findByDateRange(from: string, to: string): Promise<CaseLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CaseRow>(
      'SELECT * FROM case_logs WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [from, to]
    );
    return rows.map(rowToModel);
  }
}

export const CaseService = new CaseServiceImpl();
