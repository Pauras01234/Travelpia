/**
 * Profile tab (design screen 07 · Profile).
 *
 * Loads the signed-in user from /auth/me and renders: identity (avatar +
 * name + email), trip stats, a functional Dark mode toggle (drives the app
 * ThemeProvider), account rows, and a working Log out.
 *
 * The gear opens Settings (edit name/photo); "Saved places" and "Help &
 * feedback" route to their screens. Notifications is a "Soon" placeholder.
 */
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedPlaces } from "@/features/saved/SavedPlacesContext";
import { useAvatar } from "@/features/settings/AvatarContext";
import { useTheme, useThemeContext } from "@/theme/ThemeProvider";

import { useProfile } from "./useProfile";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function ProfileScreen() {
  const theme = useTheme();
  const { scheme, toggle } = useThemeContext();
  const { logout } = useAuth();
  const router = useRouter();
  const { profile, loading, error, reload } = useProfile();
  const { places: savedPlaces } = useSavedPlaces();
  const { avatarUri } = useAvatar();

  const [loggingOut, setLoggingOut] = useState(false);

  // Refresh (silently) whenever the tab regains focus — e.g. after editing the
  // name in Settings.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout(); // clears session → (tabs) layout redirects to /login
    } catch {
      setLoggingOut(false); // stay put if logout somehow throws
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <AppText variant="title">Profile</AppText>
        <Pressable
          onPress={() => router.push("/settings")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppText variant="body" color={theme.colors.textMuted} center>
            {error}
          </AppText>
          <Pressable onPress={reload} style={styles.retry} accessibilityRole="button">
            <AppText variant="bodySemibold" color={theme.colors.primary}>
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity */}
          <View style={styles.identity}>
            <Avatar
              uri={avatarUri}
              name={profile?.full_name}
              email={profile?.email}
              size={56}
            />
            <View style={styles.identityText}>
              <AppText variant="heading" numberOfLines={1}>
                {profile?.full_name?.trim() || "Traveller"}
              </AppText>
              <AppText variant="body" color={theme.colors.textMuted} numberOfLines={1}>
                {profile?.email || ""}
              </AppText>
            </View>
          </View>

          {/* Stats — accurate for a new account; wire to real counts when the
              saved-places / events features track them. */}
          <View style={styles.stats}>
            <StatCard value={savedPlaces.length} label="Saved places" />
            <StatCard value={0} label="Counties" />
            <StatCard value={0} label="Events" />
          </View>

          {/* Appearance */}
          <SectionLabel>APPEARANCE</SectionLabel>
          <View
            style={[
              styles.card,
              styles.settingRow,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.chipBg }]}>
                <Ionicons name="moon-outline" size={18} color={theme.colors.primary} />
              </View>
              <AppText variant="bodyMedium">Dark mode</AppText>
            </View>
            <Switch
              value={scheme === "dark"}
              onValueChange={toggle}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.card}
              accessibilityLabel="Toggle dark mode"
            />
          </View>

          {/* Account */}
          <SectionLabel>ACCOUNT</SectionLabel>
          <View
            style={[
              styles.card,
              styles.cardGroup,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <AccountRow
              icon="bookmark-outline"
              label="Saved places"
              onPress={() => router.push("/saved")}
            />
            <Divider />
            <AccountRow icon="notifications-outline" label="Notifications" soon />
            <Divider />
            <AccountRow
              icon="help-circle-outline"
              label="Help & feedback"
              onPress={() => router.push("/support")}
            />
          </View>

          {/* Log out */}
          <Pressable
            onPress={onLogout}
            disabled={loggingOut}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.logout,
              {
                borderColor: theme.colors.error,
                borderRadius: theme.radius.control,
                opacity: loggingOut ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
                <AppText variant="bodySemibold" color={theme.colors.error}>
                  Log out
                </AppText>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
    >
      <AppText variant="heading" color={theme.colors.primary}>
        {value}
      </AppText>
      <AppText variant="caption" color={theme.colors.textMuted} center>
        {label}
      </AppText>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <AppText variant="caption" color={theme.colors.textMuted} style={styles.sectionLabel}>
      {children}
    </AppText>
  );
}

function AccountRow({
  icon,
  label,
  onPress,
  soon,
}: {
  icon: IoniconName;
  label: string;
  onPress?: () => void;
  soon?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={soon ? undefined : onPress}
      disabled={soon || !onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!soon }}
      style={({ pressed }) => [styles.row, { opacity: pressed && !soon ? 0.6 : 1 }]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.rowIcon, { backgroundColor: theme.colors.chipBg }]}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <AppText variant="bodyMedium" color={soon ? theme.colors.textMuted : theme.colors.text}>
          {label}
        </AppText>
      </View>
      {soon ? (
        <AppText variant="caption" color={theme.colors.textMuted}>
          Soon
        </AppText>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      )}
    </Pressable>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  retry: { paddingVertical: 8, paddingHorizontal: 16 },
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1, gap: 2 },
  stats: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 14,
  },
  sectionLabel: { letterSpacing: 0.5, marginTop: 4, marginBottom: -6 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  cardGroup: { paddingVertical: 4 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
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
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderWidth: 1.5,
    marginTop: 8,
  },
});
