// Error-reporting abstraction. Callers always import from here so we
// can swap providers (Sentry, Bugsnag, Datadog) in one place without
// touching call sites.
//
// The default implementation is a no-op — safe to ship without a DSN
// configured. To enable Sentry:
//   1. Set EXPO_PUBLIC_SENTRY_DSN in .env
//   2. Uncomment the sentry-expo wiring in initErrorReporting below
//   3. Run `npx expo prebuild` and rebuild the native app
//
// Keeping the Sentry code commented out rather than conditional avoids
// pulling the Sentry runtime into every bundle when it isn't needed.

type Scope = Record<string, unknown>;

interface Reporter {
  init: () => void;
  capture: (err: unknown, context?: Scope) => void;
  setUser: (userId: string | null, role: string | null) => void;
}

const noopReporter: Reporter = {
  init: () => undefined,
  capture: (err) => {
    // Log locally in dev so mistakes aren't silent.
    if (__DEV__) console.warn('[errorReporting]', err);
  },
  setUser: () => undefined,
};

let reporter: Reporter = noopReporter;
let initialised = false;

export function initErrorReporting(): void {
  if (initialised) return;
  initialised = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  // When you're ready to turn Sentry on:
  //   import * as Sentry from 'sentry-expo';
  //   Sentry.init({ dsn, enableInExpoDevelopment: false });
  //   reporter = {
  //     init: () => undefined,
  //     capture: (err, ctx) =>
  //       Sentry.Native.withScope((scope) => {
  //         if (ctx) scope.setContext('app', ctx);
  //         Sentry.Native.captureException(err);
  //       }),
  //     setUser: (id, role) =>
  //       id ? Sentry.Native.setUser({ id, role: role ?? undefined }) : Sentry.Native.setUser(null),
  //   };
  //   reporter.init();
}

export function reportError(err: unknown, context?: Scope): void {
  reporter.capture(err, context);
}

export function setReportingUser(userId: string | null, role: string | null): void {
  reporter.setUser(userId, role);
}
