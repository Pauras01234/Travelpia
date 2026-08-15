/**
 * Crash and error reporting.
 *
 * Until now a tester saying "it doesn't work" produced nothing actionable:
 * JS errors never reach Play Console (they aren't native crashes), so Crashes
 * and ANRs stays empty while the app is visibly broken. This closes that gap.
 *
 * The DSN is read from `EXPO_PUBLIC_SENTRY_DSN`. It is safe to ship in the
 * bundle — DSNs are write-only ingest keys, by design public.
 */
import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True when reports will actually be sent (configured, and not a dev build). */
export const sentryEnabled = Boolean(dsn) && !__DEV__;

export function initSentry(): void {
  if (!dsn) return; // no DSN configured (e.g. a local checkout) — stay silent

  Sentry.init({
    dsn,
    // Metro reloads and dev-time errors would drown the real signal.
    enabled: !__DEV__,
    // Never attach emails, usernames or IPs. The app handles account data, so
    // this stays off deliberately — it also keeps the store privacy
    // declarations accurate.
    sendDefaultPii: false,
    // Enough performance data to spot slow screens without a large quota bill.
    tracesSampleRate: 0.2,
  });
}

/** Report a caught error. Safe to call when Sentry isn't configured. */
export function reportError(error: unknown): void {
  try {
    Sentry.captureException(error);
  } catch {
    // Reporting must never be able to break the screen reporting the problem.
  }
}

export { Sentry };
