/**
 * VYAPAAR SEVA Design System
 * Indian Flag inspired color palette with professional, clean aesthetics
 * Colors: Saffron, White, Green, Navy Blue (Ashoka Chakra)
 */

import { Platform } from "react-native";

// Indian Flag Color Palette - VYAPAAR SEVA
export const Colors = {
  // Primary - Saffron/Orange (Kesari) - Main brand color
  primary: "#FF9933",
  primaryLight: "#FFB366",
  primaryDark: "#E67300",

  // Secondary - India Green - For success states & accents
  secondary: "#138808",
  secondaryLight: "#22C55E",
  secondaryDark: "#0D6B06",

  // Accent - Teal - For gradients and highlights
  accent: "#0D9488",
  accentLight: "#14B8A6",
  accentDark: "#0F766E",

  // Tertiary - Teal (alias for gradients)
  teal: "#0D9488",
  tealLight: "#14B8A6",
  tealDark: "#0F766E",

  // Navy Blue - For special elements
  navy: "#1E3A5F",
  navyLight: "#2D5A8E",
  navyDark: "#0F1D2F",

  // Success - Emerald Green
  success: "#10B981",
  successLight: "#34D399",
  successDark: "#059669",

  // Warning - Amber (distinct from primary)
  warning: "#F59E0B",
  warningLight: "#FBBF24",
  warningDark: "#D97706",

  // Error - Red
  error: "#EF4444",
  errorLight: "#F87171",
  errorDark: "#DC2626",

  // Info - Blue
  info: "#3B82F6",
  infoLight: "#60A5FA",
  infoDark: "#2563EB",

  // Neutral/Gray
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",

  // Background
  background: "#FFFFFF",
  backgroundSecondary: "#F9FAFB",
  backgroundTertiary: "#F3F4F6",

  // Text
  text: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textInverse: "#FFFFFF",

  // Border
  border: "#E5E7EB",
  borderDark: "#D1D5DB",

  // Status Colors
  statusPresent: "#10B981",
  statusAbsent: "#EF4444",
  statusIncomplete: "#F59E0B",
  statusPending: "#F59E0B",
  statusApproved: "#10B981",
  statusRejected: "#EF4444",
  statusPaid: "#059669",
  statusDraft: "#9CA3AF",

  // Gradient Colors (for LinearGradient)
  gradientStart: "#0D9488", // Teal
  gradientMiddle: "#138808", // India Green
  gradientEnd: "#FFB366", // Light Saffron
  gradientSaffron: "#FF9933",
  gradientGreen: "#138808",

  // Semantic Action Colors
  buttonPrimary: "#FF9933", // Orange - Primary actions
  buttonSecondary: "#0D9488", // Teal - Secondary actions
  buttonSuccess: "#10B981", // Green - Confirm/Success actions
  buttonDanger: "#EF4444", // Red - Destructive actions

  // Glass Effect Colors
  glassWhite: "rgba(255, 255, 255, 0.85)",
  glassBorder: "rgba(255, 255, 255, 0.3)",
  glassOverlay: "rgba(255, 255, 255, 0.12)",
};

// Gradient Presets - Indian Flag Inspired
export const Gradients = {
  // Primary hero - warm saffron (main brand gradient)
  saffronHero: ["#CC5500", "#E67300", "#FF9933"] as const,

  // Success states - forest green
  greenSuccess: ["#0D6B06", "#138808", "#22C55E"] as const,

  // Premium accent - tricolor fade
  tricolor: ["#FF9933", "#FFFFFF", "#138808"] as const,

  // Navy depth - for headers/footers
  navyDepth: ["#0F1D2F", "#1E3A5F", "#2D5A8E"] as const,

  // Subtle backgrounds - warm glow
  warmGlow: ["#FFF7ED", "#FFEDD5", "#FED7AA"] as const,

  // Subtle backgrounds - cool mint
  coolMint: ["#ECFDF5", "#D1FAE5", "#A7F3D0"] as const,

  // Professional dark gradient
  darkPremium: ["#1F2937", "#374151", "#4B5563"] as const,

  // Teal accent gradient
  tealAccent: ["#0F766E", "#0D9488", "#14B8A6"] as const,
};

