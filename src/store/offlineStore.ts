import { create } from 'zustand';
import { getSetting, setSetting } from '../services/SettingsService';

// "Offline-only" mode. When true, the app never talks to Supabase:
// logins fail, sync is skipped, nothing leaves the device. Intended
// for users who want a pure local logbook with no cloud footprint.
const OFFLINE_KEY = 'offline_only_mode';

interface OfflineStore {
  offlineOnly: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setOfflineOnly: (value: boolean) => Promise<void>;
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  offlineOnly: false,
  hydrated: false,
  hydrate: async () => {
    const raw = await getSetting(OFFLINE_KEY);
    set({ offlineOnly: raw === '1', hydrated: true });
  },
  setOfflineOnly: async (value) => {
    await setSetting(OFFLINE_KEY, value ? '1' : '0');
    set({ offlineOnly: value });
  },
}));

export function isOfflineOnly(): boolean {
  return useOfflineStore.getState().offlineOnly;
}
