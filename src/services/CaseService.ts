import { getDatabase } from '../database/client';
import { CaseLog, CaseLogInput } from '../models/CaseLog';
import { IDataService } from './DataService';
import { generateUUID } from '../utils/uuid';
import { nowISO, startOfMonthISO } from '../utils/dateUtils';

// Row shape returned by SQLite (snake_case, JSON-encoded arrays)
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
}

function rowToModel(row: CaseRow): CaseLog {
  return {
    id: row.id,
    date: row.date,
    diagnosis: row.diagnosis,
    icd10Code: row.icd10_code,
    organSystems: JSON.parse(row.organ_systems) as string[],
    cobatriceDomains: JSON.parse(row.cobatrice_domains) as string[],
    supervisionLevel: row.supervision_level as CaseLog['supervisionLevel'],
    reflection: row.reflection,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: row.synced === 1,
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
    await db.runAsync(
      `INSERT INTO case_logs
        (id, date, diagnosis, icd10_code, organ_systems, cobatrice_domains,
         supervision_level, reflection, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
      ]
    );
    return (await this.findById(id))!;
  }

  async update(id: string, input: Partial<CaseLogInput>): Promise<CaseLog> {
    const db = await getDatabase();
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Case ${id} not found`);

    const merged = { ...existing, ...input };
    const now = nowISO();
    await db.runAsync(
      `UPDATE case_logs SET
        date = ?, diagnosis = ?, icd10_code = ?, organ_systems = ?,
        cobatrice_domains = ?, supervision_level = ?, reflection = ?,
        updated_at = ?, synced = 0
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

  // Returns { domainId: count } for all cases
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

  // Filter by date range
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
