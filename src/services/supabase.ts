import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureAuthStorage } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in values from the Supabase dashboard.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    // Sessions live in the device keychain (iOS) / Keystore (Android)
    // via expo-secure-store, not AsyncStorage. See secureStorage.ts for
    // the chunking adapter that handles tokens larger than the iOS
    // keychain 2KB item ceiling.
    storage: secureAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE flow lets us complete the OAuth handshake on-device via
    // exchangeCodeForSession(code), so Google sign-in works in Expo
    // without a hosted server.
    flowType: 'pkce',
  },
});
