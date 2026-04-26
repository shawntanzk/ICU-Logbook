import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { setAuthState } from '../services/authState';

// ─── Keys ────────────────────────────────────────────────────────────────────
const GUEST_FLAG_KEY = 'guest_mode_active';
const LOCAL_USER_ID_KEY = 'guest_local_user_id';

// ─── Store ───────────────────────────────────────────────────────────────────
interface GuestStore {
  /** True when the user is using the app without a Supabase account. */
  isGuest: boolean;
  /**
   * Stable UUID that acts as the owner_id for all data created in guest
   * mode. Persists across sessions so the same user always sees their
   * own offline data if they return in guest mode.
   */
  localUserId: string | null;

  /**
   * Switch into guest mode. Generates (or reuses) a stable local UUID
   * and wires it into authState so all services work normally.
   */
  enterGuestMode: () => Promise<void>;

  /**
   * Switch out of guest mode (called just before a successful login so
   * authStore.apply() can immediately overwrite authState with the real
   * Supabase userId).
   */
  exitGuestMode: () => Promise<void>;

  /**
   * Read persisted guest state on app startup. Must be called AFTER
   * authStore.restore() so that a live Supabase session always wins.
   */
  hydrate: () => Promise<void>;
}

export const useGuestStore = create<GuestStore>((set) => ({
  isGuest: false,
  localUserId: null,

  enterGuestMode: async () => {
    // Reuse the same local UUID across sessions for data continuity.
    let localUserId = await AsyncStorage.getItem(LOCAL_USER_ID_KEY);
    if (!localUserId) {
      localUserId = Crypto.randomUUID();
      await AsyncStorage.setItem(LOCAL_USER_ID_KEY, localUserId);
    }
    await AsyncStorage.setItem(GUEST_FLAG_KEY, '1');
    set({ isGuest: true, localUserId });
    // Wire into authState so CaseService / ProcedureService / AuthScope all
    // function normally — guest rows are scoped by this UUID.
    setAuthState({ userId: localUserId, role: 'user' });
  },

  exitGuestMode: async () => {
    await AsyncStorage.removeItem(GUEST_FLAG_KEY);
    // Keep LOCAL_USER_ID_KEY so re-entering guest mode later reuses the
    // same UUID and the user sees their old offline data.
    set({ isGuest: false });
    // authState will be overwritten immediately by authStore.apply().
  },

  hydrate: async () => {
    const [flag, localUserId] = await Promise.all([
      AsyncStorage.getItem(GUEST_FLAG_KEY),
      AsyncStorage.getItem(LOCAL_USER_ID_KEY),
    ]);
    if (flag === '1' && localUserId) {
      set({ isGuest: true, localUserId });
      setAuthState({ userId: localUserId, role: 'user' });
    }
  },
}));

// ─── Module-level helpers (no React hooks required) ──────────────────────────

export function isGuestMode(): boolean {
  return useGuestStore.getState().isGuest;
}

export function getLocalUserId(): string | null {
  return useGuestStore.getState().localUserId;
}
