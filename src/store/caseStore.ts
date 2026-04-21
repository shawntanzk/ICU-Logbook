import { create } from 'zustand';
import { CaseLog, CaseLogInput } from '../models/CaseLog';
import { CaseService } from '../services/CaseService';
import { SyncService } from '../services/SyncService';

// Fire-and-forget sync. SyncService no-ops in offline-only mode and
// when signed out, so callers can invoke this freely after every write.
function triggerSync(): void {
  void SyncService.syncPending().catch(() => {});
}

interface CaseStore {
  cases: CaseLog[];
  domainCounts: Record<string, number>;
  casesThisMonth: number;
  isLoading: boolean;
  error: string | null;

  fetchCases: () => Promise<void>;
  addCase: (input: CaseLogInput) => Promise<CaseLog>;
  updateCase: (id: string, input: Partial<CaseLogInput>) => Promise<void>;
  deleteCase: (id: string) => Promise<void>;
  approveCase: (id: string) => Promise<void>;
  revokeCaseApproval: (id: string) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  domainCounts: {},
  casesThisMonth: 0,
  isLoading: false,
  error: null,

  fetchCases: async () => {
    set({ isLoading: true, error: null });
    try {
      const cases = await CaseService.findAll();
      set({ cases, isLoading: false });
      get().refreshStats();
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addCase: async (input) => {
    const newCase = await CaseService.create(input);
    set((s) => ({ cases: [newCase, ...s.cases] }));
    get().refreshStats();
    triggerSync();
    return newCase;
  },

  updateCase: async (id, input) => {
    const updated = await CaseService.update(id, input);
    set((s) => ({
      cases: s.cases.map((c) => (c.id === id ? updated : c)),
    }));
    get().refreshStats();
    triggerSync();
  },

  deleteCase: async (id) => {
    await CaseService.delete(id);
    set((s) => ({ cases: s.cases.filter((c) => c.id !== id) }));
    get().refreshStats();
    triggerSync();
  },

  approveCase: async (id) => {
    const updated = await CaseService.approve(id);
    set((s) => ({ cases: s.cases.map((c) => (c.id === id ? updated : c)) }));
    triggerSync();
  },

  revokeCaseApproval: async (id) => {
    const updated = await CaseService.revokeApproval(id);
    set((s) => ({ cases: s.cases.map((c) => (c.id === id ? updated : c)) }));
    triggerSync();
  },

  refreshStats: async () => {
    const [domainCounts, casesThisMonth] = await Promise.all([
      CaseService.getDomainCounts(),
      CaseService.countThisMonth(),
    ]);
    set({ domainCounts, casesThisMonth });
  },
}));
