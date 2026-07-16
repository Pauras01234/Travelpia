/** Typed wrappers for the Ask TravelPia endpoints. */
import { apiFetch } from "./client";
import type { AskRequest, AskResponse } from "./types";

/**
 * Ask a grounded travel question. Throws {@link ApiError} on failure so the
 * caller can distinguish retryable errors from validation/no-results.
 */
export function askTravelPia(
  req: AskRequest,
  opts: { signal?: AbortSignal; token?: string | null } = {},
): Promise<AskResponse> {
  return apiFetch<AskResponse>("/ask", {
    method: "POST",
    body: req,
    signal: opts.signal,
    token: opts.token,
  });
}
