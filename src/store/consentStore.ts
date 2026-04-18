import { create } from 'zustand';
import { ConsentStatus } from '../models/Provenance';
import {
  getConsent,
  setConsent as persistConsent,
  hasMadeConsentChoice,
} from '../services/ConsentService';

// Mirrors the persisted consent state in memory so UI can read it
// synchronously. Hydrated on app launch via `hydrate()`.

interface ConsentState {
  status: ConsentStatus;
  hasChosen: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setStatus: (status: ConsentStatus) => Promise<void>;
}

export const useConsentStore = create<ConsentState>((set) => ({
  status: 'none',
  hasChosen: false,
  hydrated: false,

  hydrate: async () => {
    const [status, hasChosen] = await Promise.all([
      getConsent(),
      hasMadeConsentChoice(),
    ]);
    set({ status, hasChosen, hydrated: true });
  },

  setStatus: async (status) => {
    await persistConsent(status);
    set({ status, hasChosen: true });
  },
}));
