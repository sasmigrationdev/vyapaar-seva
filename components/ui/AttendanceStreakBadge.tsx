/**
 * AttendanceStreakBadge
 *
 * Paytm-inspired gamification with:
 * - Fire icon with dynamic animation intensity
 * - Milestone celebrations (7, 14, 30 days)
 * - Gradient backgrounds based on streak
 * - Trophy icons for achievements
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { StyleSheet, Animated, Easing, View } from "react-native";
import AnimatedRN, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface AttendanceStreakBadgeProps {
  currentStreak: number;
  bestStreak?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  variant?: "badge" | "card";
}

// Milestone thresholds for celebrations
const MILESTONES = [7, 14, 30, 60, 90, 180, 365];

export default function AttendanceStreakBadge({
  currentStreak,
  bestStreak,
  size = "md",
  showLabel = true,
  variant = "badge",
}: AttendanceStreakBadgeProps) {
  const countAnim = useRef(new Animated.Value(0)).current;
  const fireScale = useSharedValue(1);
  const fireRotation = useSharedValue(0);

  const sizes = {
    sm: { icon: 14, fontSize: 13, padding: 6, gap: 3 },
    md: { icon: 18, fontSize: 16, padding: 10, gap: 4 },
    lg: { icon: 24, fontSize: 22, padding: 14, gap: 6 },
  };

  const config = sizes[size];

  // Check if current streak is a milestone
  const isMilestone = MILESTONES.includes(currentStreak);
  const nextMilestone = MILESTONES.find((m) => m > currentStreak) || currentStreak + 1;
  const progressToNext = currentStreak > 0 ? (currentStreak / nextMilestone) * 100 : 0;

  // Animate the counter
  useEffect(() => {
    Animated.timing(countAnim, {
      toValue: currentStreak,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStreak]);

  // Fire animation - intensity based on streak
  useEffect(() => {
    const intensity = Math.min(currentStreak / 14, 1); // Max intensity at 14 days

    // Scale animation
    fireScale.value = withRepeat(
      withSequence(
        withSpring(1 + intensity * 0.15, { damping: 8 }),
        withSpring(1, { damping: 8 })
      ),
      -1,
      true
    );

    // Rotation wiggle for high streaks
    if (currentStreak >= 7) {
      fireRotation.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 150 }),
          withTiming(-5, { duration: 150 }),
          withTiming(0, { duration: 150 })
        ),
        -1,
        false
      );
    }
  }, [currentStreak]);

  const fireAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fireScale.value },
      { rotate: `${fireRotation.value}deg` },
    ],
  }));

  // Get gradient colors based on streak (heat scale)
  const getStreakTheme = () => {
    if (currentStreak >= 30) {
      return {
        gradient: ["#7C3AED", "#EC4899"] as const, // Purple-pink (legendary)
        text: "#7C3AED",
        icon: "#EC4899",
        label: "Legendary",
        iconName: "fire" as const,
      };
    }
    if (currentStreak >= 14) {
      return {
        gradient: ["#EF4444", "#F97316"] as const, // Red-orange (on fire)
        text: "#DC2626",
        icon: "#EF4444",
        label: "On Fire!",
        iconName: "fire" as const,
      };
    }
    if (currentStreak >= 7) {
      return {
        gradient: ["#F97316", "#FBBF24"] as const, // Orange-amber (hot)
        text: "#C2410C",
        icon: "#F97316",
        label: "Hot Streak",
        iconName: "fire" as const,
      };
    }
    if (currentStreak >= 3) {
      return {
        gradient: ["#FBBF24", "#FDE68A"] as const, // Amber (warming up)
        text: "#B45309",
        icon: "#F59E0B",
        label: "Warming Up",
        iconName: "fire" as const,
      };
    }
    return {
      gradient: ["#E5E7EB", "#F3F4F6"] as const, // Gray (starting)
      text: Colors.textSecondary,
      icon: Colors.gray400,
      label: "Starting",
      iconName: "fire" as const,
    };
  };

  const theme = getStreakTheme();

  if (currentStreak === 0) {
    return null;
  }

  // Card variant - more detailed display
  if (variant === "card") {
    return (
      <AnimatedRN.View entering={FadeIn.delay(200).springify()} style={styles.card}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            {/* Fire icon with animation */}
            <AnimatedRN.View style={[styles.fireWrapper, fireAnimatedStyle]}>
              <MaterialCommunityIcons
                name={isMilestone ? "trophy" : theme.iconName}
                size={32}
                color="#FFFFFF"
              />
            </AnimatedRN.View>

            {/* Streak count */}
            <View style={styles.cardTextContent}>
              <View style={styles.streakRow}>
                <Animated.Text style={styles.cardStreakCount}>
                  {countAnim.interpolate({
                    inputRange: [0, currentStreak],
                    outputRange: ["0", String(currentStreak)],
                    extrapolate: "clamp",
                  })}
                </Animated.Text>
                <Text style={styles.cardStreakUnit}>day streak</Text>
              </View>
              <Text style={styles.cardLabel}>{theme.label}</Text>
            </View>

            {/* Milestone badge */}
            {isMilestone && (
              <View style={styles.milestoneBadge}>
                <MaterialCommunityIcons name="star" size={12} color="#FBBF24" />
                <Text style={styles.milestoneText}>Milestone!</Text>
              </View>
            )}
          </View>

          {/* Progress to next milestone */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progressToNext}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {currentStreak}/{nextMilestone} to next milestone
            </Text>
          </View>
        </LinearGradient>

        {/* Best streak indicator */}
        {bestStreak && bestStreak > currentStreak && (
          <View style={styles.bestStreakRow}>
            <MaterialCommunityIcons name="crown" size={14} color={Colors.warning} />
            <Text style={styles.bestStreakText}>Best: {bestStreak} days</Text>
          </View>
        )}
      </AnimatedRN.View>
    );
  }

  // Badge variant - compact display
  return (
    <AnimatedRN.View entering={FadeIn.delay(200).springify()}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.badge,
          {
            paddingHorizontal: config.padding + 4,
            paddingVertical: config.padding,
            gap: config.gap,
          },
        ]}
      >
        <AnimatedRN.View style={fireAnimatedStyle}>
          <MaterialCommunityIcons
            name={isMilestone ? "trophy" : theme.iconName}
            size={config.icon}
            color="#FFFFFF"
          />
        </AnimatedRN.View>
        <Animated.Text
          style={[
            styles.badgeCount,
            { fontSize: config.fontSize },
          ]}
        >
          {countAnim.interpolate({
            inputRange: [0, currentStreak],
            outputRange: ["0", String(currentStreak)],
            extrapolate: "clamp",
          })}
        </Animated.Text>
        {showLabel && (
          <Text style={styles.badgeLabel}>
            day{currentStreak !== 1 ? "s" : ""}
          </Text>
        )}
      </LinearGradient>
    </AnimatedRN.View>
  );
}

const styles = StyleSheet.create({
  // Badge styles
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeCount: {
    fontWeight: "800",
    letterSpacing: -0.5,
    color: "#FFFFFF",
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginLeft: 1,
  },
  // Card styles
  card: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: Spacing.lg,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  fireWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTextContent: {
    flex: 1,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  cardStreakCount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  cardStreakUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  milestoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
  },
  bestStreakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: Spacing.md,
    backgroundColor: "#FFFFFF",
  },
  bestStreakText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
