import { create } from 'zustand';
import { ProcedureLog, ProcedureLogInput } from '../models/ProcedureLog';
import { ProcedureService } from '../services/ProcedureService';
import { SyncService } from '../services/SyncService';

function triggerSync(): void {
  void SyncService.syncPending().catch(() => {});
}

interface ProcedureStore {
  procedures: ProcedureLog[];
  successRate: number;
  typeCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;

  fetchProcedures: () => Promise<void>;
  addProcedure: (input: ProcedureLogInput) => Promise<ProcedureLog>;
  updateProcedure: (id: string, input: Partial<ProcedureLogInput>) => Promise<void>;
  deleteProcedure: (id: string) => Promise<void>;
  approveProcedure: (id: string) => Promise<void>;
  revokeProcedureApproval: (id: string) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useProcedureStore = create<ProcedureStore>((set, get) => ({
  procedures: [],
  successRate: 0,
  typeCounts: {},
  isLoading: false,
  error: null,

  fetchProcedures: async () => {
    set({ isLoading: true, error: null });
    try {
      const procedures = await ProcedureService.findAll();
      set({ procedures, isLoading: false });
      get().refreshStats();
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addProcedure: async (input) => {
    const proc = await ProcedureService.create(input);
    set((s) => ({ procedures: [proc, ...s.procedures] }));
    get().refreshStats();
    triggerSync();
    return proc;
  },

  updateProcedure: async (id, input) => {
    const updated = await ProcedureService.update(id, input);
    set((s) => ({ procedures: s.procedures.map((p) => (p.id === id ? updated : p)) }));
    get().refreshStats();
    triggerSync();
  },

  deleteProcedure: async (id) => {
    await ProcedureService.delete(id);
    set((s) => ({ procedures: s.procedures.filter((p) => p.id !== id) }));
    get().refreshStats();
    triggerSync();
  },

  approveProcedure: async (id) => {
    const updated = await ProcedureService.approve(id);
    set((s) => ({ procedures: s.procedures.map((p) => (p.id === id ? updated : p)) }));
    triggerSync();
  },

  revokeProcedureApproval: async (id) => {
    const updated = await ProcedureService.revokeApproval(id);
    set((s) => ({ procedures: s.procedures.map((p) => (p.id === id ? updated : p)) }));
    triggerSync();
  },

  refreshStats: async () => {
    const [successRate, typeCounts] = await Promise.all([
      ProcedureService.getSuccessRate(),
      ProcedureService.getTypeCounts(),
    ]);
    set({ successRate, typeCounts });
  },
}));
