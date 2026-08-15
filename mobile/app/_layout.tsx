/**
 * Root layout: loads brand fonts, installs the theme + safe-area providers,
 * and holds the splash screen until fonts are ready so text never flashes in a
 * fallback face.
 */
import { useEffect } from "react";
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ExploreProvider } from "@/features/explore/ExploreContext";
import { SavedPlacesProvider } from "@/features/saved/SavedPlacesContext";
import { AvatarProvider } from "@/features/settings/AvatarContext";
import { ThemeProvider, useThemeContext } from "@/theme/ThemeProvider";

// Expo Router renders this instead of a white screen when a render throws.
export { ErrorBoundary } from "@/components/ErrorScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    // Hide the splash once fonts resolve (or fail — we degrade to system font
    // rather than block the app forever).
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ExploreProvider>
          <SavedPlacesProvider>
            <AvatarProvider>
              <AuthProvider>
                <ThemedNavigation />
              </AuthProvider>
            </AvatarProvider>
          </SavedPlacesProvider>
        </ExploreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedNavigation() {
  const { theme, scheme } = useThemeContext();
  const { isReady } = useAuth();

  // Hold navigation until the persisted session has been read, so we don't
  // flash the tabs before redirecting an unauthenticated user to login.
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surface,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.surface },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
