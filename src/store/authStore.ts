import { create } from 'zustand';
import {
  AuthedUser,
  UserRole,
  signIn as svcSignIn,
  signOut as svcSignOut,
  restoreSession,
  hasAnyUser,
  createFirstAdmin as svcCreateFirstAdmin,
} from '../services/AuthService';
import { setAuthState } from '../services/authState';
import { useCaseStore } from './caseStore';
import { useProcedureStore } from './procedureStore';

export type { UserRole };

// Wipe cached records when the active user changes, so the next
// signed-in user doesn't briefly see the previous user's data before
// screens refetch.
function resetDataStores(): void {
  useCaseStore.setState({ cases: [], domainCounts: {}, casesThisMonth: 0, error: null });
  useProcedureStore.setState({ procedures: [], successRate: 0, typeCounts: {}, error: null });
}

interface AuthStore {
  isLoggedIn: boolean;
  hydrated: boolean;
  needsInitialSetup: boolean;

  userId: string | null;
  email: string | null;
  userName: string;
  role: UserRole | null;

  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  createFirstAdmin: (input: {
    email: string;
    displayName: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

function apply(set: (partial: Partial<AuthStore>) => void, user: AuthedUser | null): void {
  if (user) {
    set({
      isLoggedIn: true,
      userId: user.id,
      email: user.email,
      userName: user.displayName,
      role: user.role,
    });
    setAuthState({ userId: user.id, role: user.role });
  } else {
    set({ isLoggedIn: false, userId: null, email: null, userName: '', role: null });
    setAuthState({ userId: null, role: null });
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  hydrated: false,
  needsInitialSetup: false,
  userId: null,
  email: null,
  userName: '',
  role: null,

  signIn: async (email, password) => {
    const result = await svcSignIn(email, password);
    if (result.ok && result.user) {
      resetDataStores();
      apply(set, result.user);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  },

  createFirstAdmin: async (input) => {
    try {
      const result = await svcCreateFirstAdmin(input);
      if (result.ok && result.user) {
        resetDataStores();
        apply(set, result.user);
        set({ needsInitialSetup: false });
        return { ok: true };
      }
      return { ok: false, error: result.error ?? 'Could not create admin account.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error.' };
    }
  },

  logout: async () => {
    await svcSignOut();
    resetDataStores();
    apply(set, null);
  },

  restore: async () => {
    const user = await restoreSession();
    apply(set, user);
    const anyUser = await hasAnyUser();
    set({ hydrated: true, needsInitialSetup: !anyUser });
  },
}));
