/**
 * The app's HTTP client for the TravelPia backend.
 *
 * Responsibilities: resolve the base URL, attach the session bearer token
 * (refreshing it first when needed), enforce a request timeout, clear the
 * session on a 401, and normalise both network failures and the backend's
 * error envelope into a single typed `ApiError` the UI can branch on.
 *
 * Callers never handle tokens: `AuthProvider` registers the session with
 * `authBridge` and every request picks it up from there.
 */
import Constants from "expo-constants";

import { currentAccessToken, notifyUnauthorized } from "@/lib/authBridge";

import type { ApiErrorBody } from "./types";

const DEFAULT_TIMEOUT_MS = 20_000;

/** A single place to read the configured backend base URL. */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/+$/, "");
  // Fallback for bare `expo start` without an .env file.
  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl;
  return (fromExtra ?? "http://localhost:8000").replace(/\/+$/, "");
}

export const API_BASE_URL = resolveBaseUrl();

/** Typed error carrying a stable code so the UI can react precisely. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string | null;
  /** Machine-readable context from the error envelope (quota, retry hints). */
  readonly meta?: Record<string, unknown> | null;

  constructor(params: {
    code: string;
    detail: string;
    status: number;
    requestId?: string | null;
    meta?: Record<string, unknown> | null;
  }) {
    super(params.detail);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
    this.meta = params.meta;
  }

  /** True for transient failures worth offering a "Retry" for. */
  get isRetryable(): boolean {
    return (
      this.code === "network_error" ||
      this.code === "timeout" ||
      // Rate limiting clears on its own; a quota does not.
      this.code === "rate_limited" ||
      this.status >= 500
    );
  }

  /** Seconds to wait before retrying, when the server said so. */
  get retryAfterSeconds(): number | null {
    const value = this.meta?.retry_after;
    return typeof value === "number" ? value : null;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Overrides the session token for this request. Omit it — the client
   * resolves the current session automatically.
   */
  token?: string | null;
  timeoutMs?: number;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    signal,
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  // Combine an internal timeout with any caller-provided cancellation signal.
  // An aborted fetch throws a generic AbortError, so we track *why* we aborted
  // with an explicit flag rather than relying on the abort reason surviving.
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort());
  }

  // An explicit `token` wins (including `null` to force an anonymous call);
  // otherwise use the live session, refreshing it if it's about to expire.
  const bearer = token === undefined ? await currentAccessToken() : token;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (didTimeout) {
      throw new ApiError({
        code: "timeout",
        detail: "The request took too long. Please try again.",
        status: 0,
      });
    }
    // A user-initiated cancel should propagate as-is, not as an error toast.
    if (signal?.aborted) throw err;
    throw new ApiError({
      code: "network_error",
      detail: "Couldn't reach TravelPia. Check your connection and try again.",
      status: 0,
    });
  } finally {
    clearTimeout(timeout);
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const requestId = response.headers.get("X-Request-ID");
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body (e.g. gateway error page).
  }

  if (response.ok) {
    return payload as T;
  }

  // The session is gone (expired, revoked, or signed out elsewhere). Clear it
  // so the navigator routes back to login instead of looping on failures.
  if (response.status === 401) {
    await notifyUnauthorized();
  }

  const errBody = payload as ApiErrorBody | null;
  throw new ApiError({
    code: errBody?.error ?? "http_error",
    detail:
      errBody?.detail ??
      "Something went wrong. Please try again in a moment.",
    status: response.status,
    requestId: errBody?.request_id ?? requestId,
    meta: errBody?.meta ?? null,
  });
}
