/**
 * Bottom tab bar — the app shell from the design (Home · Ask · Map · Weather ·
 * Profile). Only Ask is implemented in this slice; the others are placeholders
 * owned by other work items but wired here so navigation is complete.
 */
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme/ThemeProvider";

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const theme = useTheme();
  const { isSignedIn } = useAuth();

  // Gate the whole authenticated app shell behind a valid session.
  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  const icon =
    (name: IoniconName) =>
    ({ color, size }: { color: string; size: number }) => (
      <Ionicons name={name} color={color} size={size} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: icon("home-outline") }}
      />
      <Tabs.Screen
        name="ask"
        options={{ title: "Ask", tabBarIcon: icon("chatbubble-ellipses-outline") }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: "Map", tabBarIcon: icon("map-outline") }}
      />
      <Tabs.Screen
        name="weather"
        options={{ title: "Weather", tabBarIcon: icon("partly-sunny-outline") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: icon("person-outline") }}
      />
    </Tabs>
  );
}
