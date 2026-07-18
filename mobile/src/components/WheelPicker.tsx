/**
 * A 3D wheel/spinner picker (pure JS — no native module, so it works in Expo
 * Go and on web). A snap-scrolling list where each row is rotated hard on the X
 * axis with a short perspective, plus a strong scale/opacity falloff, so it
 * reads as a curved drum. The centred row sits in a glowing selection band.
 */
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

interface WheelPickerProps {
  items: string[];
  /** Row to centre initially. */
  selectedIndex: number;
  onChange: (index: number) => void;
  itemHeight?: number;
  /** Visible rows (odd number keeps one centred). */
  visibleCount?: number;
}

export function WheelPicker({
  items,
  selectedIndex,
  onChange,
  itemHeight = 50,
  visibleCount = 5,
}: WheelPickerProps) {
  const theme = useTheme();
  const scrollY = useRef(new Animated.Value(selectedIndex * itemHeight)).current;
  const scrollRef = useRef<ScrollView>(null);

  const half = Math.floor(visibleCount / 2);
  const containerHeight = itemHeight * visibleCount;

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
    onChange(Math.max(0, Math.min(items.length - 1, raw)));
  };

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Glowing selection band */}
      <View
        pointerEvents="none"
        style={[
          styles.band,
          {
            top: half * itemHeight,
            height: itemHeight,
            borderColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        <Ionicons name="caret-forward" size={16} color={theme.colors.primary} />
        <View style={{ flex: 1 }} />
        <Ionicons name="caret-back" size={16} color={theme.colors.primary} />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: half * itemHeight }}
      >
        {items.map((item, i) => {
          const inputRange = [
            (i - 2) * itemHeight,
            (i - 1) * itemHeight,
            i * itemHeight,
            (i + 1) * itemHeight,
            (i + 2) * itemHeight,
          ];
          const rotateX = scrollY.interpolate({
            inputRange,
            outputRange: ["72deg", "38deg", "0deg", "-38deg", "-72deg"],
            extrapolate: "clamp",
          });
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.18, 0.5, 1, 0.5, 0.18],
            extrapolate: "clamp",
          });
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.7, 0.86, 1.06, 0.86, 0.7],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={`${item}-${i}`}
              style={[
                styles.item,
                {
                  height: itemHeight,
                  opacity,
                  transform: [{ perspective: 480 }, { rotateX }, { scale }],
                },
              ]}
            >
              <AppText variant="title" color={theme.colors.text}>
                {item}
              </AppText>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden" },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRadius: 14,
    // Green glow (iOS/web). Android shows a neutral elevation shadow.
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({ android: { elevation: 6 } }),
  },
  item: { alignItems: "center", justifyContent: "center" },
});
