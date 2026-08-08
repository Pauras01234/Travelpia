/**
 * Home & discovery (design screen 04).
 *
 * Greets the signed-in user, surfaces the active county as a "Now exploring"
 * hero (with live current weather), offers quick actions into Ask/Map/Weather,
 * and lists counties to switch context. The active county is the shared
 * ExploreContext value, so switching here updates Ask and Map too.
 */
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { COUNTIES, type County } from "@/constants/counties";
import { CountyPickerModal } from "@/features/ask/components/CountyPickerModal";
import { useExplore } from "@/features/explore/ExploreContext";
import { useProfile } from "@/features/profile/useProfile";
import { useAvatar } from "@/features/settings/AvatarContext";
import { useTheme } from "@/theme/ThemeProvider";

import { countyMeta, FEATURED_COUNTIES } from "./countyData";
import { HomeSkeleton } from "./HomeSkeleton";
import { useCountyImage } from "./useCountyImage";
import { useCountyWeather } from "./useCountyWeather";

// The hero sits on a photo + dark overlay in both themes, so its text is always
// light — not theme `onPrimary` (which is dark in dark mode).
const HERO_TEXT = "#FFFFFF";

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { county, setCounty } = useExplore();
  const { profile, loading } = useProfile();
  const { avatarUri } = useAvatar();
  const weather = useCountyWeather(county);
  const heroImage = useCountyImage(county);

  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const meta = countyMeta(county);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COUNTIES.filter((c) => c.toLowerCase().includes(q)) : COUNTIES;
  }, [query]);

  const openCounty = (c: County) => {
    setCounty(c);
    router.navigate("/ask");
  };

  // Initial load gate — matches the design's HOME · LOADING skeleton.
  if (loading && !profile) {
    return <HomeSkeleton />;
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + avatar */}
        <View style={styles.header}>
          <View style={styles.greeting}>
            <AppText variant="bodyMedium" color={theme.colors.textMuted}>
              {firstName ? `Dia dhuit, ${firstName} 👋` : "Dia dhuit 👋"}
            </AppText>
            <AppText variant="title">Where to today?</AppText>
          </View>
          <Pressable
            onPress={() => router.navigate("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Avatar
              uri={avatarUri}
              name={profile?.full_name}
              email={profile?.email}
              size={44}
              backgroundColor={theme.colors.chipBg}
              textColor={theme.colors.primary}
            />
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={[
            styles.search,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.control,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search all 32 counties..."
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search counties"
          />
        </View>

        {/* Now exploring */}
        <View style={styles.sectionHead}>
          <AppText variant="caption" color={theme.colors.textMuted}>
            NOW EXPLORING
          </AppText>
          <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button">
            <AppText variant="bodySemibold" color={theme.colors.primary}>
              Change
            </AppText>
          </Pressable>
        </View>

        <Pressable
          onPress={() => openCounty(county)}
          accessibilityRole="button"
          style={[styles.hero, { backgroundColor: theme.colors.primary }]}
        >
          {heroImage ? (
            <>
              <Image
                source={{ uri: heroImage }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityLabel={`${county}, Ireland`}
              />
              {/* Dark overlay keeps the white text legible over any photo. */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]} />
            </>
          ) : (
            <Ionicons
              name="image-outline"
              size={30}
              color={theme.colors.onPrimary}
              style={styles.heroImageHint}
            />
          )}
          <View style={styles.heroChips}>
            <View style={[styles.heroChip, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
              <Ionicons name="location" size={11} color={theme.colors.accent} />
              <AppText variant="caption" color={HERO_TEXT}>
                {`County · ${meta.region}`}
              </AppText>
            </View>
          </View>
          <View style={styles.heroBody}>
            <AppText variant="display" color={HERO_TEXT}>
              {county}
            </AppText>
            <AppText variant="bodyMedium" color={HERO_TEXT} numberOfLines={1}>
              {`${meta.tagline} · ${meta.places} places`}
              {weather ? ` · ${weather.temp}°C ${weather.description.toLowerCase()}` : ""}
            </AppText>
          </View>
        </Pressable>

        {/* Quick actions */}
        <View style={styles.actions}>
          <QuickAction icon="chatbubble-ellipses" label="Ask" primary onPress={() => router.navigate("/ask")} />
          <QuickAction icon="map" label="Map" onPress={() => router.navigate("/map")} />
          <QuickAction icon="partly-sunny" label="Weather" onPress={() => router.navigate("/weather")} />
        </View>

        {/* Featured counties */}
        <AppText variant="heading" style={styles.blockTitle}>
          Featured counties
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredRow}
        >
          {FEATURED_COUNTIES.map((c) => {
            const m = countyMeta(c);
            return (
              <Pressable
                key={c}
                onPress={() => openCounty(c as County)}
                accessibilityRole="button"
                style={[
                  styles.featuredCard,
                  { backgroundColor: theme.colors.primary, borderRadius: theme.radius.card },
                ]}
              >
                <Ionicons name="location" size={16} color={theme.colors.accent} />
                <View>
                  <AppText variant="bodySemibold" color={theme.colors.onPrimary}>
                    {c}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.onPrimary} numberOfLines={1}>
                    {m.tagline}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* All counties */}
        <AppText variant="heading" style={styles.blockTitle}>
          All counties
        </AppText>
        <View
          style={[
            styles.list,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          {filtered.map((c, i) => {
            const m = countyMeta(c);
            return (
              <Pressable
                key={c}
                onPress={() => openCounty(c)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.countyRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <View style={[styles.countyIcon, { backgroundColor: theme.colors.chipBg }]}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.countyText}>
                  <AppText variant="bodySemibold">{c}</AppText>
                  <AppText variant="caption" color={theme.colors.textMuted}>
                    {`${m.province} · ${m.places} places`}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>
            );
          })}
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <AppText variant="body" color={theme.colors.textMuted} center>
                No county matches "{query}".
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <CountyPickerModal
        visible={pickerOpen}
        selected={county}
        onSelect={setCounty}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  const bg = primary ? theme.colors.accent : theme.colors.card;
  const fg = primary ? theme.colors.onAccent : theme.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: bg,
          borderColor: primary ? bg : theme.colors.border,
          borderRadius: theme.radius.control,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={fg} />
      <AppText variant="bodySemibold" color={fg}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  greeting: { flex: 1, gap: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: -8,
  },
  hero: {
    height: 150,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroImageHint: { position: "absolute", top: 14, right: 16, opacity: 0.35 },
  heroChips: { flexDirection: "row" },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBody: { gap: 2 },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    height: 68,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  blockTitle: { marginTop: 4 },
  featuredRow: { gap: 10, paddingRight: 4 },
  featuredCard: {
    width: 160,
    padding: 14,
    gap: 10,
    justifyContent: "space-between",
  },
  list: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  countyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  countyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  countyText: { flex: 1, gap: 2 },
  empty: { padding: 24 },
});
