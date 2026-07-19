import { StyleSheet } from "react-native";

export type WeatherThemeName = "light" | "dark";

export type WeatherTheme = {
  name: WeatherThemeName;
  colors: {
    background: string;
    card: string;
    border: string;
    primary: string;
    text: string;
    textMuted: string;
    heroBackground: string;
    heroText: string;
    heroMuted: string;
    heroIcon: string;
    locationSurface: string;
    searchSurface: string;
    accent: string;
    error: string;
    errorSurface: string;
    temperatureTrack: string;
    weatherIcon: string;
    sunIcon: string;
    primaryButtonText: string;
  };
};

export const lightWeatherTheme: WeatherTheme = {
  name: "light",
  colors: {
    background: "#F7F1E5",
    card: "#FFFFFF",
    border: "#E1D8C8",
    primary: "#0F6248",
    text: "#202720",
    textMuted: "#637068",
    heroBackground: "#FFFFFF",
    heroText: "#202720",
    heroMuted: "#59685F",
    heroIcon: "#5B8978",
    locationSurface: "#EFE8D8",
    searchSurface: "#FFFFFF",
    accent: "#D6A13B",
    error: "#B84C43",
    errorSurface: "#F9E5E1",
    temperatureTrack: "#D4DDD7",
    weatherIcon: "#4C8977",
    sunIcon: "#D99A25",
    primaryButtonText: "#FFFFFF",
  },
};

export const darkWeatherTheme: WeatherTheme = {
  name: "dark",
  colors: {
    background: "#07110D",
    card: "#102019",
    border: "#21382F",
    primary: "#41D891",
    text: "#F7FAF8",
    textMuted: "#7E9B8F",
    heroBackground: "#294E5F",
    heroText: "#FFFFFF",
    heroMuted: "#D4E0E4",
    heroIcon: "#7895A2",
    locationSurface: "#102019",
    searchSurface: "#102019",
    accent: "#F6B94A",
    error: "#FF8B7B",
    errorSurface: "#2A1714",
    temperatureTrack: "#49645A",
    weatherIcon: "#87B9CE",
    sunIcon: "#F6B94A",
    primaryButtonText: "#07110D",
  },
};

export const weatherThemes = {
  light: lightWeatherTheme,
  dark: darkWeatherTheme,
};

export function createWeatherStyles(theme: WeatherTheme) {
  const colors = theme.colors;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
    },
    centeredScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 14,
      color: colors.textMuted,
      fontSize: 15,
    },
    errorTitle: {
      marginTop: 14,
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    errorMessage: {
      marginTop: 8,
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 20,
      paddingHorizontal: 22,
      paddingVertical: 11,
      borderRadius: 22,
      backgroundColor: colors.primary,
    },
    retryButtonText: {
      color: colors.primaryButtonText,
      fontSize: 14,
      fontWeight: "700",
    },
    appHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    brand: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    brandIcon: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: colors.primary,
    },
    brandTitle: {
      flexShrink: 1,
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    selectedLocation: {
      maxWidth: 94,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 18,
      backgroundColor: colors.locationSurface,
    },
    selectedLocationText: {
      flexShrink: 1,
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    themeButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 19,
      backgroundColor: colors.card,
    },
    searchSection: {
      marginBottom: 16,
    },
    searchBar: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.searchSurface,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 15,
    },
    searchResults: {
      marginTop: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.card,
    },
    searchResult: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    searchResultBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchResultText: {
      flex: 1,
    },
    searchResultName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    searchResultLocation: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 12,
    },
    noResultsText: {
      marginTop: 10,
      color: colors.textMuted,
      fontSize: 13,
      textAlign: "center",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.errorSurface,
    },
    errorBannerText: {
      flex: 1,
      color: colors.error,
      fontSize: 13,
    },
    currentCard: {
      minHeight: 164,
      flexDirection: "row",
      overflow: "hidden",
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      backgroundColor: colors.heroBackground,
    },
    currentCardContent: {
      flex: 1,
      zIndex: 2,
    },
    currentLocation: {
      color: colors.heroMuted,
      fontSize: 15,
    },
    temperatureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    currentTemperature: {
      color: colors.heroText,
      fontSize: 62,
      lineHeight: 70,
      fontWeight: "700",
      letterSpacing: -3,
    },
    currentDescription: {
      flexShrink: 1,
      marginLeft: 7,
      color: colors.heroText,
      fontSize: 15,
    },
    currentDetails: {
      marginTop: 7,
      color: colors.heroMuted,
      fontSize: 13,
    },
    currentWeatherIcon: {
      width: 85,
      alignItems: "center",
      justifyContent: "center",
      opacity: 0.9,
    },
    metricsRow: {
      flexDirection: "row",
      gap: 11,
      marginTop: 16,
    },
    metricCard: {
      flex: 1,
      minHeight: 78,
      justifyContent: "center",
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.card,
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
    },
    metricValue: {
      marginTop: 5,
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    sectionTitle: {
      marginTop: 20,
      marginBottom: 11,
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    hourlyCard: {
      minHeight: 112,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 15,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.card,
    },
    hourColumn: {
      flex: 1,
      alignItems: "center",
      gap: 9,
    },
    hourTime: {
      color: colors.textMuted,
      fontSize: 12,
    },
    hourTemperature: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    dailyCard: {
      overflow: "hidden",
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.card,
    },
    dailyRow: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dailyRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dayName: {
      width: 42,
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    dayDescription: {
      flex: 1,
      color: colors.textMuted,
      fontSize: 12,
    },
    minimumTemperature: {
      width: 27,
      color: colors.textMuted,
      fontSize: 13,
      textAlign: "right",
    },
    temperatureTrack: {
      width: 54,
      height: 5,
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: colors.temperatureTrack,
    },
    temperatureRange: {
      width: "72%",
      height: "100%",
      alignSelf: "flex-end",
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    maximumTemperature: {
      width: 29,
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "right",
    },
  });
}