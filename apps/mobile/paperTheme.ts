import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { colors, darkTheme, lightTheme } from "./theme";

const NAVY = colors.navy900;
const GOLD = colors.gold500;
const GOLD_LIGHT = colors.gold300;

export const paperLight = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: NAVY,
    onPrimary: "#FFFFFF",
    primaryContainer: colors.purple100,
    onPrimaryContainer: NAVY,
    secondary: GOLD,
    onSecondary: NAVY,
    secondaryContainer: "#FFF3B0",
    onSecondaryContainer: NAVY,
    background: lightTheme.background,
    onBackground: lightTheme.text,
    surface: lightTheme.elevated,
    onSurface: lightTheme.text,
    surfaceVariant: "#EFE7FA",
    onSurfaceVariant: lightTheme.textMuted,
    outline: lightTheme.border,
    outlineVariant: "rgba(16, 0, 48, 0.10)",
    error: colors.danger,
    onError: "#FFFFFF",
  },
};

export const paperDark = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: GOLD_LIGHT,
    onPrimary: colors.purple950,
    primaryContainer: "rgba(223, 166, 34, 0.16)",
    onPrimaryContainer: GOLD_LIGHT,
    secondary: GOLD,
    onSecondary: colors.purple950,
    secondaryContainer: "rgba(197, 160, 72, 0.16)",
    onSecondaryContainer: GOLD_LIGHT,
    background: darkTheme.background,
    onBackground: darkTheme.text,
    surface: darkTheme.elevated,
    onSurface: darkTheme.text,
    surfaceVariant: "#1E1140",
    onSurfaceVariant: darkTheme.textMuted,
    outline: darkTheme.border,
    outlineVariant: "rgba(248, 245, 252, 0.10)",
    error: "#F87171",
    onError: "#1A0000",
  },
};

// Dark is the default aesthetic for RhemaVoice
export const paperDefault = paperDark;
