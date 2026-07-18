/**
 * Offline state (design: OFFLINE · SAVED). Shows a banner, what's available
 * offline, and a reconnect action. The saved items are presentational for now;
 * they'll be backed by real cached answers/tiles when offline persistence
 * lands (a fast-follow, alongside Supabase).
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface SavedItem {
  icon: IoniconName;
  title: string;
  subtitle: string;
}

interface OfflineScreenProps {
  county: string;
  lastSyncedLabel?: string;
  onReconnect: () => void;
}

export function OfflineScreen({
  county,
  lastSyncedLabel = "Last synced recently",
  onReconnect,
}: OfflineScreenProps) {
  const theme = useTheme();

  const items: SavedItem[] = [
    {
      icon: "chatbubble-ellipses-outline",
      title: "Coastal walks answer",
      subtitle: "Saved · 5 places",
    },
    {
      icon: "map-outline",
      title: `${county} map`,
      subtitle: "Cached tiles · 12 pins",
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: theme.colors.chipBg }]}>
        <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.warning} />
        <AppText variant="caption" color={theme.colors.text}>
          {`You're offline — showing your saved ${county} guide`}
        </AppText>
      </View>

      <View style={styles.body}>
        <AppText variant="title">Available offline</AppText>
        <AppText variant="body" color={theme.colors.textMuted}>
          {lastSyncedLabel}
        </AppText>

        <View style={styles.cards}>
          {items.map((item) => (
            <View
              key={item.title}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.card,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.colors.chipBg }]}>
                <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.cardText}>
                <AppText variant="bodySemibold">{item.title}</AppText>
                <AppText variant="caption" color={theme.colors.textMuted}>
                  {item.subtitle}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onReconnect}
          style={({ pressed }) => [
            styles.reconnect,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.radius.control,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="refresh" size={16} color={theme.colors.text} />
          <AppText variant="bodySemibold">Try to reconnect</AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  body: { padding: 20, gap: 8 },
  cards: { gap: 12, marginTop: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1, gap: 2 },
  reconnect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 8,
  },
});
