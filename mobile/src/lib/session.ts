/**
 * Session token storage and lifetime.
 *
 * Native (iOS/Android): expo-secure-store (Keychain/Keystore).
 * Web: expo-secure-store has no web implementation and throws, so we fall back
 * to localStorage. It's not a secure keystore, but it's the standard web dev
 * fallback and keeps the app from crashing on the web target.
 *
 * Access tokens are short-lived. `getValidAccessToken` is the only function
 * callers should use: it refreshes transparently before expiry so a session
 * lasts as long as the refresh token does, rather than as long as the access
 * token does.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { refreshRequest } from "./api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const EXPIRES_AT_KEY = "expires_at";

/** Refresh this long before actual expiry, so in-flight requests don't race it. */
const REFRESH_SKEW_MS = 60_000;

const isWeb = Platform.OS === "web";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms. Null for sessions stored by a build that didn't record it. */
  expiresAt: number | null;
};

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* storage unavailable (e.g. private mode) — session won't persist */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getTokens(): Promise<SessionTokens | null> {
  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
    getItem(EXPIRES_AT_KEY),
  ]);

  if (!accessToken || !refreshToken) {
    return null;
  }

  const parsed = expiresAt ? Number(expiresAt) : NaN;
  return {
    accessToken,
    refreshToken,
    expiresAt: Number.isFinite(parsed) ? parsed : null,
  };
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds?: number,
): Promise<void> {
  // The server tells us the lifetime, so we never have to decode the JWT.
  const expiresAt =
    typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)
      ? Date.now() + expiresInSeconds * 1000
      : null;

  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, accessToken),
    setItem(REFRESH_TOKEN_KEY, refreshToken),
    expiresAt === null
      ? deleteItem(EXPIRES_AT_KEY)
      : setItem(EXPIRES_AT_KEY, String(expiresAt)),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(EXPIRES_AT_KEY),
  ]);
}

/** True when the session is signed in *and* the access token is still usable. */
export function isFresh(tokens: SessionTokens): boolean {
  // Unknown expiry means the session predates expiry tracking — treat it as
  // stale so the next call refreshes once and learns the real lifetime.
  if (tokens.expiresAt === null) return false;
  return Date.now() < tokens.expiresAt - REFRESH_SKEW_MS;
}

type RefreshOutcome =
  | { kind: "refreshed"; accessToken: string }
  /** Refresh token rejected — the session is unrecoverable. */
  | { kind: "expired" }
  /** Network/server blip — keep the session and let the server arbitrate. */
  | { kind: "unavailable" };

/**
 * Single in-flight refresh. Several screens fetch on mount, and without this
 * they would each trigger their own refresh — rotating the refresh token
 * concurrently and invalidating each other's result.
 */
let inFlightRefresh: Promise<RefreshOutcome> | null = null;

function refreshOnce(refreshToken: string): Promise<RefreshOutcome> {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh(refreshToken).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function performRefresh(refreshToken: string): Promise<RefreshOutcome> {
  const result = await refreshRequest(refreshToken);

  if (result.ok) {
    await setTokens(
      result.data.access_token,
      result.data.refresh_token,
      result.data.expires_in,
    );
    return { kind: "refreshed", accessToken: result.data.access_token };
  }

  if (result.kind === "expired") {
    await clearTokens();
    return { kind: "expired" };
  }

  return { kind: "unavailable" };
}

/**
 * The access token to send with a request, refreshing first if it's about to
 * expire. Returns null when there is no usable session.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;
  if (isFresh(tokens)) return tokens.accessToken;

  const outcome = await refreshOnce(tokens.refreshToken);
  if (outcome.kind === "refreshed") return outcome.accessToken;
  if (outcome.kind === "expired") return null;

  // Offline or the auth service is down. Send the existing token: it may still
  // be valid, and a 401 is a better signal than logging the user out here.
  return tokens.accessToken;
}
