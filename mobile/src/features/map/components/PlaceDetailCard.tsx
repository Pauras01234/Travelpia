/**
 * Bottom detail card for the selected place (design screen 07): thumbnail,
 * name, rating + category + price, address, Directions + save.
 */
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";

import { fetchPlacePhoto } from "@/api/places";
import type { MapPlace } from "@/api/types";
import { AppText } from "@/components/AppText";
import { StarRating } from "@/components/StarRating";
import { useTheme } from "@/theme/ThemeProvider";

import { categoryColorRole } from "../places";

export function PlaceDetailCard({
  place,
  county,
}: {
  place: MapPlace;
  county: string;
}) {
  const theme = useTheme();
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  // Lazily fetch a photo for the selected place; fall back to the colour block.
  useEffect(() => {
    const controller = new AbortController();
    setPhoto(null);
    fetchPlacePhoto(`${place.name} ${county}`, { signal: controller.signal })
      .then((url) => {
        if (!controller.signal.aborted) setPhoto(url);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [place.id, place.name, county]);

  const openDirections = () => {
    // Universal Google Maps directions link — opens the app or the web map.
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    void Linking.openURL(url).catch(() => {});
  };

  const thumbColor = theme.colors[categoryColorRole(place.category)];
  const metaParts = [place.category, place.price_level].filter(Boolean);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.card,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.thumb, { backgroundColor: thumbColor }]}>
          {photo && (
            <Image
              source={{ uri: photo }}
              style={styles.thumbImage}
              onError={() => setPhoto(null)}
            />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="heading" numberOfLines={1}>
            {place.name}
          </AppText>
          <View style={styles.meta}>
            {place.rating != null && <StarRating rating={place.rating} />}
            {metaParts.length > 0 && (
              <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                {`· ${metaParts.join(" · ")}`}
              </AppText>
            )}
          </View>
          {!!place.address && (
            <AppText variant="body" color={theme.colors.textMuted} numberOfLines={2}>
              {place.address}
            </AppText>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Directions to ${place.name}`}
          onPress={openDirections}
          style={({ pressed }) => [
            styles.directions,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.control,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="navigate" size={18} color={theme.colors.onPrimary} />
          <AppText variant="bodySemibold" color={theme.colors.onPrimary}>
            Directions
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved" : "Save place"}
          accessibilityState={{ selected: saved }}
          onPress={() => setSaved((s) => !s)}
          style={({ pressed }) => [
            styles.save,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.radius.control,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={20}
            color={saved ? theme.colors.error : theme.colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, gap: 16 },
  top: { flexDirection: "row", gap: 14 },
  thumb: { width: 66, height: 66, borderRadius: 12, overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  info: { flex: 1, gap: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  actions: { flexDirection: "row", gap: 10 },
  directions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  save: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
