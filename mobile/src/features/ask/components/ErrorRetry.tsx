/** Graceful error-recovery card (design screen 05, ERROR · RETRY). */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/ThemeProvider";

interface ErrorRetryProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onEdit: () => void;
}

export function ErrorRetry({ title, message, onRetry, onEdit }: ErrorRetryProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons
        name="alert-circle-outline"
        size={22}
        color={theme.colors.error}
        style={styles.icon}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.card,
          },
        ]}
      >
        <AppText variant="bodySemibold">{title}</AppText>
        <AppText variant="body" color={theme.colors.textMuted}>
          {message}
        </AppText>
        <View style={styles.actions}>
          {onRetry && (
            <View style={styles.action}>
              <Button label="Retry" variant="secondary" onPress={onRetry} />
            </View>
          )}
          <View style={styles.action}>
            <Button label="Edit question" variant="ghost" onPress={onEdit} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  icon: { marginTop: 8 },
  card: { flex: 1, padding: 16, borderWidth: 1, gap: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  action: { flex: 1 },
});
