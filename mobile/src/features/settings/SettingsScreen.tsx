/**
 * Settings — edit display name (persisted via PATCH /auth/me) and profile
 * picture (device-local), plus links to Terms & Conditions and Contact support.
 */
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/features/profile/useProfile";
import { useTheme } from "@/theme/ThemeProvider";

import { useAvatar } from "./AvatarContext";
import { updateUsername } from "./settingsApi";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { handleUnauthorized } = useAuth();
  const { profile, loading, reload } = useProfile();
  const { avatarUri, setAvatarUri } = useAvatar();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill / re-sync the field from the loaded profile.
  useEffect(() => {
    if (profile) setName(profile.full_name ?? "");
  }, [profile?.full_name]);

  const changePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo access is needed to change your picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateUsername(name.trim(), handleUnauthorized);
      await reload();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const dirty = profile ? name.trim() !== (profile.full_name ?? "") : false;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">Settings</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !profile ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarBlock}>
            <Avatar
              uri={avatarUri}
              name={profile?.full_name}
              email={profile?.email}
              size={88}
            />
            <View style={styles.photoActions}>
              <Pressable onPress={changePhoto} accessibilityRole="button">
                <AppText variant="bodySemibold" color={theme.colors.primary}>
                  Change photo
                </AppText>
              </Pressable>
              {avatarUri && (
                <Pressable onPress={() => setAvatarUri(null)} accessibilityRole="button">
                  <AppText variant="bodySemibold" color={theme.colors.error}>
                    Remove
                  </AppText>
                </Pressable>
              )}
            </View>
          </View>

          {/* Display name */}
          <AppText variant="caption" color={theme.colors.textMuted} style={styles.label}>
            DISPLAY NAME
          </AppText>
          <View
            style={[
              styles.inputShell,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.control,
              },
            ]}
          >
            <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setSaved(false);
                setError(null);
              }}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
              editable={!saving}
              maxLength={120}
            />
          </View>

          {!!profile?.email && (
            <AppText variant="caption" color={theme.colors.textMuted} style={styles.emailNote}>
              Signed in as {profile.email}
            </AppText>
          )}

          {error && (
            <AppText variant="caption" color={theme.colors.error} style={styles.feedback}>
              {error}
            </AppText>
          )}
          {saved && !error && (
            <AppText variant="caption" color={theme.colors.success} style={styles.feedback}>
              Saved.
            </AppText>
          )}

          <Pressable
            onPress={onSave}
            disabled={saving || !dirty}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radius.control,
                opacity: saving || !dirty ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.onAccent} />
            ) : (
              <AppText variant="bodySemibold" color={theme.colors.onAccent}>
                Save changes
              </AppText>
            )}
          </Pressable>

          {/* Links */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <LinkRow
              icon="document-text-outline"
              label="Terms & Conditions"
              onPress={() => router.push("/terms")}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <LinkRow
              icon="mail-outline"
              label="Contact support"
              onPress={() => router.push("/support")}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.rowIcon, { backgroundColor: theme.colors.chipBg }]}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <AppText variant="bodyMedium">{label}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 32, gap: 10 },
  avatarBlock: { alignItems: "center", gap: 10, marginBottom: 8 },
  photoActions: { flexDirection: "row", gap: 20 },
  label: { letterSpacing: 0.5, marginTop: 4 },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  emailNote: { marginTop: 2 },
  feedback: { marginTop: 2 },
  saveBtn: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, marginTop: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
});
