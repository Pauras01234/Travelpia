/**
 * Shared "explore" state that links the Ask, Map, and Saved flows: the active
 * county, the current map query, and any exact places the Map should focus.
 * Map's own search box and county picker also write here, so the tabs stay in
 * sync.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MapPlace } from "@/api/types";
import { DEFAULT_COUNTY, type County } from "@/constants/counties";

interface ExploreContextValue {
  county: County;
  /** The place query the Map should show ("" → use the active filter chip). */
  mapQuery: string;
  setCounty: (county: County) => void;
  setMapQuery: (query: string) => void;
  /** Places to pin/focus on the Map (from Saved places or an Ask answer). */
  focusPlaces: MapPlace[];
  setFocusPlaces: (places: MapPlace[]) => void;
}

const ExploreContext = createContext<ExploreContextValue | undefined>(undefined);

export function ExploreProvider({ children }: { children: ReactNode }) {
  const [county, setCounty] = useState<County>(DEFAULT_COUNTY);
  const [mapQuery, setMapQuery] = useState("");
  const [focusPlaces, setFocusPlaces] = useState<MapPlace[]>([]);

  const value = useMemo<ExploreContextValue>(
    () => ({
      county,
      mapQuery,
      focusPlaces,
      setCounty,
      setMapQuery,
      setFocusPlaces,
    }),
    [county, mapQuery, focusPlaces],
  );

  return (
    <ExploreContext.Provider value={value}>{children}</ExploreContext.Provider>
  );
}

export function useExplore(): ExploreContextValue {
  const ctx = useContext(ExploreContext);
  if (!ctx) {
    throw new Error("useExplore must be used within an ExploreProvider");
  }
  return ctx;
}
