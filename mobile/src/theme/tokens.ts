/**
 * Design tokens — the single source of truth for colour, spacing, radius and
 * typography. Values come from the TravelPia design system (Foundations, 01).
 *
 * Two colour themes (light/dark) share one semantic key set, so components
 * reference roles ("primary", "surface") rather than raw hex and work in both
 * themes automatically.
 */

export type ColorScheme = "light" | "dark";

export interface ThemeColors {
  primary: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  onAccent: string;
  surface: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
  chipBg: string;
  chipText: string;
  overlay: string;
}

const light: ThemeColors = {
  primary: "#14543A",
  onPrimary: "#FFFFFF",
  secondary: "#3C5F72",
  accent: "#E0A32E",
  onAccent: "#1F251E",
  surface: "#F5EFE3",
  card: "#FFFFFF",
  text: "#1F251E",
  textMuted: "#52615A",
  border: "#E4DCC9",
  muted: "#93AD99",
  success: "#3E9B63",
  warning: "#E0A32E",
  error: "#C0492F",
  chipBg: "#EFE8D8",
  chipText: "#1F251E",
  overlay: "rgba(20, 30, 24, 0.45)",
};

const dark: ThemeColors = {
  primary: "#4BAE77",
  onPrimary: "#0E151D",
  secondary: "#83AACD",
  accent: "#E9B44C",
  onAccent: "#1F251E",
  surface: "#0E151D",
  card: "#16211C",
  text: "#EAF1EC",
  textMuted: "#A6B5AC",
  border: "#24302A",
  muted: "#6FB07B",
  success: "#4BAE77",
  warning: "#E9B44C",
  error: "#E1785F",
  chipBg: "#1B2620",
  chipText: "#EAF1EC",
  overlay: "rgba(0, 0, 0, 0.55)",
};

export const palettes: Record<ColorScheme, ThemeColors> = { light, dark };

/** 8-pt spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Radius tokens: Control 12, Card 16 (+ pill for chips/buttons). */
export const radius = {
  control: 12,
  card: 16,
  pill: 999,
} as const;

/**
 * Font families. Bricolage Grotesque (display) + Plus Jakarta Sans (body).
 * These names must match the keys registered with `useFonts`.
 */
export const fonts = {
  display: "BricolageGrotesque_800ExtraBold",
  displaySemi: "BricolageGrotesque_700Bold",
  heading: "PlusJakartaSans_700Bold",
  semibold: "PlusJakartaSans_600SemiBold",
  medium: "PlusJakartaSans_500Medium",
  body: "PlusJakartaSans_400Regular",
} as const;

/** Type scale (size / lineHeight) from the design's type ramp. */
export const typeScale = {
  display: { fontSize: 34, lineHeight: 40 },
  title: { fontSize: 24, lineHeight: 30 },
  heading: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fonts: typeof fonts;
  type: typeof typeScale;
}

export function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: palettes[scheme],
    spacing,
    radius,
    fonts,
    type: typeScale,
  };
}
