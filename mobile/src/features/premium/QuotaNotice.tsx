/**
 * The free plan's remaining daily questions, shown above the Ask input.
 *
 * Visible only when the server is actually metering this account, so premium
 * users are never reminded of a limit they don't have. At zero the server
 * refuses every message — small talk included — so this row becomes the only
 * affordance: it says when the allowance returns and offers the upgrade.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

import { formatResetTime } from "./entitlements";
import { usePremium } from "./PremiumContext";

export function QuotaNotice() {
  const theme = useTheme();
  const { quota, isPremium, outOfQuestions, requestAccess } = usePremium();

  // No quota means unmetered (premium, anonymous, or metering disabled).
  if (isPremium || !quota) return null;

  const low = quota.remaining <= 1;
  const tint = low ? theme.colors.accent : theme.colors.textMuted;
  const resetsAt = formatResetTime(quota.resets_at);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: outOfQuestions ? theme.colors.chipBg : "transparent",
          borderRadius: theme.radius.pill,
          paddingHorizontal: outOfQuestions ? 12 : 0,
          paddingVertical: outOfQuestions ? 8 : 0,
        },
      ]}
    >
      <Ionicons
        name={outOfQuestions ? "lock-closed-outline" : "flash-outline"}
        size={14}
        color={tint}
      />
      <AppText variant="caption" color={tint} style={styles.label}>
        {outOfQuestions
          ? resetsAt
            ? `Out of questions — more ${resetsAt}`
            : "You've used today's questions"
          : `${quota.remaining} of ${quota.limit} questions left today`}
      </AppText>
      {outOfQuestions && (
        <Pressable
          onPress={() => requestAccess("unlimitedAsks")}
          accessibilityRole="button"
          hitSlop={8}
        >
          <AppText variant="caption" color={theme.colors.primary}>
            Get more
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { flex: 1 },
});
