/**
 * Theme context. Defaults to the OS colour scheme (the design ships light and
 * dark), and exposes a manual override so the Profile "Dark mode" toggle can
 * drive it later. Components consume the theme via `useTheme()`.
 */
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { buildTheme, type ColorScheme, type Theme } from "./tokens";

interface ThemeContextValue {
  theme: Theme;
  scheme: ColorScheme;
  /** null = follow the OS; otherwise a forced scheme. */
  override: ColorScheme | null;
  setOverride: (scheme: ColorScheme | null) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  const scheme: ColorScheme = override ?? (system === "dark" ? "dark" : "light");

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: buildTheme(scheme),
      scheme,
      override,
      setOverride,
      toggle: () => setOverride(scheme === "dark" ? "light" : "dark"),
    }),
    [scheme, override],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
