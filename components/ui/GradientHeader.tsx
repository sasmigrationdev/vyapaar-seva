import React from "react";
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Image,
  StatusBar,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { Colors, Spacing } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  variant?: "default" | "compact" | "large";
  style?: ViewStyle;
}

export function GradientHeader({
  title,
  subtitle,
  showLogo = false,
  showBack = false,
  rightAction,
  variant = "default",
  style,
}: GradientHeaderProps) {
  const insets = useSafeAreaInsets();

  const getHeaderHeight = () => {
    switch (variant) {
      case "compact":
        return 100;
      case "large":
        return 200;
      default:
        return 140;
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={["#E67300", "#FF9933", "#FFB366"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            paddingTop: insets.top + Spacing.md,
            minHeight: getHeaderHeight() + insets.top,
          },
          style,
        ]}
      >
        {/* Navigation Row */}
        <View style={styles.navRow}>
          {showBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}

          {rightAction || <View style={styles.placeholder} />}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {showLogo && (
            <Image
              source={require("@/assets/images/logovs.png")}
              style={[
                styles.logo,
                variant === "compact" && styles.logoCompact,
                variant === "large" && styles.logoLarge,
              ]}
              resizeMode="contain"
            />
          )}

          <Text
            style={[
              styles.title,
              variant === "compact" && styles.titleCompact,
              variant === "large" && styles.titleLarge,
            ]}
          >
            {title}
          </Text>

          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  content: {
    alignItems: "center",
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  logoCompact: {
    width: 40,
    height: 40,
  },
  logoLarge: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleCompact: {
    fontSize: 18,
  },
  titleLarge: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default GradientHeader;
