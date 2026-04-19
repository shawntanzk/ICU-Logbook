import { create } from 'zustand';
import { ProcedureLog, ProcedureLogInput } from '../models/ProcedureLog';
import { ProcedureService } from '../services/ProcedureService';

interface ProcedureStore {
  procedures: ProcedureLog[];
  successRate: number;
  typeCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;

  fetchProcedures: () => Promise<void>;
  addProcedure: (input: ProcedureLogInput) => Promise<ProcedureLog>;
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
    return proc;
  },

  deleteProcedure: async (id) => {
    await ProcedureService.delete(id);
    set((s) => ({ procedures: s.procedures.filter((p) => p.id !== id) }));
    get().refreshStats();
  },

  approveProcedure: async (id) => {
    const updated = await ProcedureService.approve(id);
    set((s) => ({ procedures: s.procedures.map((p) => (p.id === id ? updated : p)) }));
  },

  revokeProcedureApproval: async (id) => {
    const updated = await ProcedureService.revokeApproval(id);
    set((s) => ({ procedures: s.procedures.map((p) => (p.id === id ? updated : p)) }));
  },

  refreshStats: async () => {
    const [successRate, typeCounts] = await Promise.all([
      ProcedureService.getSuccessRate(),
      ProcedureService.getTypeCounts(),
    ]);
    set({ successRate, typeCounts });
  },
}));
