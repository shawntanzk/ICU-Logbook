// Web stub: expo-sqlite has no web build. Metro resolves this file on web
// platforms (via the .web.ts suffix), keeping the real native import out of
// the web bundle entirely. Access attempts throw a clear message.

const MESSAGE =
  'SQLite is not available on web. Run this app on an iOS or Android simulator/device.';

export async function getDatabase(): Promise<never> {
  throw new Error(MESSAGE);
}

export async function initializeDatabase(): Promise<void> {
  // No-op on web so App.tsx can render a friendly unsupported-platform notice
  // rather than crashing at startup.
}
