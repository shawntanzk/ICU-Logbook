import { ISyncService, SyncResult, SyncStatus } from './DataService';
import { getDatabase } from '../database/client';
import { supabaseMock } from './supabase';
import { nowISO } from '../utils/dateUtils';

// Tracks last sync time in memory (replace with AsyncStorage for persistence)
let _lastSyncedAt: string | null = null;

class SyncServiceImpl implements ISyncService {
  async syncPending(): Promise<SyncResult> {
    const db = await getDatabase();

    // Gather unsynced rows
    const unsyncedCases = await db.getAllAsync<{ id: string }>(
      'SELECT * FROM case_logs WHERE synced = 0'
    );
    const unsyncedProcs = await db.getAllAsync<{ id: string }>(
      'SELECT * FROM procedure_logs WHERE synced = 0'
    );

    const total = unsyncedCases.length + unsyncedProcs.length;
    if (total === 0) {
      return { synced: 0, failed: 0, pending: 0 };
    }

    // Push to (mock) Supabase
    const [casesResult, procsResult] = await Promise.all([
      unsyncedCases.length > 0
        ? supabaseMock.from('case_logs').upsert(unsyncedCases)
        : Promise.resolve({ error: null }),
      unsyncedProcs.length > 0
        ? supabaseMock.from('procedure_logs').upsert(unsyncedProcs)
        : Promise.resolve({ error: null }),
    ]);

    let synced = 0;
    let failed = 0;

    if (!casesResult.error) {
      await db.execAsync('UPDATE case_logs SET synced = 1 WHERE synced = 0');
      synced += unsyncedCases.length;
    } else {
      failed += unsyncedCases.length;
    }

    if (!procsResult.error) {
      await db.execAsync('UPDATE procedure_logs SET synced = 1 WHERE synced = 0');
      synced += unsyncedProcs.length;
    } else {
      failed += unsyncedProcs.length;
    }

    if (synced > 0) _lastSyncedAt = nowISO();

    return { synced, failed, pending: failed };
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM case_logs WHERE synced = 0 UNION ALL SELECT COUNT(*) FROM procedure_logs WHERE synced = 0'
    );
    // Simpler: sum both tables
    const cases = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM case_logs WHERE synced = 0'
    );
    const procs = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM procedure_logs WHERE synced = 0'
    );
    return {
      lastSyncedAt: _lastSyncedAt,
      pendingCount: (cases?.count ?? 0) + (procs?.count ?? 0),
    };
  }
}

export const SyncService = new SyncServiceImpl();
