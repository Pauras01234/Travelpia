/**
 * Typed text primitive. Applies the design type scale + font family per
 * variant and defaults to the theme's foreground colour, so screens never
 * hard-code font names or sizes.
 */
import { Text, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

type Variant =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyMedium"
  | "bodySemibold"
  | "caption";

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function AppText({
  variant = "body",
  color,
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();

  const variantStyle: TextStyle = (() => {
    switch (variant) {
      case "display":
        return { ...theme.type.display, fontFamily: theme.fonts.display };
      case "title":
        return { ...theme.type.title, fontFamily: theme.fonts.displaySemi };
      case "heading":
        return { ...theme.type.heading, fontFamily: theme.fonts.heading };
      case "bodyMedium":
        return { ...theme.type.body, fontFamily: theme.fonts.medium };
      case "bodySemibold":
        return { ...theme.type.body, fontFamily: theme.fonts.semibold };
      case "caption":
        return { ...theme.type.caption, fontFamily: theme.fonts.semibold };
      case "body":
      default:
        return { ...theme.type.body, fontFamily: theme.fonts.body };
    }
  })();

  return (
    <Text
      style={[
        variantStyle,
        { color: color ?? theme.colors.text },
        center && { textAlign: "center" },
        style,
      ]}
      {...rest}
    />
  );
}
