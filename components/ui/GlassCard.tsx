import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  padding?: keyof typeof Spacing;
  borderRadius?: keyof typeof BorderRadius;
}

export default function GlassCard({
  children,
  style,
  intensity = 80,
  tint = "light",
  padding = "lg",
  borderRadius = "3xl",
}: GlassCardProps) {
  return (
    <View style={[styles.container, { borderRadius: BorderRadius[borderRadius] }, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[
          styles.blurContainer,
          {
            padding: Spacing[padding],
            borderRadius: BorderRadius[borderRadius],
          },
        ]}
      >
        {children}
      </BlurView>
    </View>
  );
}

// Alternative Glass Card without BlurView (works on all platforms)
export function GlassCardSimple({
  children,
  style,
  padding = "lg",
  borderRadius = "3xl",
}: Omit<GlassCardProps, "intensity" | "tint">) {
  return (
    <View
      style={[
        styles.simpleGlassContainer,
        {
          padding: Spacing[padding],
          borderRadius: BorderRadius[borderRadius],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    ...Shadows.md,
  },
  blurContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  simpleGlassContainer: {
    backgroundColor: Colors.glassWhite,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadows.md,
  },
});
