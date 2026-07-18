/**
 * Shared "explore" state that links the Ask and Map tabs: the active county and
 * the current map query. When you ask TravelPia a grounded question, Ask writes
 * the question here so the Map renders pins for it; the Map's own search box and
 * county picker also write here, so the two tabs stay in sync.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_COUNTY,
  normaliseCounty,
  type County,
} from "@/constants/counties";

interface ExploreContextValue {
  county: County;
  /** The place query the Map should show ("" → use the active filter chip). */
  mapQuery: string;
  setCounty: (county: County) => void;
  setMapQuery: (query: string) => void;
  /** Called by Ask on a grounded answer to point the Map at that question. */
  exploreFromAsk: (county: string, question: string) => void;
}

const ExploreContext = createContext<ExploreContextValue | undefined>(undefined);

export function ExploreProvider({ children }: { children: ReactNode }) {
  const [county, setCounty] = useState<County>(DEFAULT_COUNTY);
  const [mapQuery, setMapQuery] = useState("");

  const value = useMemo<ExploreContextValue>(
    () => ({
      county,
      mapQuery,
      setCounty,
      setMapQuery,
      exploreFromAsk: (nextCounty, question) => {
        const normalised = normaliseCounty(nextCounty);
        if (normalised) setCounty(normalised);
        setMapQuery(question);
      },
    }),
    [county, mapQuery],
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
