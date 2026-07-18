/**
 * Skeleton placeholder with a gentle pulse, for loading states. Composable:
 * build a screen's loading layout out of several <Skeleton /> blocks sized to
 * match the real content.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, type DimensionValue, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.muted,
          opacity: pulse.interpolate({
            inputRange: [0.5, 1],
            outputRange: [0.18, 0.34],
          }),
        },
        style,
      ]}
    />
  );
}
