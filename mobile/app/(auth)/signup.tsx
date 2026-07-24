import { useRouter } from "expo-router";
import { useState } from "react";

import {
  AuthButton,
  AuthFooterLink,
  AuthInput,
  AuthScreen,
} from "@/components/auth/AuthShared";
import { useAuth } from "@/contexts/AuthContext";
import { signupRequest } from "@/lib/api";
import {
  isMinLengthPassword,
  isValidEmail,
  isValidPhone,
  normalizePhone,
} from "@/lib/validation";

export default function SignupScreen() {
  const { completeLogin } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
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
    if (!isMinLengthPassword(password)) {
      setFieldError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signupRequest(
        email.trim(),
        normalizePhone(phone),
        password,
        fullName.trim() || null,
      );

      if (!result.ok) {
        if (result.kind === "conflict") {
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
      title="Create account"
      subtitle="Join TravelPia to start exploring Ireland."
      bannerError={bannerError}
      fieldError={fieldError}
      footer={
        <AuthFooterLink
          prompt="Already have an account?"
          actionLabel="Sign in"
          onPress={() => router.push("/login")}
          disabled={submitting}
        />
      }
    >
      <AuthInput
        label="Full name"
        leadingIcon="person-outline"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoCorrect={false}
        textContentType="name"
        autoComplete="name"
        placeholder="Optional"
        editable={!submitting}
      />

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
        textContentType="newPassword"
        autoComplete="password-new"
        placeholder="Password"
        editable={!submitting}
        hint="Minimum 8 characters"
      />

      <AuthButton
        label="Create account"
        onPress={onSubmit}
        loading={submitting}
        disabled={submitting}
      />
    </AuthScreen>
  );
}
