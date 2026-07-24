/**
 * Saved places store — persists the user's saved map places on-device
 * (AsyncStorage: localStorage on web, native store on iOS/Android). Shared via
 * context so the Map's save button and the Saved screen stay in sync.
 *
 * Local for now; a Supabase-backed, cross-device version is a follow-up
 * (needs a `saved_places` table + RLS + endpoints).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MapPlace } from "@/api/types";

const STORAGE_KEY = "travelpia:saved_places:v1";

interface SavedPlacesContextValue {
  places: MapPlace[];
  loading: boolean;
  isSaved: (id: string) => boolean;
  /** Add if not saved, remove if already saved. */
  toggle: (place: MapPlace) => void;
  remove: (id: string) => void;
}

const SavedPlacesContext = createContext<SavedPlacesContextValue | undefined>(
  undefined,
);

export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);

  // Load once on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setPlaces(parsed as MapPlace[]);
        } catch {
          /* corrupt entry — start empty */
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after load whenever the list changes.
  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places)).catch(() => {
      /* best-effort persistence */
    });
  }, [places, loading]);

  const value = useMemo<SavedPlacesContextValue>(
    () => ({
      places,
      loading,
      isSaved: (id) => places.some((p) => p.id === id),
      toggle: (place) =>
        setPlaces((prev) =>
          prev.some((p) => p.id === place.id)
            ? prev.filter((p) => p.id !== place.id)
            : [place, ...prev],
        ),
      remove: (id) => setPlaces((prev) => prev.filter((p) => p.id !== id)),
    }),
    [places, loading],
  );

  return (
    <SavedPlacesContext.Provider value={value}>
      {children}
    </SavedPlacesContext.Provider>
  );
}

export function useSavedPlaces(): SavedPlacesContextValue {
  const ctx = useContext(SavedPlacesContext);
  if (!ctx) {
    throw new Error("useSavedPlaces must be used within a SavedPlacesProvider");
  }
  return ctx;
}
