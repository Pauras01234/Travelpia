/**
 * Client-side mirror of the backend's frozen /ask contract (see
 * backend/app/schemas/ask.py). Keep these in sync with the OpenAPI schema.
 */

export type AskMode = "fast" | "detailed";

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
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  images: AskImage[];
  county: string;
  mode: AskMode;
  grounded: boolean;
  cached: boolean;
}

/** Shape of the backend's uniform error envelope. */
export interface ApiErrorBody {
  error: string;
  detail: string;
  request_id?: string | null;
}
