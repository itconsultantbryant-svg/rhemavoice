export const colors = {
  // RhemaVoice logo palette
  purple950: "#05001E",
  purple900: "#100030",
  purple800: "#1A0A3C",
  purple700: "#2D1258",
  purple600: "#651882",
  purple500: "#9B23C2",
  purple400: "#B05CE6",
  purple300: "#C77DFF",
  purple200: "#DFAEFF",
  purple100: "#F3E8FF",
  gold600: "#B8860B",
  gold500: "#DFA622",
  gold400: "#F5C542",
  gold300: "#FFE56B",
  gold200: "#FFF3B0",
  gold100: "#FFFAE3",
  // Surfaces
  surface: "#F8F5FC",
  surfaceElevated: "#FFFFFF",
  ink: "#100030",
  inkMuted: "#5C4E78",
  success: "#2F6B4F",
  warning: "#9A6700",
  info: "#1D4ED8",
  danger: "#A33B3B",
  live: "#22C55E",
  darkSurface: "#05001E",
  darkElevated: "#140A2E",
  darkElevatedAlt: "#1E1140",
  darkInk: "#F8F5FC",
  darkInkMuted: "#B8A9D4",
  darkSuccess: "#4ADE80",
  darkWarning: "#FACC15",
  darkInfo: "#60A5FA",
  darkDanger: "#F87171",
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
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
  danger: colors.danger,
  live: colors.live,
  shadow: "0 12px 40px rgba(16, 0, 48, 0.1)",
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
  success: colors.darkSuccess,
  warning: colors.darkWarning,
  info: colors.darkInfo,
  danger: colors.darkDanger,
  live: colors.live,
  shadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
};

export type AppTheme = typeof lightTheme;

export const gradients = {
  brand: "linear-gradient(135deg, #100030 0%, #2d1258 45%, #651882 100%)",
  gold: "linear-gradient(135deg, #dfa622 0%, #ffe56b 100%)",
  hero: "linear-gradient(160deg, #05001e 0%, #2d1258 55%, #100030 100%)",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const layout = {
  bottomTabHeight: 64,
  headerHeight: 64,
  contentMaxWidth: 1200,
} as const;

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
