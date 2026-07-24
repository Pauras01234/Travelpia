import { useRouter } from "expo-router";
import { useState } from "react";

import {
  AuthButton,
  AuthFooterLink,
  AuthInput,
  AuthScreen,
} from "@/components/auth/AuthShared";
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
      router.replace("/(tabs)");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log in to keep exploring Ireland."
      bannerError={bannerError}
      fieldError={fieldError}
      footer={
        <AuthFooterLink
          prompt="New to TravelPia?"
          actionLabel="Create an account"
          onPress={() => router.push("/signup")}
          disabled={submitting}
        />
      }
    >
      <AuthInput
        label="Email"
        leadingIcon="mail-outline"
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

      <AuthInput
        label="Phone"
        leadingIcon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        placeholder="+353 87 123 4567"
        editable={!submitting}
      />

      <AuthInput
        label="Password"
        leadingIcon="lock-closed-outline"
        secure
        value={password}
        onChangeText={setPassword}
        textContentType="password"
        autoComplete="password"
        placeholder="Password"
        editable={!submitting}
      />

      <AuthButton
        label="Log in"
        onPress={onSubmit}
        loading={submitting}
        disabled={submitting}
      />
    </AuthScreen>
  );
}
