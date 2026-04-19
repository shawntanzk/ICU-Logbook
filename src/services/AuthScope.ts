import { getAuthState } from './authState';

// SQL WHERE fragments that limit reads to rows the current user is
// entitled to see.
//
//   admin       → all rows (1=1)
//   user        → rows they own; for cases/procedures, also rows where
//                 they're listed as supervisor or observer
//   logged out  → no rows (safety; should never trigger in-app since
//                 every screen lives behind the auth gate)
export type ScopeParam = string | number | null;
export interface ScopedClause {
  clause: string;
  params: ScopeParam[];
}

export function scopedWhere(): ScopedClause {
  const { role, userId } = getAuthState();
  if (!role || !userId) return { clause: '0 = 1', params: [] };
  if (role === 'admin') return { clause: '1 = 1', params: [] };
  return { clause: 'owner_id = ?', params: [userId] };
}

export function caseScopedWhere(): ScopedClause {
  return supervisedScopedWhere();
}

export function procedureScopedWhere(): ScopedClause {
  return supervisedScopedWhere();
}

function supervisedScopedWhere(): ScopedClause {
  const { role, userId } = getAuthState();
  if (!role || !userId) return { clause: '0 = 1', params: [] };
  if (role === 'admin') return { clause: '1 = 1', params: [] };
  return {
    clause: '(owner_id = ? OR supervisor_user_id = ? OR observer_user_id = ?)',
    params: [userId, userId, userId],
  };
}

export function currentUserId(): string | null {
  return getAuthState().userId;
}
