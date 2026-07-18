/**
 * Web map — an integrated, interactive Leaflet map (OpenStreetMap tiles, no API
 * key) shown on web where react-native-maps can't run. Metro picks this file
 * for web only, so Leaflet is never bundled for native.
 *
 * Pins are vector CircleMarkers (no image assets → avoids Leaflet's broken
 * default-icon issue under bundlers), coloured by category, with the selected
 * pin enlarged. The view auto-fits to the current results.
 */
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { useTheme } from "@/theme/ThemeProvider";

import { categoryColorRole, countyCenter } from "../places";
import { type PlacesMapProps } from "./types";

/** Imperatively re-frame the map when results (or county) change. */
function FitToPlaces({
  places,
  county,
}: {
  places: PlacesMapProps["places"];
  county: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (places.length > 0) {
      map.fitBounds(
        places.map((p) => [p.lat, p.lng] as [number, number]),
        { padding: [48, 48], maxZoom: 15 },
      );
    } else {
      const c = countyCenter(county);
      map.setView([c.lat, c.lng], 12);
    }
  }, [places, county, map]);
  return null;
}

export function PlacesMap({ county, places, selectedId, onSelect }: PlacesMapProps) {
  const theme = useTheme();
  const center = countyCenter(county);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {places.map((place) => {
          const selected = place.id === selectedId;
          const color = theme.colors[categoryColorRole(place.category)];
          return (
            <CircleMarker
              key={place.id}
              center={[place.lat, place.lng]}
              radius={selected ? 11 : 7}
              pathOptions={{
                color: selected ? theme.colors.card : color,
                fillColor: color,
                fillOpacity: 1,
                weight: selected ? 3 : 2,
              }}
              eventHandlers={{ click: () => onSelect(place.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {place.name}
              </Tooltip>
            </CircleMarker>
          );
        })}
        <FitToPlaces places={places} county={county} />
      </MapContainer>
    </div>
  );
}
