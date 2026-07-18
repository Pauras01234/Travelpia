import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createWeatherStyles,
  type WeatherTheme,
  type WeatherThemeName,
  weatherThemes,
} from "./WeatherTheme";
import {
  type WeatherKind,
  useWeather,
} from "./useWeather";

type IoniconName = keyof typeof Ionicons.glyphMap;

function getWeatherIcon(kind: WeatherKind): IoniconName {
  switch (kind) {
    case "clear":
      return "sunny-outline";

    case "partly-cloudy":
      return "partly-sunny-outline";

    case "cloudy":
      return "cloud-outline";

    case "fog":
      return "reorder-three-outline";

    case "drizzle":
    case "rain":
      return "rainy-outline";

    case "snow":
      return "snow-outline";

    case "storm":
      return "thunderstorm-outline";

    default:
      return "cloud-outline";
  }
}

function getWeatherIconColor(
  kind: WeatherKind,
  theme: WeatherTheme,
): string {
  if (kind === "clear" || kind === "partly-cloudy") {
    return theme.colors.sunIcon;
  }

  return theme.colors.weatherIcon;
}

export default function WeatherScreen() {
  const [themeName, setThemeName] =
    useState<WeatherThemeName>("light");

  const theme = weatherThemes[themeName];

  const styles = useMemo(
    () => createWeatherStyles(theme),
    [theme],
  );

  const {
    weather,
    searchQuery,
    searchResults,
    isLoading,
    isSearching,
    error,
    setSearchQuery,
    selectPlace,
    refresh,
  } = useWeather();

  const toggleTheme = () => {
    setThemeName((currentTheme) =>
      currentTheme === "light" ? "dark" : "light",
    );
  };

  const statusBarStyle =
    themeName === "light"
      ? "dark-content"
      : "light-content";

  if (isLoading && !weather) {
    return (
      <SafeAreaView
        style={styles.centeredScreen}
        edges={["top"]}
      >
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={theme.colors.background}
        />

        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading Galway weather…
        </Text>
      </SafeAreaView>
    );
  }

  if (!weather) {
    return (
      <SafeAreaView
        style={styles.centeredScreen}
        edges={["top"]}
      >
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={theme.colors.background}
        />

        <Ionicons
          name="cloud-offline-outline"
          size={46}
          color={theme.colors.error}
        />

        <Text style={styles.errorTitle}>
          Weather unavailable
        </Text>

        <Text style={styles.errorMessage}>
          {error ??
            "Please check your connection and try again."}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={refresh}
        >
          <Text style={styles.retryButtonText}>
            Try again
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const current = weather.current;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={theme.colors.background}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appHeader}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons
                name="partly-sunny-outline"
                size={21}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.brandTitle}>
              Weather TravelPia
            </Text>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.selectedLocation}>
              <Ionicons
                name="location-outline"
                size={15}
                color={theme.colors.primary}
              />

              <Text
                style={styles.selectedLocationText}
                numberOfLines={1}
              >
                {weather.place.name}
              </Text>
            </View>

            <Pressable
              style={styles.themeButton}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={
                themeName === "light"
                  ? "Switch to dark theme"
                  : "Switch to light theme"
              }
            >
              <Ionicons
                name={
                  themeName === "light"
                    ? "moon-outline"
                    : "sunny-outline"
                }
                size={19}
                color={theme.colors.primary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={20}
              color={theme.colors.textMuted}
            />

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search cities or places"
              placeholderTextColor={
                theme.colors.textMuted
              }
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
            />

            {isSearching && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
              />
            )}

            {searchQuery.length > 0 && !isSearching && (
              <Pressable
                onPress={() => setSearchQuery("")}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            )}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((place, index) => (
                <Pressable
                  key={`${place.id}-${place.latitude}-${place.longitude}`}
                  style={[
                    styles.searchResult,
                    index < searchResults.length - 1 &&
                      styles.searchResultBorder,
                  ]}
                  onPress={() => void selectPlace(place)}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={theme.colors.primary}
                  />

                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultName}>
                      {place.name}
                    </Text>

                    <Text
                      style={styles.searchResultLocation}
                    >
                      {[place.admin1, place.country]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {searchQuery.trim().length >= 2 &&
            !isSearching &&
            searchResults.length === 0 && (
              <Text style={styles.noResultsText}>
                No matching places found
              </Text>
            )}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={theme.colors.error}
            />

            <Text style={styles.errorBannerText}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.currentCard}>
          <View style={styles.currentCardContent}>
            <Text style={styles.currentLocation}>
              {weather.place.name},{" "}
              {weather.place.country} · now
            </Text>

            <View style={styles.temperatureRow}>
              <Text style={styles.currentTemperature}>
                {current.temperature}°
              </Text>

              <Text style={styles.currentDescription}>
                {current.description}
              </Text>
            </View>

            <Text style={styles.currentDetails}>
              Feels {current.apparentTemperature}° {"  "}
              H {current.maximumTemperature}° · L{" "}
              {current.minimumTemperature}° {"  "}
              {current.windSpeed} km/h{" "}
              {current.windDirection}
            </Text>
          </View>

          <View style={styles.currentWeatherIcon}>
            <Ionicons
              name={getWeatherIcon(current.kind)}
              size={72}
              color={theme.colors.heroIcon}
            />
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>RAIN</Text>

            <Text style={styles.metricValue}>
              {current.rainProbability}%
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>UV</Text>

            <Text
              style={styles.metricValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {current.uvIndex}{" "}
              {current.uvDescription}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>
              SUNSET
            </Text>

            <Text style={styles.metricValue}>
              {current.sunset}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOURLY</Text>

        <View style={styles.hourlyCard}>
          {weather.hourly.map((hour) => (
            <View
              key={`${hour.time}-${hour.temperature}`}
              style={styles.hourColumn}
            >
              <Text style={styles.hourTime}>
                {hour.time}
              </Text>

              <Ionicons
                name={getWeatherIcon(hour.kind)}
                size={24}
                color={getWeatherIconColor(
                  hour.kind,
                  theme,
                )}
              />

              <Text style={styles.hourTemperature}>
                {hour.temperature}°
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          5-DAY OUTLOOK
        </Text>

        <View style={styles.dailyCard}>
          {weather.daily.map((day, index) => (
            <View
              key={day.date}
              style={[
                styles.dailyRow,
                index < weather.daily.length - 1 &&
                  styles.dailyRowBorder,
              ]}
            >
              <Text style={styles.dayName}>
                {day.day}
              </Text>

              <Ionicons
                name={getWeatherIcon(day.kind)}
                size={20}
                color={getWeatherIconColor(
                  day.kind,
                  theme,
                )}
              />

              <Text
                style={styles.dayDescription}
                numberOfLines={1}
              >
                {day.description}
              </Text>

              <Text style={styles.minimumTemperature}>
                {day.minimumTemperature}°
              </Text>

              <View style={styles.temperatureTrack}>
                <View
                  style={styles.temperatureRange}
                />
              </View>

              <Text style={styles.maximumTemperature}>
                {day.maximumTemperature}°
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}