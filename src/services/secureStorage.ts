import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Drop-in storage adapter for Supabase's auth session, backed by the
// device keychain / Keystore via expo-secure-store.
//
// Why not AsyncStorage: AsyncStorage is unencrypted on both iOS and
// Android, so access + refresh tokens would sit in the app sandbox in
// plaintext. SecureStore puts them in Keychain (iOS) / EncryptedSharedPrefs
// (Android). That's the minimum bar for anything handling clinical data.
//
// Why the chunking: iOS keychain items have a practical ~2KB ceiling on
// the `kSecValueData` payload. Supabase sessions (JWT access token +
// refresh token + user object) routinely run 3-5KB, so we split the
// value across chunk keys and store a manifest under `${key}.meta` that
// records how many chunks exist. Web has no SecureStore, so we fall
// back to localStorage there (dev/web preview only; production ships
// native builds).

const CHUNK_SIZE = 1800;
const META_SUFFIX = '.meta';
const CHUNK_SUFFIX = '.chunk.';

interface ChunkMeta {
  chunks: number;
}

async function clearChunks(key: string): Promise<void> {
  const meta = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`).catch(() => null);
  if (meta) {
    try {
      const { chunks } = JSON.parse(meta) as ChunkMeta;
      await Promise.all(
        Array.from({ length: chunks }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}${CHUNK_SUFFIX}${i}`).catch(() => undefined)
        )
      );
    } catch {
      // Corrupt manifest — best effort cleanup below.
    }
    await SecureStore.deleteItemAsync(`${key}${META_SUFFIX}`).catch(() => undefined);
  }
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      const metaStr = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`);
      if (!metaStr) {
        return await SecureStore.getItemAsync(key);
      }
      const { chunks } = JSON.parse(metaStr) as ChunkMeta;
      const parts = await Promise.all(
        Array.from({ length: chunks }, (_, i) => SecureStore.getItemAsync(`${key}${CHUNK_SUFFIX}${i}`))
      );
      if (parts.some((p) => p == null)) return null;
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      } catch {
        // no-op
      }
      return;
    }
    await clearChunks(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    const meta: ChunkMeta = { chunks };
    await SecureStore.setItemAsync(`${key}${META_SUFFIX}`, JSON.stringify(meta));
    for (let i = 0; i < chunks; i++) {
      const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}${CHUNK_SUFFIX}${i}`, slice);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      } catch {
        // no-op
      }
      return;
    }
    await clearChunks(key);
  },
};
