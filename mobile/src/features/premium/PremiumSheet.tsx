/**
 * The upgrade prompt shown when a free account reaches a premium capability.
 *
 * Deliberately framed as an offer, not an error — reaching a limit is an
 * expected part of the free plan, so it must never look like a failure.
 * Billing isn't wired yet, so the primary action just acknowledges.
 */
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/ThemeProvider";

import { PREMIUM_FEATURES, type PremiumFeatureKey } from "./entitlements";

interface PremiumSheetProps {
  /** The capability that triggered the sheet, or null when closed. */
  feature: PremiumFeatureKey | null;
  /** Human-readable reset time, shown when a daily allowance ran out. */
  resetsAt?: string | null;
  onClose: () => void;
}

export function PremiumSheet({
  feature,
  resetsAt,
  onClose,
}: PremiumSheetProps) {
  const theme = useTheme();
  if (!feature) return null;

  const { title, blurb, icon } = PREMIUM_FEATURES[feature];

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
        accessibilityLabel="Dismiss"
      >
        {/* Stop taps inside the card from closing the sheet. */}
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderTopLeftRadius: theme.radius.card,
              borderTopRightRadius: theme.radius.card,
            },
          ]}
          onPress={() => {}}
        >
          <View
            style={[styles.grabber, { backgroundColor: theme.colors.border }]}
          />

          <View style={[styles.icon, { backgroundColor: theme.colors.chipBg }]}>
            <Ionicons name={icon} size={24} color={theme.colors.primary} />
          </View>

          <AppText variant="title" center>
            {title}
          </AppText>
          <AppText variant="body" color={theme.colors.textMuted} center>
            {blurb}
          </AppText>

          {!!resetsAt && (
            <AppText variant="caption" color={theme.colors.textMuted} center>
              Your free questions reset {resetsAt}.
            </AppText>
          )}

          <View style={styles.actions}>
            <Button label="Notify me when it's ready" onPress={onClose} />
            <Button label="Not now" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  card: {
    padding: 24,
    paddingBottom: 32,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { alignSelf: "stretch", gap: 8, marginTop: 12 },
});
