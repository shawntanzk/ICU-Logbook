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

import type { Scope } from '@sentry/react-native';

let reporter: Reporter = noopReporter;
let initialised = false;

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

export function initErrorReporting(): void {
  if (initialised) return;
  initialised = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    import('@sentry/react-native').then(Sentry => {
      Sentry.init({
        dsn,
        enabled: process.env.EXPO_PUBLIC_ENV === 'production',
        tracesSampleRate: 0.1,
        _experiments: {
          customInputDataBaggage: true
        }
      });
      reporter = {
        init: () => undefined,
        capture: (err, ctx) => {
          Sentry.withScope((scope) => {
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
        }
      };
      reporter.init();
    });
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
