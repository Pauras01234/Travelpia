/**
 * Last-resort error screen for uncaught render errors.
 *
 * Expo Router picks this up via the `ErrorBoundary` export in `app/_layout.tsx`.
 * Without it, one bad render leaves the user staring at a white screen with no
 * way out and nothing in Play Console (a JS error is not a native crash).
 *
 * Deliberately self-contained: it reads raw palette values rather than
 * `useTheme()`, because the thing that just failed might be a provider. An
 * error screen must not be able to throw.
 */
import type { ErrorBoundaryProps } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";

import { palettes } from "@/theme/tokens";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = palettes[scheme];

  return (
    <View style={[styles.root, { backgroundColor: c.surface }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.body, { color: c.textMuted }]}>
          TravelPia hit an unexpected problem. Trying again usually clears it.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: c.onAccent }]}>
            Try again
          </Text>
        </Pressable>

        {/* Kept visible in release too: when a tester reports a problem, this
            message is the difference between a guess and a diagnosis. */}
        <ScrollView style={styles.detailBox}>
          <Text style={[styles.detail, { color: c.textMuted }]}>
            {error?.message ?? "Unknown error"}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { gap: 12, maxWidth: 420, width: "100%" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22 },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonLabel: { fontSize: 15, fontWeight: "600" },
  detailBox: { maxHeight: 160, marginTop: 8 },
  detail: { fontSize: 12, lineHeight: 18, fontFamily: "monospace" },
});
