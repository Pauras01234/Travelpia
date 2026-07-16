/** The county-context chip shown in the Ask header (design screen 05). */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

interface CountyChipProps {
  county: string;
  onPress: () => void;
}

export function CountyChip({ county, onPress }: CountyChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Change county, currently ${county}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: theme.colors.chipBg,
          borderRadius: theme.radius.pill,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
      <AppText variant="caption" color={theme.colors.chipText}>
        {county}
      </AppText>
      <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
