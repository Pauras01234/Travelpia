/** Fast / Detailed segmented toggle (design screen 05). */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import type { AskMode } from "@/api/types";
import { PremiumBadge } from "@/features/premium/PremiumBadge";
import { useTheme } from "@/theme/ThemeProvider";

interface ModeToggleProps {
  mode: AskMode;
  onChange: (mode: AskMode) => void;
  /** Detailed answers cost roughly twice as much, so they're a paid feature. */
  detailedLocked?: boolean;
  /** Called instead of `onChange` when a locked mode is tapped. */
  onLockedPress?: () => void;
}

export function ModeToggle({
  mode,
  onChange,
  detailedLocked = false,
  onLockedPress,
}: ModeToggleProps) {
  const theme = useTheme();

  const renderOption = (value: AskMode, label: string) => {
    const active = mode === value;
    const locked = value === "detailed" && detailedLocked;
    const fg = active ? theme.colors.onPrimary : theme.colors.textMuted;
    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityHint={
          locked ? "Detailed answers are part of TravelPia Premium" : undefined
        }
        onPress={() => (locked ? onLockedPress?.() : onChange(value))}
        style={[
          styles.option,
          {
            backgroundColor: active ? theme.colors.primary : "transparent",
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        {value === "fast" && <Ionicons name="flash" size={13} color={fg} />}
        <AppText variant="caption" color={fg}>
          {label}
        </AppText>
        {locked && <PremiumBadge />}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.chipBg,
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      {renderOption("fast", "Fast")}
      {renderOption("detailed", "Detailed")}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 3,
    alignSelf: "flex-start",
    gap: 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
});
