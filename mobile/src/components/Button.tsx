/**
 * Button with the three design variants: primary (gold CTA), secondary
 * (outlined), and ghost (text-only). Includes pressed + disabled + loading
 * states and is accessible by default.
 */
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = true,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg = (() => {
    if (variant === "primary") return theme.colors.accent;
    return "transparent";
  })();
  const border =
    variant === "secondary" ? theme.colors.primary : "transparent";
  const fg = (() => {
    if (variant === "primary") return theme.colors.onAccent;
    return theme.colors.primary;
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === "secondary" ? 1.5 : 0,
          borderRadius: theme.radius.control,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "center",
        },
      ]}
    >
      <View style={styles.content}>
        {loading && <ActivityIndicator size="small" color={fg} />}
        <AppText variant="bodySemibold" color={fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
