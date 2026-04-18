import { Platform, NativeModules } from 'react-native';
import { Provenance, CURRENT_SCHEMA_VERSION } from '../models/Provenance';
import { getSetting, setSetting } from './SettingsService';
import { generateUUID } from '../utils/uuid';

const APP_VERSION = '1.0.0'; // kept in sync with package.json / app.json
const DEVICE_ID_KEY = 'device_id';

// Per-install device identifier. Generated lazily on first use and cached
// in the settings table so it survives across sessions. NOT tied to the
// user — just a stable handle for provenance / de-duplication on the
// server side.
async function getDeviceId(): Promise<string> {
  const existing = await getSetting(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh = generateUUID();
  await setSetting(DEVICE_ID_KEY, fresh);
  return fresh;
}

function resolveLocale(): string {
  // react-native doesn't ship a single locale API across platforms. Fall
  // back to a sensible default if neither is available.
  const settings = NativeModules.SettingsManager?.settings;
  return (
    settings?.AppleLocale ||
    settings?.AppleLanguages?.[0] ||
    NativeModules.I18nManager?.localeIdentifier ||
    'en-GB'
  );
}

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function captureProvenance(): Promise<Provenance> {
  return {
    appVersion: APP_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    deviceId: await getDeviceId(),
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    locale: resolveLocale(),
    timezone: resolveTimezone(),
  };
}
