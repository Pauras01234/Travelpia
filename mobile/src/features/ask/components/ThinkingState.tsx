/**
 * "Assistant is typing" indicator — three animated dots in a chat bubble,
 * shown while /ask is in flight. Deliberately simple: /ask returns a single
 * response, so a fabricated step-by-step checklist would be misleading.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

// One full cycle per dot; equal length keeps the three dots phase-locked.
const CYCLE_MS = 900;
const UP_MS = 250;
const DOWN_MS = 250;
const OFFSETS = [0, 150, 300];

export function ThinkingState() {
  const theme = useTheme();
  const values = useRef(OFFSETS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = values.map((value, i) => {
      const lead = OFFSETS[i];
      const trail = CYCLE_MS - lead - UP_MS - DOWN_MS;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(lead),
          Animated.timing(value, {
            toValue: 1,
            duration: UP_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: DOWN_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(trail),
        ]),
      );
    });
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [values]);

  return (
    <View style={styles.row} accessibilityLabel="TravelPia is typing">
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.card,
          },
        ]}
      >
        {values.map((value, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.textMuted,
                opacity: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    translateY: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -4],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start" },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
