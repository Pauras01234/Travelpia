/** User avatar: shows the chosen photo if set, else initials on a coloured circle. */
import { Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

export function initialsFrom(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const source = (name?.trim() || email?.split("@")[0] || "").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase() || "?";
}

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export function Avatar({
  uri,
  name,
  email,
  size = 44,
  backgroundColor,
  textColor,
}: AvatarProps) {
  const theme = useTheme();
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        accessibilityLabel="Profile picture"
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: backgroundColor ?? theme.colors.primary,
        },
      ]}
    >
      <AppText
        variant={size >= 56 ? "heading" : "bodySemibold"}
        color={textColor ?? theme.colors.onPrimary}
      >
        {initialsFrom(name, email)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
});
