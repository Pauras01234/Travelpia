import { useCallback, useEffect, useState } from "react";

export type WeatherKind =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

export type Place = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

export type HourlyWeather = {
  time: string;
  temperature: number;
  kind: WeatherKind;
};

export type DailyWeather = {
  date: string;
  day: string;
  description: string;
  minimumTemperature: number;
  maximumTemperature: number;
  kind: WeatherKind;
};

export type WeatherData = {
  place: Place;
  current: {
    temperature: number;
    apparentTemperature: number;
    minimumTemperature: number;
    maximumTemperature: number;
    description: string;
    kind: WeatherKind;
    windSpeed: number;
    windDirection: string;
    rainProbability: number;
    uvIndex: number;
    uvDescription: string;
    sunset: string;
  };
  hourly: HourlyWeather[];
  daily: DailyWeather[];
};

type GeocodingResponse = {
  results?: Array<{
    id: number;
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
};

type ForecastResponse = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_probability_max: number[];
  };
};

const DEFAULT_PLACE: Place = {
  id: 2964180,
  name: "Galway",
  country: "Ireland",
  admin1: "Connacht",
  latitude: 53.2707,
  longitude: -9.0568,
};

function getWeatherDetails(code: number): {
  description: string;
  kind: WeatherKind;
} {
  if (code === 0) {
    return {
      description: "Clear sky",
      kind: "clear",
    };
  }

  if (code === 1) {
    return {
      description: "Mainly clear",
      kind: "partly-cloudy",
    };
  }

  if (code === 2) {
    return {
      description: "Partly cloudy",
      kind: "partly-cloudy",
    };
  }

  if (code === 3) {
    return {
      description: "Cloudy",
      kind: "cloudy",
    };
  }

  if (code === 45 || code === 48) {
    return {
      description: "Foggy",
      kind: "fog",
    };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      description: "Light drizzle",
      kind: "drizzle",
    };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      description: "Rain",
      kind: "rain",
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      description: "Snow",
      kind: "snow",
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      description: "Thunderstorm",
      kind: "storm",
    };
  }

  return {
    description: "Unknown",
    kind: "cloudy",
  };
}

function getWindDirection(degrees: number): string {
  const directions = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
  ];

  const index = Math.round(degrees / 45) % directions.length;

  return directions[index];
}

function getUvDescription(uvIndex: number): string {
  if (uvIndex < 3) {
    return "LOW";
  }

  if (uvIndex < 6) {
    return "MODERATE";
  }

  if (uvIndex < 8) {
    return "HIGH";
  }

  if (uvIndex < 11) {
    return "VERY HIGH";
  }

  return "EXTREME";
}

function formatSunset(value: string): string {
  return value.substring(11, 16);
}

function formatDay(date: string, index: number): string {
  if (index === 0) {
    return "Today";
  }

  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "en-GB",
    {
      weekday: "short",
    },
  );
}

function createForecastUrl(place: Place): string {
  const currentVariables = [
    "temperature_2m",
    "apparent_temperature",
    "weather_code",
    "wind_speed_10m",
    "wind_direction_10m",
  ].join(",");

  const hourlyVariables = [
    "temperature_2m",
    "weather_code",
    "precipitation_probability",
  ].join(",");

  const dailyVariables = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "sunset",
    "uv_index_max",
    "precipitation_probability_max",
  ].join(",");

  return (
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${place.latitude}` +
    `&longitude=${place.longitude}` +
    `&current=${currentVariables}` +
    `&hourly=${hourlyVariables}` +
    `&daily=${dailyVariables}` +
    "&timezone=auto" +
    "&forecast_days=6"
  );
}

function transformForecast(
  response: ForecastResponse,
  place: Place,
): WeatherData {
  const currentDetails = getWeatherDetails(
    response.current.weather_code,
  );

  let currentHourIndex = response.hourly.time.findIndex(
    (time) => time >= response.current.time,
  );

  if (currentHourIndex < 0) {
    currentHourIndex = 0;
  }

  const hourly = response.hourly.time
    .slice(currentHourIndex, currentHourIndex + 5)
    .map((time, index) => {
      const sourceIndex = currentHourIndex + index;

      const details = getWeatherDetails(
        response.hourly.weather_code[sourceIndex],
      );

      return {
        time: index === 0 ? "Now" : time.substring(11, 16),
        temperature: Math.round(
          response.hourly.temperature_2m[sourceIndex],
        ),
        kind: details.kind,
      };
    });

  const daily = response.daily.time
    .slice(0, 5)
    .map((date, index) => {
      const details = getWeatherDetails(
        response.daily.weather_code[index],
      );

      return {
        date,
        day: formatDay(date, index),
        description: details.description,
        minimumTemperature: Math.round(
          response.daily.temperature_2m_min[index],
        ),
        maximumTemperature: Math.round(
          response.daily.temperature_2m_max[index],
        ),
        kind: details.kind,
      };
    });

  const uvIndex = Math.round(
    response.daily.uv_index_max[0] ?? 0,
  );

  return {
    place,
    current: {
      temperature: Math.round(
        response.current.temperature_2m,
      ),
      apparentTemperature: Math.round(
        response.current.apparent_temperature,
      ),
      minimumTemperature: Math.round(
        response.daily.temperature_2m_min[0],
      ),
      maximumTemperature: Math.round(
        response.daily.temperature_2m_max[0],
      ),
      description: currentDetails.description,
      kind: currentDetails.kind,
      windSpeed: Math.round(
        response.current.wind_speed_10m,
      ),
      windDirection: getWindDirection(
        response.current.wind_direction_10m,
      ),
      rainProbability: Math.round(
        response.daily.precipitation_probability_max[0] ?? 0,
      ),
      uvIndex,
      uvDescription: getUvDescription(uvIndex),
      sunset: formatSunset(response.daily.sunset[0]),
    },
    hourly,
    daily,
  };
}

export function useWeather() {
  const [weather, setWeather] =
    useState<WeatherData | null>(null);

  const [selectedPlace, setSelectedPlace] =
    useState<Place>(DEFAULT_PLACE);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(async (place: Place) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(createForecastUrl(place));

      if (!response.ok) {
        throw new Error(
          "Unable to load weather information.",
        );
      }

      const forecast =
        (await response.json()) as ForecastResponse;

      setWeather(transformForecast(forecast, place));
      setSelectedPlace(place);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while loading weather.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather(DEFAULT_PLACE);
  }, [loadWeather]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsSearching(true);

      try {
        const url =
          "https://geocoding-api.open-meteo.com/v1/search" +
          `?name=${encodeURIComponent(query)}` +
          "&count=6" +
          "&language=en" +
          "&format=json";

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to search places.");
        }

        const data =
          (await response.json()) as GeocodingResponse;

        const places: Place[] = (data.results ?? []).map(
          (place) => ({
            id: place.id,
            name: place.name,
            country: place.country,
            admin1: place.admin1,
            latitude: place.latitude,
            longitude: place.longitude,
          }),
        );

        setSearchResults(places);
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const selectPlace = useCallback(
    async (place: Place) => {
      setSearchQuery("");
      setSearchResults([]);

      await loadWeather(place);
    },
    [loadWeather],
  );

  const refresh = useCallback(async () => {
    await loadWeather(selectedPlace);
  }, [loadWeather, selectedPlace]);

  return {
    weather,
    searchQuery,
    searchResults,
    isLoading,
    isSearching,
    error,
    setSearchQuery,
    selectPlace,
    refresh,
  };
}