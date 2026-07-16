/**
 * Thin HTTP client for the TravelPia backend.
 *
 * Responsibilities: resolve the base URL, attach headers (and, later, the
 * Supabase bearer token), enforce a request timeout, and normalise both
 * network failures and the backend's error envelope into a single typed
 * `ApiError` the UI can branch on.
 */
import Constants from "expo-constants";

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

  constructor(params: {
    code: string;
    detail: string;
    status: number;
    requestId?: string | null;
  }) {
    super(params.detail);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
  }

  /** True for transient failures worth offering a "Retry" for. */
  get isRetryable(): boolean {
    return (
      this.code === "network_error" ||
      this.code === "timeout" ||
      this.status >= 500
    );
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  /** Bearer token to attach once Supabase auth is live. */
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const errBody = payload as ApiErrorBody | null;
  throw new ApiError({
    code: errBody?.error ?? "http_error",
    detail:
      errBody?.detail ??
      "Something went wrong. Please try again in a moment.",
    status: response.status,
    requestId: errBody?.request_id ?? requestId,
  });
}
