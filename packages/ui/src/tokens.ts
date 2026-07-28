export const colors = {
  // RhemaVoice logo palette
  purple950: "#05001E",
  purple900: "#100030",
  purple800: "#1A0A3C",
  purple700: "#2D1258",
  purple600: "#651882",
  purple500: "#9B23C2",
  purple300: "#C77DFF",
  purple100: "#F3E8FF",
  gold500: "#DFA622",
  gold400: "#F5C542",
  gold300: "#FFE56B",
  gold200: "#FFF3B0",
  // Surfaces
  surface: "#F8F5FC",
  surfaceElevated: "#FFFFFF",
  ink: "#100030",
  inkMuted: "#5C4E78",
  success: "#2F6B4F",
  danger: "#A33B3B",
  darkSurface: "#05001E",
  darkElevated: "#140A2E",
  darkInk: "#F8F5FC",
  darkInkMuted: "#B8A9D4",
  // Legacy aliases used across apps
  navy950: "#05001E",
  navy900: "#100030",
  navy800: "#1A0A3C",
  navy700: "#2D1258",
} as const;

export const fonts = {
  display: '"Fraunces", "Cormorant Garamond", Georgia, serif',
  body: '"Source Sans 3", "Source Sans Pro", system-ui, sans-serif',
} as const;

export const motion = {
  durationMs: 280,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  spring: { type: "spring" as const, stiffness: 320, damping: 28 },
};

export const lightTheme = {
  background: colors.surface,
  elevated: colors.surfaceElevated,
  text: colors.ink,
  textMuted: colors.inkMuted,
  primary: colors.purple900,
  accent: colors.gold500,
  secondary: colors.purple500,
  border: "rgba(16, 0, 48, 0.12)",
};

export const darkTheme = {
  background: colors.darkSurface,
  elevated: colors.darkElevated,
  text: colors.darkInk,
  textMuted: colors.darkInkMuted,
  primary: colors.gold300,
  accent: colors.gold500,
  secondary: colors.purple500,
  border: "rgba(248, 245, 252, 0.12)",
};

export type AppTheme = typeof lightTheme;

export const brand = {
  name: "RhemaVoice",
  tagline: "Our Voice Is Light",
  developer: "RhemaVoice Technologies Inc.",
  footer: "Empowering Voices of Liberia",
  description:
    "A kingdom-focused community platform to connect, worship, learn, communicate, and grow.",
  academyInstitution: "Chayil",
  academyInstitutionFull: "Chayil Company Intensive",
} as const;
