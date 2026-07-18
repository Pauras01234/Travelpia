/**
 * Map data layer. Places now come from the backend `/places` endpoint (Serper
 * proxy), so the map can search *any* real place — not a fixed list. County
 * centres remain local, used to frame the initial map region and as a fallback.
 */
import { useEffect, useState } from "react";

import { ApiError } from "@/api/client";
import { searchPlaces } from "@/api/places";
import type { MapPlace } from "@/api/types";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Approximate county centres, for framing the map before results load. */
export const COUNTY_CENTERS: Record<string, LatLng> = {
  Galway: { lat: 53.2707, lng: -9.0568 },
  Dublin: { lat: 53.3498, lng: -6.2603 },
  Cork: { lat: 51.8985, lng: -8.4756 },
  Kerry: { lat: 52.1545, lng: -9.5669 },
  Clare: { lat: 52.9045, lng: -8.9811 },
  Mayo: { lat: 53.8005, lng: -9.5085 },
  Donegal: { lat: 54.6549, lng: -8.1041 },
  Limerick: { lat: 52.668, lng: -8.6305 },
  Sligo: { lat: 54.2766, lng: -8.4761 },
  Wicklow: { lat: 52.9808, lng: -6.0446 },
};

export const IRELAND_CENTER: LatLng = { lat: 53.4, lng: -8.0 };

export function countyCenter(county: string): LatLng {
  return COUNTY_CENTERS[county] ?? IRELAND_CENTER;
}

/** Filter chips → the search phrase each maps to. */
export type MapFilterKey = "all" | "walks" | "food" | "sights";

export const FILTER_QUERIES: Record<MapFilterKey, string> = {
  all: "top attractions",
  walks: "walking trails and parks",
  food: "restaurants",
  sights: "tourist attractions and landmarks",
};

/** Coarse category → theme colour role, for pin colours. */
export function categoryColorRole(
  category: string,
): "primary" | "accent" | "secondary" {
  const c = category.toLowerCase();
  if (/(restaurant|cafe|coffee|food|bar|pub|seafood|bakery|eatery)/.test(c)) {
    return "accent";
  }
  if (/(park|trail|walk|beach|forest|garden|nature|hike|mountain)/.test(c)) {
    return "primary";
  }
  return "secondary";
}

export interface UsePlacesResult {
  places: MapPlace[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches places for a county + query, cancelling any in-flight request when
 * the inputs change. The caller is expected to debounce `query` (see MapScreen)
 * so we don't fire a request per keystroke.
 */
export function usePlaces(county: string, query: string): UsePlacesResult {
  const [state, setState] = useState<UsePlacesResult>({
    places: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    searchPlaces(query, county, { signal: controller.signal, limit: 20 })
      .then((places) => {
        if (controller.signal.aborted) return;
        setState({ places, loading: false, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === "AbortError") return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Couldn't load places. Check your connection.";
        setState({ places: [], loading: false, error: message });
      });

    return () => controller.abort();
  }, [county, query]);

  return state;
}
