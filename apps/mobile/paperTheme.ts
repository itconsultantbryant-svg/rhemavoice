import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { colors, darkTheme, lightTheme } from "./theme";

export const paperLight = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.navy900,
    secondary: colors.gold500,
    background: lightTheme.background,
    surface: lightTheme.elevated,
    onSurface: lightTheme.text,
  },
};

export const paperDark = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.gold300,
    secondary: colors.gold500,
    background: darkTheme.background,
    surface: darkTheme.elevated,
    onSurface: darkTheme.text,
  },
};
