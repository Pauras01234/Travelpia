/**
 * The "live thinking" state (design screen 05). Because /ask returns a single
 * response, we surface progress by stepping through the real pipeline stages
 * on a timer — search, read, match — landing on the last until the answer
 * arrives (at which point the parent swaps this out).
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

const STEPS = [
  "Searching trusted sources",
  "Reading county guides",
  "Matching places to the map",
] as const;

const STEP_INTERVAL_MS = 1100;

export function ThinkingState() {
  const theme = useTheme();
  const [active, setActive] = useState(0);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Advance through the steps, then hold on the final one.
    const id = setInterval(() => {
      setActive((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.card,
        },
      ]}
      accessibilityLabel="TravelPia is thinking"
    >
      <View style={styles.headerRow}>
        <Ionicons name="search" size={16} color={theme.colors.primary} />
        <AppText variant="bodySemibold">Searching trusted sources</AppText>
      </View>
      <View style={styles.steps}>
        {STEPS.map((label, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <View key={label} style={styles.stepRow}>
              {done ? (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.colors.success}
                />
              ) : current ? (
                <Animated.View
                  style={[
                    styles.dot,
                    { backgroundColor: theme.colors.primary, opacity: pulse },
                  ]}
                />
              ) : (
                <View
                  style={[styles.ring, { borderColor: theme.colors.border }]}
                />
              )}
              <AppText
                variant="body"
                color={done || current ? theme.colors.text : theme.colors.textMuted}
              >
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  steps: { gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  ring: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
});
