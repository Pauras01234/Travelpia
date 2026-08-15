/**
 * Indirection between the HTTP client and the auth session.
 *
 * `@/api/client` needs a token for every request and needs to react to a 401,
 * but it must not import React context (it's used outside components, and the
 * import would cycle). `AuthProvider` registers the two callbacks here on
 * mount; the client reads them. That keeps every feature call site free of
 * token plumbing — adding a new endpoint requires no auth wiring at all.
 */

export interface AuthBridge {
  /** Resolves a usable access token, refreshing it first if needed. */
  getAccessToken: () => Promise<string | null>;
  /** Called when the server rejects the session, so it can be cleared. */
  onUnauthorized: () => void | Promise<void>;
}

let bridge: AuthBridge | null = null;

export function setAuthBridge(next: AuthBridge | null): void {
  bridge = next;
}

/** Null before the provider mounts, or when signed out. */
export async function currentAccessToken(): Promise<string | null> {
  if (!bridge) return null;
  try {
    return await bridge.getAccessToken();
  } catch {
    // Storage failures must not break the request — let it go out
    // unauthenticated and be rejected by the server if that matters.
    return null;
  }
}

export async function notifyUnauthorized(): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.onUnauthorized();
  } catch {
    /* clearing local state is best-effort */
  }
}
