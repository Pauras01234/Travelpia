/** Small gold "PRO" pill marking a control the free plan doesn't include. */
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

export function PremiumBadge({ label = "PRO" }: { label?: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radius.pill,
        },
      ]}
      // Announced with the control it labels rather than as its own stop.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="caption" color={theme.colors.onAccent} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 7, paddingVertical: 2 },
  text: { fontSize: 10, letterSpacing: 0.6 },
});
