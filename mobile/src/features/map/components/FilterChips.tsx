/** Category filter chips: {county} · Walks · Food · Sights (design screen 07). */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

import type { MapFilterKey } from "../places";

interface FilterChipsProps {
  county: string;
  value: MapFilterKey;
  onChange: (value: MapFilterKey) => void;
}

const OPTIONS: { key: MapFilterKey; label: (c: string) => string }[] = [
  { key: "all", label: (c) => c },
  { key: "walks", label: () => "Walks" },
  { key: "food", label: () => "Food" },
  { key: "sights", label: () => "Sights" },
];

export function FilterChips({ county, value, onChange }: FilterChipsProps) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.colors.primary : theme.colors.card,
                borderColor: active ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radius.pill,
              },
            ]}
          >
            {opt.key === "all" && (
              <Ionicons
                name="location"
                size={13}
                color={active ? theme.colors.onPrimary : theme.colors.primary}
              />
            )}
            <AppText
              variant="caption"
              color={active ? theme.colors.onPrimary : theme.colors.text}
            >
              {opt.label(county)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
});
