/** Cited sources, opening in the system browser when tapped. */
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import type { Source } from "@/api/types";
import { useTheme } from "@/theme/ThemeProvider";

export function SourceList({ sources }: { sources: Source[] }) {
  const theme = useTheme();
  if (sources.length === 0) return null;

  const open = (url: string) => {
    // Fire-and-forget; failures (e.g. malformed URL) are non-critical.
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color={theme.colors.textMuted} style={styles.label}>
        SOURCES
      </AppText>
      {sources.map((source, index) => (
        <Pressable
          key={`${source.url}-${index}`}
          accessibilityRole="link"
          onPress={() => open(source.url)}
          style={({ pressed }) => [
            styles.row,
            { borderColor: theme.colors.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="link-outline" size={16} color={theme.colors.secondary} />
          <AppText variant="bodyMedium" color={theme.colors.secondary} numberOfLines={1} style={styles.title}>
            {source.title}
          </AppText>
          <Ionicons name="open-outline" size={14} color={theme.colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { letterSpacing: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  title: { flex: 1 },
});
