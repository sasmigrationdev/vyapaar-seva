import React from "react";
import { StyleSheet, ViewStyle, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type GradientVariant = "default" | "subtle" | "header" | "card" | "welcome";

interface GradientBackgroundProps {
  children?: React.ReactNode;
  variant?: GradientVariant;
  style?: ViewStyle;
  colors?: string[];
}

const gradientConfigs: Record<
  GradientVariant,
  { colors: string[]; locations?: number[]; start?: { x: number; y: number }; end?: { x: number; y: number } }
> = {
  default: {
    colors: [Colors.primaryDark, Colors.primary, Colors.primaryLight],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  subtle: {
    colors: [Colors.primary, Colors.primaryLight, "#FFCC80"],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 0.3, y: 1 },
  },
  header: {
    colors: [Colors.primaryDark, Colors.primary, Colors.primaryLight],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  card: {
    colors: [Colors.primary, Colors.primaryLight],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  welcome: {
    colors: ["#E67300", "#FF9933", "#FFB366", "#FFCC80"],
    locations: [0, 0.3, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
};

export function GradientBackground({
  children,
  variant = "default",
  style,
  colors,
}: GradientBackgroundProps) {
  const config = gradientConfigs[variant];
  const gradientColors = colors || config.colors;

  return (
    <LinearGradient
      colors={gradientColors as [string, string, ...string[]]}
      locations={config.locations}
      start={config.start}
      end={config.end}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default GradientBackground;
