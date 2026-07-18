/** Typed wrapper for the Map places search endpoint. */
import { apiFetch } from "./client";
import type { MapPlace, PlacesResponse } from "./types";

/** Search real places for a county. Throws {@link ApiError} on failure. */
export async function searchPlaces(
  query: string,
  county: string,
  opts: { signal?: AbortSignal; token?: string | null; limit?: number } = {},
): Promise<MapPlace[]> {
  const params = new URLSearchParams({ query, county });
  if (opts.limit) params.set("limit", String(opts.limit));
  const res = await apiFetch<PlacesResponse>(`/places?${params.toString()}`, {
    signal: opts.signal,
    token: opts.token,
  });
  return res.places;
}

/** Fetch a representative photo URL for a place, or null. Never throws. */
export async function fetchPlacePhoto(
  query: string,
  opts: { signal?: AbortSignal; token?: string | null } = {},
): Promise<string | null> {
  try {
    const res = await apiFetch<{ url: string | null }>(
      `/places/photo?query=${encodeURIComponent(query)}`,
      { signal: opts.signal, token: opts.token },
    );
    return res.url ?? null;
  } catch {
    return null; // a missing photo must never break the detail card
  }
}
