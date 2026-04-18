import { create } from 'zustand';
import { SyncService } from '../services/SyncService';
import type { SyncStatus } from '../services/DataService';

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
  status: { lastSyncedAt: null, pendingCount: 0 },
  lastResult: null,
  error: null,

  sync: async () => {
    set({ isSyncing: true, error: null });
    try {
      const result = await SyncService.syncPending();
      const status = await SyncService.getSyncStatus();
      set({ isSyncing: false, status, lastResult: { synced: result.synced, failed: result.failed } });
    } catch (e) {
      set({ isSyncing: false, error: String(e) });
    }
  },

  refreshStatus: async () => {
    const status = await SyncService.getSyncStatus();
    set({ status });
  },
}));
