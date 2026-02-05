/**
 * DynamicGreeting
 *
 * Airbnb-inspired warm greeting with:
 * - Time-based contextual messaging
 * - Smooth icon animations
 * - Personalized touch
 * - Multiple variant options
 */
import { Text } from "@/components/ui/Text";
import { Colors, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface DynamicGreetingProps {
  userName: string;
  animated?: boolean;
  variant?: "default" | "hero" | "compact" | "inline";
  showIcon?: boolean;
}

type TimePeriod = "morning" | "afternoon" | "evening" | "night";

interface TimeConfig {
  greeting: string;
  subtext: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  iconColor: string;
  textColor: string;
}

const getTimePeriod = (): TimePeriod => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

const timeConfigs: Record<TimePeriod, TimeConfig> = {
  morning: {
    greeting: "Good Morning",
    subtext: "Rise and shine!",
    icon: "sunny",
    gradient: ["#FEF3C7", "#FDE68A"] as const,
    iconColor: "#F59E0B",
    textColor: "#92400E",
  },
  afternoon: {
    greeting: "Good Afternoon",
    subtext: "Keep up the momentum",
    icon: "sunny",
    gradient: ["#FFEDD5", "#FDBA74"] as const,
    iconColor: "#F97316",
    textColor: "#C2410C",
  },
  evening: {
    greeting: "Good Evening",
    subtext: "Wrapping up the day",
    icon: "partly-sunny",
    gradient: ["#FEE2E2", "#FECACA"] as const,
    iconColor: "#EF4444",
    textColor: "#991B1B",
  },
  night: {
    greeting: "Good Night",
    subtext: "Rest well",
    icon: "moon",
    gradient: ["#E0E7FF", "#C7D2FE"] as const,
    iconColor: "#6366F1",
    textColor: "#3730A3",
  },
};

export default function DynamicGreeting({
  userName,
  animated = true,
  variant = "default",
  showIcon = true,
}: DynamicGreetingProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const timePeriod = getTimePeriod();
  const config = timeConfigs[timePeriod];
  const firstName = userName?.split(" ")[0] || "there";

  useEffect(() => {
    if (animated) {
      // Gentle rotation
      rotation.value = withRepeat(
        withSequence(
          withTiming(8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Subtle pulse
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Glow animation for icon
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  // Hero variant - large prominent display
  if (variant === "hero") {
    return (
      <Animated.View
        entering={animated ? FadeInDown.delay(100).springify() : undefined}
        style={styles.heroContainer}
      >
        {showIcon && (
          <Animated.View style={[styles.heroIconWrapper, iconAnimatedStyle]}>
            <LinearGradient
              colors={config.gradient}
              style={styles.heroIconBackground}
            >
              <Ionicons name={config.icon} size={32} color={config.iconColor} />
            </LinearGradient>
          </Animated.View>
        )}
        <View style={styles.heroTextContainer}>
          <Text style={[styles.heroGreeting, { color: config.textColor }]}>
            {config.greeting}
          </Text>
          <Text style={styles.heroName}>{firstName}</Text>
          <Text style={styles.heroSubtext}>{config.subtext}</Text>
        </View>
      </Animated.View>
    );
  }

  // Compact variant - minimal inline display
  if (variant === "compact") {
    return (
      <Animated.View
        entering={animated ? FadeInDown.delay(100).springify() : undefined}
        style={styles.compactContainer}
      >
        {showIcon && (
          <Animated.View style={[styles.compactIconWrapper, iconAnimatedStyle]}>
            <Ionicons name={config.icon} size={16} color={config.iconColor} />
          </Animated.View>
        )}
        <Text style={styles.compactText}>
          <Text style={{ color: config.textColor }}>{config.greeting}</Text>
          <Text style={styles.compactName}>, {firstName}</Text>
        </Text>
      </Animated.View>
    );
  }

  // Inline variant - for hero sections with white text
  if (variant === "inline") {
    return (
      <View style={styles.inlineContainer}>
        <View style={styles.inlineGreetingRow}>
          {showIcon && (
            <Animated.View style={iconAnimatedStyle}>
              <Ionicons name={config.icon} size={14} color="rgba(255,255,255,0.9)" />
            </Animated.View>
          )}
          <Text style={styles.inlineGreetingText}>{config.greeting}</Text>
        </View>
      </View>
    );
  }

  // Default variant
  return (
    <Animated.View
      entering={animated ? FadeInDown.delay(100).springify() : undefined}
      style={styles.container}
    >
      <View style={styles.greetingRow}>
        {showIcon && (
          <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
            <LinearGradient colors={config.gradient} style={styles.iconBackground}>
              <Ionicons name={config.icon} size={22} color={config.iconColor} />
            </LinearGradient>
          </Animated.View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.greetingText, { color: config.textColor }]}>
            {config.greeting}
          </Text>
          <Text style={styles.subtext}>{config.subtext}</Text>
        </View>
      </View>
      <Text style={styles.userName}>{firstName}</Text>
    </Animated.View>
  );
}

// Export inline version for convenience
export function DynamicGreetingInline({
  userName,
  animated = true,
}: DynamicGreetingProps) {
  return (
    <DynamicGreeting
      userName={userName}
      animated={animated}
      variant="inline"
      showIcon={true}
    />
  );
}

// Export hero version
export function DynamicGreetingHero({
  userName,
  animated = true,
}: DynamicGreetingProps) {
  return (
    <DynamicGreeting
      userName={userName}
      animated={animated}
      variant="hero"
      showIcon={true}
    />
  );
}

const styles = StyleSheet.create({
  // Default variant
  container: {
    gap: Spacing.xs,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconWrapper: {},
  iconBackground: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    gap: 2,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  subtext: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },

  // Hero variant
  heroContainer: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  heroIconWrapper: {},
  heroIconBackground: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  heroTextContainer: {
    alignItems: "center",
    gap: 4,
  },
  heroGreeting: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  heroName: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -1,
  },
  heroSubtext: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Compact variant
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  compactIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  compactText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  compactName: {
    fontWeight: "700",
    color: Colors.text,
  },

  // Inline variant (for hero sections)
  inlineContainer: {},
  inlineGreetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineGreetingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
  },
});
