/**
 * Live current conditions for a county's centre, for the Home hero card.
 * Uses Open-Meteo (keyless, same source as the Weather tab). Soft-fails to
 * null so the hero still renders without a weather chip.
 */
import { useEffect, useState } from "react";

import { countyCenter } from "@/features/map/places";
import { getWeatherDetails } from "@/features/weather/useWeather";

export interface CountyConditions {
  temp: number;
  description: string;
}

export function useCountyWeather(county: string): CountyConditions | null {
  const [conditions, setConditions] = useState<CountyConditions | null>(null);

  useEffect(() => {
    const center = countyCenter(county);
    const controller = new AbortController();
    setConditions(null);

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${center.lat}&longitude=${center.lng}` +
      "&current=temperature_2m,weather_code&timezone=auto";

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("weather"))))
      .then((json) => {
        if (controller.signal.aborted) return;
        const current = json?.current;
        if (!current || typeof current.temperature_2m !== "number") return;
        setConditions({
          temp: Math.round(current.temperature_2m),
          description: getWeatherDetails(current.weather_code ?? 3).description,
        });
      })
      .catch(() => {
        /* soft-fail: hero renders without the weather chip */
      });

    return () => controller.abort();
  }, [county]);

  return conditions;
}
