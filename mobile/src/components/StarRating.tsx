/** Read-only star rating (supports half-stars) with an optional numeric label. */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

interface StarRatingProps {
  rating: number; // 0–5
  size?: number;
  showValue?: boolean;
}

export function StarRating({ rating, size = 14, showValue = true }: StarRatingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => {
          const name =
            clamped >= i + 1
              ? "star"
              : clamped >= i + 0.5
                ? "star-half"
                : "star-outline";
          return (
            <Ionicons key={i} name={name} size={size} color={theme.colors.warning} />
          );
        })}
      </View>
      {showValue && (
        <AppText variant="caption" color={theme.colors.textMuted}>
          {clamped.toFixed(1)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  stars: { flexDirection: "row", gap: 1 },
});
