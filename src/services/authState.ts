import type { UserRole } from './AuthService';

// Minimal shared auth-state ref. Broken out from `authStore` so that
// service-layer modules (AuthScope, CaseService, ProcedureService) can
// read role/userId without importing the Zustand store, which would
// create a require cycle: authStore → caseStore → CaseService →
// AuthScope → authStore.
interface AuthStateRef {
  userId: string | null;
  role: UserRole | null;
}

const ref: AuthStateRef = { userId: null, role: null };

export function setAuthState(next: AuthStateRef): void {
  ref.userId = next.userId;
  ref.role = next.role;
}

export function getAuthState(): AuthStateRef {
  return ref;
}
