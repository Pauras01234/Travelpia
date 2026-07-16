/** A tappable suggested-prompt card for the Ask empty state. */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

interface PromptCardProps {
  emoji: string;
  label: string;
  onPress: () => void;
}

export function PromptCard({ emoji, label, onPress }: PromptCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.control,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <AppText style={styles.emoji}>{emoji}</AppText>
      <View style={styles.label}>
        <AppText variant="bodyMedium" numberOfLines={2}>
          {label}
        </AppText>
      </View>
      <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  emoji: { fontSize: 18 },
  label: { flex: 1 },
});
