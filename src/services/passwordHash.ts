import * as Crypto from 'expo-crypto';

// Password hashing for the demo. SHA-256(salt || password) is deliberately
// simple — good enough for a local-only mock server, NOT good enough for
// production. When swapping to Supabase, this whole module goes away and
// Supabase Auth takes over (bcrypt / Argon2 server-side).

export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}::${password}`
  );
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return actual === expectedHash;
}

export async function generateToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
