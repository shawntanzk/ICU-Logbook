// Interfaces that decouple business logic from the storage implementation.
// Swap the concrete implementations for Supabase / REST clients later
// without touching any screen or store code.

export interface IDataService<T, TInput> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: string, input: Partial<TInput>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ─── Sync service stub ────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
  pending: number;
}

export interface SyncStatus {
  lastSyncedAt: string | null; // ISO string
  pendingCount: number;
  conflictCount: number;
}

export interface ISyncService {
  syncPending(): Promise<SyncResult>;
  getSyncStatus(): Promise<SyncStatus>;
}
