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
