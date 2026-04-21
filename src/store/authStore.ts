import { create } from 'zustand';
import {
  AuthedUser,
  UserRole,
  signIn as svcSignIn,
  signUp as svcSignUp,
  signInWithGoogle as svcSignInWithGoogle,
  signOut as svcSignOut,
  restoreSession,
  sendPasswordResetEmail as svcSendPasswordReset,
  updatePassword as svcUpdatePassword,
} from '../services/AuthService';
import { setAuthState } from '../services/authState';
import { setReportingUser } from '../services/errorReporting';
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

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}

interface AuthStore {
  isLoggedIn: boolean;
  hydrated: boolean;

  userId: string | null;
  email: string | null;
  userName: string;
  role: UserRole | null;

  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (input: { email: string; displayName: string; password: string }) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
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
    setReportingUser(user.id, user.role);
  } else {
    set({ isLoggedIn: false, userId: null, email: null, userName: '', role: null });
    setAuthState({ userId: null, role: null });
    setReportingUser(null, null);
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  hydrated: false,
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

  signUp: async (input) => {
    try {
      const result = await svcSignUp(input);
      if (result.ok && result.user) {
        resetDataStores();
        apply(set, result.user);
        return { ok: true };
      }
      if (result.needsEmailConfirmation) {
        return { ok: false, needsEmailConfirmation: true };
      }
      return { ok: false, error: result.error ?? 'Could not create account.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error.' };
    }
  },

  signInWithGoogle: async () => {
    try {
      const result = await svcSignInWithGoogle();
      if (result.ok && result.user) {
        resetDataStores();
        apply(set, result.user);
        return { ok: true };
      }
      return { ok: false, error: result.error ?? 'Google sign-in failed.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error.' };
    }
  },

  sendPasswordReset: async (email) => {
    const result = await svcSendPasswordReset(email);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },

  updatePassword: async (newPassword) => {
    const result = await svcUpdatePassword(newPassword);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },

  logout: async () => {
    await svcSignOut();
    resetDataStores();
    apply(set, null);
  },

  restore: async () => {
    const user = await restoreSession();
    apply(set, user);
    set({ hydrated: true });
  },
}));
