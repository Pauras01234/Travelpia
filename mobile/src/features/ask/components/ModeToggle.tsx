/** Fast / Detailed segmented toggle (design screen 05). */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import type { AskMode } from "@/api/types";
import { useTheme } from "@/theme/ThemeProvider";

interface ModeToggleProps {
  mode: AskMode;
  onChange: (mode: AskMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const theme = useTheme();

  const renderOption = (value: AskMode, label: string) => {
    const active = mode === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(value)}
        style={[
          styles.option,
          {
            backgroundColor: active ? theme.colors.primary : "transparent",
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        {value === "fast" && (
          <Ionicons
            name="flash"
            size={13}
            color={active ? theme.colors.onPrimary : theme.colors.textMuted}
          />
        )}
        <AppText
          variant="caption"
          color={active ? theme.colors.onPrimary : theme.colors.textMuted}
        >
          {label}
        </AppText>
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
