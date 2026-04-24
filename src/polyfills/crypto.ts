// WebCrypto polyfill for Supabase PKCE in React Native / Hermes.
//
// Supabase auth-js checks:
//   typeof crypto.subtle !== 'undefined'
// before deciding whether to use SHA-256 (s256) or plain PKCE.
// When crypto.subtle is absent the library falls back to plain mode —
// the verifier is sent directly as the code_challenge, removing the
// SHA-256 binding that prevents auth code interception.
//
// On Hermes (React Native 0.73+) crypto.getRandomValues IS available,
// but crypto.subtle may not be (engine-version dependent).
// This file patches the gap using expo-crypto, which ships a JSI-backed
// native digest implementation — no network, no pure-JS fallback.
//
// IMPORTANT: import this file at the very top of index.js, before any
// import that transitively loads @supabase/supabase-js.

import * as ExpoCrypto from 'expo-crypto';

// ── Ensure global crypto object exists ───────────────────────────────────────
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).crypto = {};
}

// ── Polyfill getRandomValues if missing ──────────────────────────────────────
// Hermes has this in RN 0.73+ but guard defensively.
if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  // @ts-expect-error: patching non-standard global
  globalThis.crypto.getRandomValues = <T extends ArrayBufferView>(array: T): T => {
    return ExpoCrypto.getRandomValues(array);
  };
}

// ── Polyfill crypto.subtle.digest ─────────────────────────────────────────────
// Supabase's PKCE code only calls crypto.subtle.digest('SHA-256', data) where
// data = TextEncoder.encode(codeVerifier). The verifier is a hex string
// (ASCII-only), so decoding the UTF-8 bytes back to a string is lossless.
if (typeof globalThis.crypto.subtle === 'undefined') {
  const ALGO_MAP: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
    'SHA-1':   ExpoCrypto.CryptoDigestAlgorithm.SHA1,
    'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
    'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
  };

  const subtle = {
    async digest(
      algorithm: AlgorithmIdentifier,
      data: ArrayBuffer | ArrayBufferView
    ): Promise<ArrayBuffer> {
      const algoName =
        typeof algorithm === 'string' ? algorithm : algorithm.name;
      const expoAlgo = ALGO_MAP[algoName.toUpperCase()] ??
        ALGO_MAP[algoName] ??
        ExpoCrypto.CryptoDigestAlgorithm.SHA256;

      // Coerce data to Uint8Array regardless of input type.
      const bytes: Uint8Array =
        data instanceof Uint8Array
          ? data
          : data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(
                (data as ArrayBufferView).buffer,
                (data as ArrayBufferView).byteOffset,
                (data as ArrayBufferView).byteLength
              );

      // Decode bytes as Latin-1 (1-byte-per-codepoint) to reconstruct the
      // original string. For PKCE the input is always hex ASCII, so this
      // is equivalent to a UTF-8 decode and produces the same digest.
      const str = Array.from(bytes, (b) => String.fromCharCode(b)).join('');

      // expo-crypto returns a lowercase hex string.
      const hex = await ExpoCrypto.digestStringAsync(expoAlgo, str, {
        encoding: ExpoCrypto.CryptoEncoding.HEX,
      });

      // Convert hex back to ArrayBuffer so callers see the standard type.
      const result = new Uint8Array(hex.length / 2);
      for (let i = 0; i < result.length; i++) {
        result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      return result.buffer;
    },
  };

  // @ts-expect-error: partially implementing SubtleCrypto — only digest is
  // needed by Supabase PKCE; the full WebCrypto API is not polyfilled here.
  globalThis.crypto.subtle = subtle;
}
