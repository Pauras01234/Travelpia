import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { loginRequest } from "@/lib/api";
import {
  isNonEmptyPassword,
  isValidEmail,
  isValidPhone,
  normalizePhone,
} from "@/lib/validation";

export default function LoginScreen() {
  const { completeLogin } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setBannerError(null);
    setFieldError(null);

    if (!isValidEmail(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    if (!isValidPhone(phone)) {
      setFieldError("Enter a phone number in international format (e.g. +353…).");
      return;
    }
    if (!isNonEmptyPassword(password)) {
      setFieldError("Enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginRequest(
        email.trim(),
        normalizePhone(phone),
        password,
      );

      if (!result.ok) {
        if (result.kind === "unauthorized") {
          setBannerError(result.detail);
        } else {
          setBannerError(result.message);
        }
        return;
      }

      await completeLogin(result.data.access_token, result.data.refresh_token);
      router.replace("/(app)");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.brand}>Travelpia</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {bannerError ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Text style={styles.bannerText}>{bannerError}</Text>
          </View>
        ) : null}

        {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          placeholder="you@example.com"
          editable={!submitting}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="+353 87 123 4567"
          editable={!submitting}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="password"
            autoComplete="password"
            placeholder="Password"
            editable={!submitting}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.showHide}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Text style={styles.showHideText}>{showPassword ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 24,
  },
  banner: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  bannerText: {
    color: "#991b1b",
    fontSize: 14,
  },
  fieldError: {
    color: "#b91c1c",
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
    marginBottom: 14,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  passwordRow: {
    position: "relative",
    marginBottom: 8,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 64,
  },
  showHide: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  showHideText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    marginTop: 18,
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
