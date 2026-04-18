import { ConsentStatus } from '../models/Provenance';
import { getSetting, setSetting } from './SettingsService';

// Consent model: the user chooses once (with the option to change later in
// Settings). Consent is attached to every new record at save-time. Upgrades
// are forward-looking only — changing from "anonymous" to "research" does
// NOT retroactively change older records (that would break the consent
// receipt model).

const CONSENT_KEY = 'consent_status';
const CONSENT_TIMESTAMP_KEY = 'consent_timestamp';

export async function getConsent(): Promise<ConsentStatus> {
  const v = await getSetting(CONSENT_KEY);
  if (v === 'none' || v === 'anonymous' || v === 'research' || v === 'commercial') {
    return v;
  }
  // First launch — default to "none" so the onboarding screen forces an
  // explicit choice before any record is saved.
  return 'none';
}

export async function setConsent(status: ConsentStatus): Promise<void> {
  await setSetting(CONSENT_KEY, status);
  await setSetting(CONSENT_TIMESTAMP_KEY, new Date().toISOString());
}

export async function getConsentTimestamp(): Promise<string | null> {
  return getSetting(CONSENT_TIMESTAMP_KEY);
}

export async function hasMadeConsentChoice(): Promise<boolean> {
  const v = await getSetting(CONSENT_KEY);
  return v !== null;
}
