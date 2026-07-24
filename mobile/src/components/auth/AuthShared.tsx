/**
 * Shared auth UI, styled on the TravelPia design system (design screen 03).
 * Uses the app ThemeProvider so login/signup match the app and adapt to
 * light/dark automatically. Import these from both auth screens — don't
 * duplicate styling.
 */
import { useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useTheme } from "@/theme/ThemeProvider";

type IoniconName = keyof typeof Ionicons.glyphMap;

// -- Input -----------------------------------------------------------------
type AuthInputProps = TextInputProps & {
  label: string;
  hint?: string;
  leadingIcon?: IoniconName;
  /** Renders a password field with a built-in show/hide eye toggle. */
  secure?: boolean;
};

export function AuthInput({
  label,
  hint,
  leadingIcon,
  secure,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: AuthInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <View style={styles.field}>
      <AppText variant="caption" color={theme.colors.textMuted} style={styles.label}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: theme.colors.card,
            borderColor: focused ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radius.control,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        {leadingIcon ? (
          <Ionicons name={leadingIcon} size={18} color={theme.colors.textMuted} />
        ) : null}
        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={secure ? !show : rest.secureTextEntry}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secure ? (
          <Pressable
            onPress={() => setShow((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={show ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={show ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" color={theme.colors.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

// -- Primary button --------------------------------------------------------
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
  const theme = useTheme();
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radius.control,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.onAccent} />
      ) : (
        <AppText variant="bodySemibold" color={theme.colors.onAccent}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

// -- Footer link -----------------------------------------------------------
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
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={styles.footerRow}
    >
      <AppText variant="body" color={theme.colors.textMuted}>
        {prompt}{" "}
      </AppText>
      <AppText variant="bodySemibold" color={theme.colors.accent}>
        {actionLabel}
      </AppText>
    </Pressable>
  );
}

// -- Screen shell ----------------------------------------------------------
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
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="location" size={22} color={theme.colors.onPrimary} />
          </View>

          <AppText variant="display" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="body" color={theme.colors.textMuted} style={styles.subtitle}>
            {subtitle}
          </AppText>

          {bannerError ? (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.error,
                  borderRadius: theme.radius.control,
                },
              ]}
              accessibilityRole="alert"
            >
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <AppText variant="bodyMedium" color={theme.colors.error} style={styles.flex}>
                {bannerError}
              </AppText>
            </View>
          ) : null}

          {fieldError ? (
            <AppText variant="caption" color={theme.colors.error} style={styles.fieldError}>
              {fieldError}
            </AppText>
          ) : null}

          <View style={styles.form}>{children}</View>

          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 16, gap: 6, flexGrow: 1 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { marginBottom: 4 },
  subtitle: { marginBottom: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  fieldError: { marginBottom: 8 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { letterSpacing: 0.3 },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  button: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  footer: { marginTop: "auto", paddingTop: 24, alignItems: "center" },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
