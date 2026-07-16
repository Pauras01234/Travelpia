/** Placeholder for tabs owned by other work items, on-brand and theme-aware. */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function ComingSoon({
  title,
  icon,
}: {
  title: string;
  icon: IoniconName;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: theme.colors.chipBg }]}>
          <Ionicons name={icon} size={28} color={theme.colors.primary} />
        </View>
        <AppText variant="title">{title}</AppText>
        <AppText variant="body" color={theme.colors.textMuted} center>
          Coming soon.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
