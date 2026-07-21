import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

/** Shared auth theme — import from both login and signup; do not duplicate. */
export const colors = {
  navy: "#111827",
  accent: "#E07856",
  white: "#ffffff",
  background: "#f8fafc",
  card: "#ffffff",
  text: "#111827",
  textMuted: "#6b7280",
  label: "#374151",
  border: "#d1d5db",
  bannerBg: "#fef2f2",
  bannerBorder: "#fecaca",
  bannerText: "#991b1b",
  fieldError: "#b91c1c",
  hint: "#9ca3af",
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

const HEADER_HEIGHT = 220;

type AuthInputProps = TextInputProps & {
  label: string;
  hint?: string;
  trailing?: ReactNode;
};

export function AuthInput({
  label,
  hint,
  trailing,
  style,
  onFocus,
  onBlur,
  ...rest
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.inputShell, { borderColor }]}>
        <TextInput
          {...rest}
          style={[styles.input, trailing ? styles.inputWithTrailing : null, style]}
          placeholderTextColor={colors.hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </Animated.View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: AuthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

type AuthScreenProps = {
  title: string;
  subtitle: string;
  bannerError: string | null;
  fieldError: string | null;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthScreen({
  title,
  subtitle,
  bannerError,
  fieldError,
  footer,
  children,
}: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const cardAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  useEffect(() => {
    if (bannerError) {
      bannerAnim.setValue(0);
      Animated.timing(bannerAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    } else {
      bannerAnim.setValue(0);
    }
  }, [bannerError, bannerAnim]);

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const bannerTranslateY = bannerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 390 220"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <SvgLinearGradient id="authHeaderGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.navy} stopOpacity="1" />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="390" height="220" fill="url(#authHeaderGrad)" />
          {/* Simple mountain line-art motif */}
          <Path
            d="M40 170 L120 95 L165 130 L230 70 L350 170"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M195 58 L195 42 M187 50 L203 50"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <Path
            d="M195 42 L201 48 L195 46 L189 48 Z"
            fill="rgba(255,255,255,0.35)"
          />
        </Svg>
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>Travelpia</Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardAnim,
            transform: [{ translateY: cardTranslateY }],
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {bannerError ? (
            <Animated.View
              style={[
                styles.banner,
                {
                  opacity: bannerAnim,
                  transform: [{ translateY: bannerTranslateY }],
                },
              ]}
              accessibilityRole="alert"
            >
              <Text style={styles.bannerText}>{bannerError}</Text>
            </Animated.View>
          ) : null}

          {fieldError ? (
            <Text style={styles.fieldError}>{fieldError}</Text>
          ) : null}

          {children}

          {footer}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

type AuthFooterLinkProps = {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AuthFooterLink({
  prompt,
  actionLabel,
  onPress,
  disabled,
}: AuthFooterLinkProps) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerPrompt}>{prompt}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="link"
        hitSlop={8}
      >
        <Text style={styles.footerAction}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: HEADER_HEIGHT,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 8,
  },
  headerCopy: {
    zIndex: 1,
  },
  brand: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.2,
  },
  card: {
    flex: 1,
    marginTop: -24,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
  },
  cardContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  banner: {
    backgroundColor: colors.bannerBg,
    borderColor: colors.bannerBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  bannerText: {
    color: colors.bannerText,
    fontSize: 14,
  },
  fieldError: {
    color: colors.fieldError,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.label,
    marginBottom: spacing.xs,
  },
  inputShell: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.white,
    position: "relative",
  },
  input: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  inputWithTrailing: {
    paddingRight: 64,
  },
  trailing: {
    position: "absolute",
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.hint,
  },
  button: {
    marginTop: 18,
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  footerPrompt: {
    fontSize: 14,
    color: colors.textMuted,
  },
  footerAction: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
