import { create } from 'zustand';
import { SyncService } from '../services/SyncService';
import type { SyncStatus } from '../services/DataService';
import { useCaseStore } from './caseStore';
import { useProcedureStore } from './procedureStore';

interface SyncStore {
  isSyncing: boolean;
  status: SyncStatus;
  lastResult: { synced: number; failed: number } | null;
  error: string | null;

  sync: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set) => ({
  isSyncing: false,
  status: { lastSyncedAt: null, pendingCount: 0, conflictCount: 0 },
  lastResult: null,
  error: null,

  sync: async () => {
    set({ isSyncing: true, error: null });
    try {
      const result = await SyncService.syncPending();
      const status = await SyncService.getSyncStatus();
      set({ isSyncing: false, status, lastResult: { synced: result.synced, failed: result.failed } });
      // After a successful pull-down, refetch local-derived UI state so
      // users see remote edits without needing to swipe-refresh.
      await Promise.all([
        useCaseStore.getState().fetchCases(),
        useProcedureStore.getState().fetchProcedures(),
      ]);
    } catch (e) {
      set({ isSyncing: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshStatus: async () => {
    const status = await SyncService.getSyncStatus();
    set({ status });
  },
}));
