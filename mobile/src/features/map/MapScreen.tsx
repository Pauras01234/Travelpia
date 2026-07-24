/**
 * Map tab (design screen 07): search + category chips over a pinned map, with
 * a bottom detail card for the selected place. Places come from the backend
 * `/places` search, so any real place is findable — the search box drives the
 * query (falling back to the active category chip when empty), debounced so we
 * don't fire a request per keystroke.
 */
import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MapPlace } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Skeleton } from "@/components/Skeleton";
import { CountyPickerModal } from "@/features/ask/components/CountyPickerModal";
import { useExplore } from "@/features/explore/ExploreContext";
import { useTheme } from "@/theme/ThemeProvider";

import { FILTER_QUERIES, usePlaces, type MapFilterKey } from "./places";
import { FilterChips } from "./components/FilterChips";
import { PlaceDetailCard } from "./components/PlaceDetailCard";
import { PlacesMap } from "./components/PlacesMap";
import { SearchBar } from "./components/SearchBar";

const DEBOUNCE_MS = 450;

export function MapScreen() {
  const theme = useTheme();

  const { county, setCounty, mapQuery, setMapQuery, focusPlaces, setFocusPlaces } =
    useExplore();
  const [filter, setFilter] = useState<MapFilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Places we were asked to focus (Saved place tap, or an Ask answer's places).
  // When present, the map shows exactly these instead of the search results.
  const [focused, setFocused] = useState<MapPlace[]>([]);

  // Typed / Ask-provided query wins; otherwise use the active chip's phrase.
  const targetQuery = useMemo(
    () => mapQuery.trim() || FILTER_QUERIES[filter],
    [mapQuery, filter],
  );

  // Debounce so keystrokes don't each fire a request.
  const [query, setQuery] = useState(targetQuery);
  useEffect(() => {
    const id = setTimeout(() => setQuery(targetQuery), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [targetQuery]);

  const { places, loading, error } = usePlaces(county, query);

  // Consume requested focus places (Saved place tap / Ask answer): show + select.
  useEffect(() => {
    if (focusPlaces.length === 0) return;
    setFocused(focusPlaces);
    setSelectedId(focusPlaces[0].id);
    setFocusPlaces([]);
  }, [focusPlaces, setFocusPlaces]);

  // When focus places are set, show exactly those; otherwise the search results.
  const displayPlaces = focused.length > 0 ? focused : places;

  // Keep the selection valid as results change; default to the first.
  useEffect(() => {
    if (loading && focused.length === 0) return;
    if (displayPlaces.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) =>
      current && displayPlaces.some((p) => p.id === current)
        ? current
        : displayPlaces[0].id,
    );
  }, [displayPlaces, loading, focused]);

  const selected = displayPlaces.find((p) => p.id === selectedId) ?? null;

  // Clear focus when the user actively searches/filters/switches county, so
  // focused pins don't linger over unrelated results.
  const clearFocus = () => setFocused([]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <SearchBar
            value={mapQuery}
            onChangeText={(t) => {
              setMapQuery(t);
              clearFocus();
            }}
            county={county}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change county"
            onPress={() => setPickerOpen(true)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.control,
              },
            ]}
          >
            <Ionicons name="options-outline" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
        <FilterChips
          county={county}
          value={filter}
          onChange={(f) => {
            setFilter(f);
            clearFocus();
          }}
        />
      </View>

      <View style={styles.mapArea}>
        {loading && focused.length === 0 ? (
          <MapSkeleton />
        ) : (
          <PlacesMap
            county={county}
            places={displayPlaces}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}

        {/* Subtle refreshing indicator when results reload over an existing map */}
        {loading && displayPlaces.length > 0 && (
          <View style={styles.refreshing} pointerEvents="none">
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.overlay} pointerEvents="none">
            <AppText variant="bodyMedium" color={theme.colors.textMuted} center>
              {error}
            </AppText>
          </View>
        )}

        {!loading && !error && displayPlaces.length === 0 && (
          <View style={styles.overlay} pointerEvents="none">
            <AppText variant="bodyMedium" color={theme.colors.textMuted} center>
              No places found for "{query}" in {county}.
            </AppText>
          </View>
        )}

        {selected && (
          <View style={styles.detailWrap} pointerEvents="box-none">
            <PlaceDetailCard place={selected} county={county} />
          </View>
        )}
      </View>

      <CountyPickerModal
        visible={pickerOpen}
        selected={county}
        onSelect={(c) => {
          setCounty(c);
          setMapQuery("");
          clearFocus();
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function MapSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.skeleton, { backgroundColor: theme.colors.chipBg }]}>
      <Skeleton width="100%" height="100%" radius={0} style={styles.skeletonFill} />
      <View style={styles.detailWrap}>
        <View
          style={[
            styles.skeletonCard,
            { backgroundColor: theme.colors.card, borderRadius: theme.radius.card },
          ]}
        >
          <Skeleton width={66} height={66} radius={12} />
          <View style={styles.skeletonLines}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={12} />
            <Skeleton width="90%" height={12} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  controls: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterBtn: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  mapArea: { flex: 1, overflow: "hidden", position: "relative" },
  refreshing: { position: "absolute", top: 12, right: 12, zIndex: 1100 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 1100,
  },
  // zIndex must clear Leaflet's layer/control panes (up to 1000) on web so the
  // detail card floats above the map; also lifts it over react-native-maps.
  detailWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 1100,
  },
  skeleton: { flex: 1 },
  skeletonFill: { ...StyleSheet.absoluteFillObject },
  skeletonCard: { flexDirection: "row", gap: 14, padding: 16 },
  skeletonLines: { flex: 1, gap: 8, justifyContent: "center" },
});
