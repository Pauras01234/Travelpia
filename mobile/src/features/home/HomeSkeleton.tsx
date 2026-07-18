/**
 * Home loading skeleton (design: HOME · LOADING). A composed set of Skeleton
 * blocks laid out to match the real Home so the transition to loaded content
 * doesn't shift.
 */
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Skeleton } from "@/components/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";

export function HomeSkeleton() {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.container}>
        {/* Greeting + avatar */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Skeleton width={120} height={12} />
            <Skeleton width={180} height={22} />
          </View>
          <Skeleton width={44} height={44} radius={22} />
        </View>

        {/* Search bar */}
        <Skeleton width="100%" height={46} radius={12} />

        {/* Hero card */}
        <Skeleton width="100%" height={180} radius={16} />

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <Skeleton width="31%" height={64} radius={12} />
          <Skeleton width="31%" height={64} radius={12} />
          <Skeleton width="31%" height={64} radius={12} />
        </View>

        {/* Featured tiles */}
        <View style={styles.tilesRow}>
          <Skeleton width="48%" height={110} radius={16} />
          <Skeleton width="48%" height={110} radius={16} />
        </View>

        {/* List rows */}
        <View style={styles.list}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="55%" height={14} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: { gap: 8 },
  actionsRow: { flexDirection: "row", justifyContent: "space-between" },
  tilesRow: { flexDirection: "row", justifyContent: "space-between" },
  list: { gap: 12, marginTop: 4 },
});
