// Error-reporting abstraction. Callers always import from here so we
// can swap providers (Sentry, Bugsnag, Datadog) in one place without
// touching call sites.
//
// The default implementation is a no-op — safe to ship without a DSN
// configured. To enable Sentry:
//   1. Set EXPO_PUBLIC_SENTRY_DSN in .env
//   2. Run `npm install @sentry/react-native`
//   3. Uncomment the Sentry wiring in initErrorReporting below
//   4. Run `npx expo prebuild` and rebuild the native app

// Loose type standing in for Sentry's Scope until the package is installed.
// Once @sentry/react-native is added, replace this with:
//   import type { Scope } from '@sentry/react-native';
type Scope = Record<string, unknown>;

interface Reporter {
  init: () => void;
  capture: (err: unknown, context?: Scope) => void;
  setUser: (userId: string | null, role: string | null) => void;
}

const noopReporter: Reporter = {
  init: () => undefined,
  capture: (err) => {
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

  try {
    // Dynamic require keeps @sentry/react-native optional. Remove this block
    // and switch to a static import once the package is installed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const Sentry = require('@sentry/react-native') as Record<string, any>;
    Sentry.init({
      dsn,
      enabled: process.env.EXPO_PUBLIC_ENV === 'production',
      tracesSampleRate: 0.1,
      _experiments: {
        customInputDataBaggage: true,
      },
    });
    reporter = {
      init: () => undefined,
      capture: (err, ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Sentry.withScope((scope: any) => {
          if (ctx) scope.setContext('app', ctx);
          Sentry.captureException(err);
        });
      },
      setUser: (id, role) => {
        if (id) {
          Sentry.setUser({ id, role: role ?? undefined });
        } else {
          Sentry.setUser(null);
        }
      },
    };
    reporter.init();
  } catch (e) {
    console.warn('Sentry initialization failed:', e);
  }
}

export function reportError(err: unknown, context?: Scope): void {
  reporter?.capture(err, context);
}

export function setReportingUser(userId: string | null, role: string | null): void {
  reporter?.setUser(userId, role);
}
