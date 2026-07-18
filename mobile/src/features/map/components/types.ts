import type { MapPlace } from "@/api/types";

/** Shared contract implemented by both the native and web map components. */
export interface PlacesMapProps {
  county: string;
  places: MapPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}
