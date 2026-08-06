/**
 * Terms & Conditions — static content. This is placeholder copy; have it
 * reviewed by legal and keep it in sync with your hosted policy before launch.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Acceptance of terms",
    body: "By creating an account or using TravelPia, you agree to these terms. If you do not agree, please do not use the app.",
  },
  {
    title: "2. The service",
    body: "TravelPia helps you explore Ireland county by county with AI-assisted answers, maps, weather, and saved places. Features may change or be discontinued at any time.",
  },
  {
    title: "3. AI answers & accuracy",
    body: "Answers are generated with the help of AI and third-party sources. They may be incomplete or inaccurate. Always verify important details (opening hours, prices, safety) before you travel, and treat suggestions as guidance, not professional advice.",
  },
  {
    title: "4. Your account",
    body: "You are responsible for keeping your login details secure and for activity under your account. Provide accurate information when signing up, and notify us of any unauthorised use.",
  },
  {
    title: "5. Acceptable use",
    body: "Do not misuse the service, attempt to disrupt it, scrape it at scale, or use it for unlawful purposes. We may suspend accounts that violate these terms.",
  },
  {
    title: "6. Third-party content",
    body: "Maps, imagery, weather, and place information come from third parties (including OpenStreetMap, Open-Meteo, and search providers). We do not control and are not responsible for third-party content or availability.",
  },
  {
    title: "7. Privacy",
    body: "We process your account details (email, phone, name) to provide the service. See our Privacy Policy for how your data is handled and how to request deletion.",
  },
  {
    title: "8. Limitation of liability",
    body: "TravelPia is provided “as is” without warranties. To the extent permitted by law, we are not liable for losses arising from your use of the app or reliance on its content.",
  },
  {
    title: "9. Changes",
    body: "We may update these terms from time to time. Continued use after changes means you accept the updated terms.",
  },
  {
    title: "10. Contact",
    body: "Questions about these terms? Reach us via Contact support in Settings.",
  },
];

export function TermsScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">Terms & Conditions</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="caption" color={theme.colors.textMuted}>
          Last updated: 2026
        </AppText>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <AppText variant="bodySemibold">{s.title}</AppText>
            <AppText variant="body" color={theme.colors.textMuted} style={styles.body}>
              {s.body}
            </AppText>
          </View>
        ))}
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
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  section: { gap: 4 },
  body: { lineHeight: 22 },
});