// Typography Scale
export const Typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },

  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Text Styles
  heading: {
    fontSize: 24,
    fontFamily: "FunnelSans_700Bold",
    color: Colors.text,
  },

  subheading: {
    fontSize: 18,
    fontFamily: "FunnelSans_600SemiBold",
    color: Colors.text,
  },

  title: {
    fontSize: 20,
    fontFamily: "FunnelSans_600SemiBold",
    color: Colors.text,
  },

  body: {
    fontSize: 16,
    fontFamily: "FunnelSans_400Regular",
    color: Colors.text,
  },

  caption: {
    fontSize: 14,
    fontFamily: "FunnelSans_400Regular",
    color: Colors.textSecondary,
  },

  buttonText: {
    fontSize: 16,
    fontFamily: "FunnelSans_600SemiBold",
    color: Colors.text,
  },

  // Enhanced Text Styles (Salary Book Style)
  screenTitle: {
    fontSize: 28,
    fontFamily: "FunnelSans_800ExtraBold",
    color: Colors.text,
    letterSpacing: -0.5,
  },

  sectionHeader: {
    fontSize: 14,
    fontFamily: "FunnelSans_700Bold",
    color: Colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },

  cardTitle: {
    fontSize: 17,
    fontFamily: "FunnelSans_700Bold",
    color: Colors.text,
    letterSpacing: -0.2,
  },

  metric: {
    fontSize: 24,
    fontFamily: "FunnelSans_800ExtraBold",
    color: Colors.text,
    letterSpacing: -0.5,
  },

  metricLabel: {
    fontSize: 12,
    fontFamily: "FunnelSans_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
};

// Spacing Scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
};

// Shadows - Modern Minimal (Soft, elegant elevation)
export const Shadows = {
  // Barely visible - for subtle depth
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  // Light shadow - default cards
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  // Medium shadow - elevated cards
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  // Pronounced shadow - modals, popovers
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  // Strong shadow - floating elements
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  // Button shadow - subtle lift
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // Colored shadow for primary buttons
  primary: {
    shadowColor: "#FF9933",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  // Inner glow effect
  inner: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 0,
  },
};

// Status Colors (Consistent with main Colors object)
export const StatusColors = {
  pending: {
    background: "#FEF3C7",
    border: "#FDE68A",
    text: "#92400E",
    icon: Colors.warning, // #F59E0B
  },
  approved: {
    background: "#D1FAE5",
    border: "#A7F3D0",
    text: "#065F46",
    icon: Colors.success, // #10B981
  },
  rejected: {
    background: "#FEE2E2",
    border: "#FECACA",
    text: "#991B1B",
    icon: Colors.error, // #EF4444
  },
  active: {
    background: "#D1FAE5",
    border: "#A7F3D0",
    text: "#065F46",
    icon: Colors.success, // #10B981
  },
  inactive: {
    background: "#F3F4F6",
    border: "#E5E7EB",
    text: "#6B7280",
    icon: Colors.gray400, // #9CA3AF
  },
  present: {
    background: "#D1FAE5",
    border: "#A7F3D0",
    text: "#065F46",
    icon: Colors.success, // #10B981
  },
  absent: {
    background: "#FEE2E2",
    border: "#FECACA",
    text: "#991B1B",
    icon: Colors.error, // #EF4444
  },
};

// Funnel Sans Font Family
export const FontFamily = {
  regular: "FunnelSans_400Regular",
  medium: "FunnelSans_500Medium",
  semibold: "FunnelSans_600SemiBold",
  bold: "FunnelSans_700Bold",
  extrabold: "FunnelSans_800ExtraBold",
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.regular,
    serif: "ui-serif",
    rounded: FontFamily.regular,
    mono: "ui-monospace",
  },
  default: {
    sans: FontFamily.regular,
    serif: "serif",
    rounded: FontFamily.regular,
    mono: "monospace",
  },
  web: {
    sans: `'Funnel Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
    serif: "Georgia, 'Times New Roman', serif",
    rounded: `'Funnel Sans', 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif`,
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Card Style Presets
export const CardStyles = {
  // Standard card - default for most use cases
  standard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    ...Shadows.sm,
  },

  // Elevated card - for important content
  elevated: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 0,
    ...Shadows.lg,
  },

  // Glass card - for hero sections overlay
  glass: {
    backgroundColor: Colors.glassWhite,
    borderRadius: BorderRadius["3xl"],
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadows.md,
  },

  // Gradient card - for hero sections
  gradient: {
    overflow: "hidden" as const,
    borderRadius: BorderRadius["3xl"],
  },

  // Interactive card - with press feedback styles
  interactive: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    ...Shadows.sm,
  },

  // Metric card - for dashboard stats
  metric: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.xs,
  },
};

// Button Style Presets
export const ButtonStyles = {
  // Primary button - main CTA
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadows.primary,
  },

  // Secondary button - outlined
  secondary: {
    backgroundColor: "transparent",
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Success button - confirm actions
  success: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  // Danger button - destructive actions
  danger: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Ghost button - subtle actions
  ghost: {
    backgroundColor: "transparent",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Large CTA button - for hero sections
  largeCTA: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius["2xl"],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    ...Shadows.primary,
  },
};

// Animation Presets (for Reanimated)
export const AnimationPresets = {
  // Card press scale
  pressScale: 0.98,
  pressDuration: 100,

  // Spring config for smooth animations
  springConfig: {
    damping: 15,
    stiffness: 150,
  },

  // Fade timing
  fadeDuration: 200,
};
