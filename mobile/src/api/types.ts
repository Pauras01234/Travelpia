/**
 * Client-side mirror of the backend's frozen /ask contract (see
 * backend/app/schemas/ask.py). Keep these in sync with the OpenAPI schema.
 */

export type AskMode = "fast" | "detailed";

export type Role = "user" | "assistant";

/** One prior conversation turn, sent to give the assistant short-term memory. */
export interface Turn {
  role: Role;
  content: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface AskImage {
  url: string;
  alt: string;
  credit: string;
}

export interface AskRequest {
  county: string;
  question: string;
  mode: AskMode;
  /** Recent turns, oldest first. Omitted on the first message. */
  history?: Turn[];
}

/** The caller's remaining daily allowance, echoed on every answer. */
export interface QuotaState {
  plan: "free" | "premium";
  limit: number;
  remaining: number;
  /** ISO-8601 UTC timestamp of the next daily reset. */
  resets_at: string;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  images: AskImage[];
  /** Real places (with coordinates) for the topic, to pin on the map. */
  places: MapPlace[];
  county: string;
  mode: AskMode;
  grounded: boolean;
  cached: boolean;
  /** Null when metering is off (anonymous caller or kill switch). */
  quota?: QuotaState | null;
}

/** Shape of the backend's uniform error envelope. */
export interface ApiErrorBody {
  error: string;
  detail: string;
  request_id?: string | null;
  /** Machine-readable context: quota state on 429, retry_after, feature key. */
  meta?: Record<string, unknown> | null;
}

/**
 * Stable error codes from the backend's taxonomy (app/core/errors.py).
 * Branch on these rather than on HTTP status — 429 means two different things.
 */
export const ApiErrorCode = {
  quotaExceeded: "quota_exceeded",
  premiumRequired: "premium_required",
  rateLimited: "rate_limited",
  unauthorized: "unauthorized",
  noResults: "no_results",
} as const;

/** A real-world place returned by GET /places (for map pins). */
export interface MapPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number | null;
  rating_count?: number | null;
  category: string;
  price_level?: string;
}

export interface PlacesResponse {
  places: MapPlace[];
}
