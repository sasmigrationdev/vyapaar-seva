/**
 * CircularHoursProgress
 *
 * Apple-inspired circular progress with:
 * - Gradient stroke effect
 * - Large hero typography (Paytm-style)
 * - Motivational messaging (Airbnb warmth)
 * - Clean stats layout
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import AnimatedRN, { FadeInUp } from "react-native-reanimated";

interface CircularHoursProgressProps {
  hoursWorked: number;
  expectedHours: number;
  size?: number;
  strokeWidth?: number;
  showCard?: boolean;
  compact?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CircularHoursProgress({
  hoursWorked,
  expectedHours,
  size = 140,
  strokeWidth = 12,
  showCard = true,
  compact = false,
}: CircularHoursProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const percentage = expectedHours > 0 ? Math.min((hoursWorked / expectedHours) * 100, 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const remainingHours = Math.max(0, expectedHours - hoursWorked);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: percentage,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Apple-style gradient colors based on progress
  const getGradientColors = () => {
    if (percentage >= 90) return { start: "#34D399", end: "#10B981" }; // Emerald
    if (percentage >= 70) return { start: "#FBBF24", end: "#F59E0B" }; // Amber
    if (percentage >= 50) return { start: "#FB923C", end: "#F97316" }; // Orange
    return { start: "#F87171", end: "#EF4444" }; // Red
  };

  // Motivational message (Airbnb-style warmth)
  const getMessage = () => {
    if (percentage >= 100) return "Target achieved!";
    if (percentage >= 90) return "Almost there!";
    if (percentage >= 70) return "Great progress";
    if (percentage >= 50) return "Halfway done";
    return "Keep going";
  };

  const gradientColors = getGradientColors();

  const circleContent = (
    <Animated.View style={[styles.ringContainer, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.svgWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors.start} />
              <Stop offset="100%" stopColor={gradientColors.end} />
            </LinearGradient>
          </Defs>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.gray100}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Center content - Paytm-style hero numbers */}
        <View style={styles.centerContent}>
          <Text style={styles.hoursValue}>{Math.round(hoursWorked)}</Text>
          <Text style={styles.hoursUnit}>hours</Text>
        </View>
      </View>
    </Animated.View>
  );

  if (!showCard) return circleContent;

  if (compact) {
    return (
      <AnimatedRN.View entering={FadeInUp.delay(100).springify()} style={styles.compactCard}>
        <View style={styles.compactContent}>
          {circleContent}
          <View style={styles.compactStats}>
            <Text style={styles.compactMessage}>{getMessage()}</Text>
            <Text style={styles.compactTarget}>
              {Math.round(remainingHours)}h remaining of {Math.round(expectedHours)}h
            </Text>
          </View>
        </View>
      </AnimatedRN.View>
    );
  }

  return (
    <AnimatedRN.View entering={FadeInUp.delay(100).springify()} style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>Hours Progress</Text>
          <View style={styles.messageBadge}>
            <MaterialCommunityIcons
              name={percentage >= 90 ? "trophy" : "clock-outline"}
              size={12}
              color={gradientColors.end}
            />
            <Text style={[styles.messageText, { color: gradientColors.end }]}>
              {getMessage()}
            </Text>
          </View>
        </View>
        <View style={[styles.percentagePill, { backgroundColor: gradientColors.end + "15" }]}>
          <Text style={[styles.percentageText, { color: gradientColors.end }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.cardContent}>
        {circleContent}

        <View style={styles.statsColumn}>
          {/* Worked stat */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: gradientColors.end + "15" }]}>
              <MaterialCommunityIcons name="check-circle" size={18} color={gradientColors.end} />
            </View>
            <View style={styles.statText}>
              <Text style={styles.statValue}>{hoursWorked.toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Worked</Text>
            </View>
          </View>

          {/* Target stat */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: Colors.gray100 }]}>
              <MaterialCommunityIcons name="flag-checkered" size={18} color={Colors.gray500} />
            </View>
            <View style={styles.statText}>
              <Text style={styles.statValue}>{expectedHours.toFixed(0)}h</Text>
              <Text style={styles.statLabel}>Target</Text>
            </View>
          </View>

          {/* Remaining stat */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: Colors.info + "15" }]}>
              <MaterialCommunityIcons name="timer-sand" size={18} color={Colors.info} />
            </View>
            <View style={styles.statText}>
              <Text style={[styles.statValue, { color: Colors.info }]}>
                {remainingHours.toFixed(1)}h
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>
        </View>
      </View>
    </AnimatedRN.View>
  );
}

const styles = StyleSheet.create({
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  svgWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  hoursValue: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -2,
    lineHeight: 40,
  },
  hoursUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: -2,
  },
  // Card styles
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["3xl"],
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  messageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  messageText: {
    fontSize: 12,
    fontWeight: "600",
  },
  percentagePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  statsColumn: {
    flex: 1,
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  // Compact styles
  compactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Shadows.sm,
  },
  compactContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  compactStats: {
    flex: 1,
    gap: Spacing.xs,
  },
  compactMessage: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  compactTarget: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
});
