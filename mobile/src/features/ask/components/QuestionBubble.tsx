/** The user's question, shown as a right-aligned chat bubble. */
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

export function QuestionBubble({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.card,
          },
        ]}
      >
        <AppText variant="bodyMedium" color={theme.colors.onPrimary}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "85%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomRightRadius: 4,
  },
});
