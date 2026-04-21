import { create } from 'zustand';
import { getSetting, setSetting } from '../services/SettingsService';

// Terms & Privacy acceptance gate. Stored as "<version>|<ISO-ts>" so that
// bumping TERMS_VERSION forces existing users to re-accept when we change
// the document (GDPR/HIPAA audits need proof of consent to the exact text
// the user saw). Legacy "1" values from earlier builds are treated as
// accepted against version 1.
const KEY = 'terms_accepted';
export const TERMS_VERSION = '1';

interface TermsStore {
  acceptedVersion: string | null;
  acceptedAt: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  accept: () => Promise<void>;
}

export const useTermsStore = create<TermsStore>((set) => ({
  acceptedVersion: null,
  acceptedAt: null,
  hydrated: false,
  hydrate: async () => {
    const raw = await getSetting(KEY);
    if (!raw) {
      set({ hydrated: true });
      return;
    }
    const [version, ts] = raw.includes('|') ? raw.split('|') : [raw, null];
    set({ acceptedVersion: version, acceptedAt: ts, hydrated: true });
  },
  accept: async () => {
    const now = new Date().toISOString();
    await setSetting(KEY, `${TERMS_VERSION}|${now}`);
    set({ acceptedVersion: TERMS_VERSION, acceptedAt: now });
  },
}));

export function isTermsAccepted(): boolean {
  const s = useTermsStore.getState();
  return s.acceptedVersion === TERMS_VERSION;
}
