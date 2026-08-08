/**
 * Contact support — opens the user's mail app to a support address. Replace
 * SUPPORT_EMAIL with your real inbox before launch.
 */
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

const SUPPORT_EMAIL = "support@travelpia.app";

export function SupportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const emailUs = () => {
    const subject = encodeURIComponent("TravelPia support");
    const body = encodeURIComponent(
      `\n\n—\nApp version: ${version}\nPlatform: ${Constants.platform?.ios ? "iOS" : "Android/Web"}`,
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(
      () => {},
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">Contact support</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconBox, { backgroundColor: theme.colors.chipBg }]}>
          <Ionicons name="chatbubbles-outline" size={30} color={theme.colors.primary} />
        </View>

        <AppText variant="title" center>
          We're here to help
        </AppText>
        <AppText variant="body" color={theme.colors.textMuted} center style={styles.intro}>
          Have a question, found a bug, or want to suggest a place? Send us an
          email and we'll get back to you.
        </AppText>

        <Pressable
          onPress={emailUs}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.control,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="mail-outline" size={18} color={theme.colors.onAccent} />
          <AppText variant="bodySemibold" color={theme.colors.onAccent}>
            Email us
          </AppText>
        </Pressable>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <AppText variant="caption" color={theme.colors.textMuted}>
            SUPPORT EMAIL
          </AppText>
          <AppText variant="bodyMedium" color={theme.colors.primary} selectable>
            {SUPPORT_EMAIL}
          </AppText>
        </View>

        <AppText variant="caption" color={theme.colors.textMuted} center style={styles.version}>
          TravelPia v{version}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: { flex: 1 },
  content: { padding: 24, alignItems: "center", gap: 12 },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  intro: { maxWidth: 320, marginBottom: 8 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    paddingHorizontal: 28,
    alignSelf: "stretch",
  },
  card: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    marginTop: 8,
  },
  version: { marginTop: 16 },
});
