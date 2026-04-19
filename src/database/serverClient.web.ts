// Web stub: mirrors the real SQLite server DB interface so the app can at
// least render a friendly unsupported-platform notice without crashing.

const MESSAGE =
  'The server DB runs on SQLite. Web is not supported — run on iOS/Android.';

export async function getServerDatabase(): Promise<never> {
  throw new Error(MESSAGE);
}

export async function initializeServerDatabase(): Promise<void> {
  // No-op on web.
}
