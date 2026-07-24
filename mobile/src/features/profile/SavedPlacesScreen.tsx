/**
 * Saved places (design SAVED). Lists the places saved from the Map (persisted
 * on-device via SavedPlacesContext); shows the empty state when there are none.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MapPlace } from "@/api/types";
import { AppText } from "@/components/AppText";
import { StarRating } from "@/components/StarRating";
import { useExplore } from "@/features/explore/ExploreContext";
import { categoryColorRole } from "@/features/map/places";
import { useSavedPlaces } from "@/features/saved/SavedPlacesContext";
import { useTheme } from "@/theme/ThemeProvider";

export function SavedPlacesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { places, remove } = useSavedPlaces();
  const { setFocusPlaces } = useExplore();

  const openOnMap = (place: MapPlace) => {
    setFocusPlaces([place]); // Map consumes this to pin + select the place
    router.navigate("/map");
  };

  const goExplore = () => {
    if (router.canGoBack()) router.back();
    router.replace("/map");
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">Saved places</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {places.length === 0 ? (
        <View style={styles.emptyBody}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.chipBg }]}>
            <Ionicons name="bookmark-outline" size={34} color={theme.colors.primary} />
          </View>
          <AppText variant="title" center>
            No saved places yet
          </AppText>
          <AppText variant="body" color={theme.colors.textMuted} center style={styles.subtitle}>
            Tap the bookmark on any place on the map to keep it here for your
            next trip around Ireland.
          </AppText>
          <Pressable
            onPress={goExplore}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radius.control,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText variant="bodySemibold" color={theme.colors.onAccent}>
              Explore counties
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="caption" color={theme.colors.textMuted}>
            {`${places.length} saved`}
          </AppText>
          {places.map((place) => (
            <SavedCard
              key={place.id}
              place={place}
              onOpen={() => openOnMap(place)}
              onRemove={() => remove(place.id)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SavedCard({
  place,
  onOpen,
  onRemove,
}: {
  place: MapPlace;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const thumbColor = theme.colors[categoryColorRole(place.category)];
  const metaParts = [place.category, place.price_level].filter(Boolean);

  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Show ${place.name} on the map`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: thumbColor }]} />
      <View style={styles.cardBody}>
        <AppText variant="bodySemibold" numberOfLines={1}>
          {place.name}
        </AppText>
        <View style={styles.meta}>
          {place.rating != null && <StarRating rating={place.rating} size={12} />}
          {metaParts.length > 0 && (
            <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {`· ${metaParts.join(" · ")}`}
            </AppText>
          )}
        </View>
        {!!place.address && (
          <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
            {place.address}
          </AppText>
        )}
      </View>
      <View style={styles.cardActions}>
        <Pressable
          onPress={openDirections}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Directions to ${place.name}`}
        >
          <Ionicons name="navigate-outline" size={20} color={theme.colors.primary} />
        </Pressable>
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${place.name} from saved`}
        >
          <Ionicons name="heart" size={20} color={theme.colors.error} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: { flex: 1 },
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  iconBox: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  subtitle: { maxWidth: 300, marginBottom: 8 },
  cta: {
    height: 50,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  list: { padding: 20, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  cardBody: { flex: 1, gap: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 16, paddingLeft: 4 },
});
