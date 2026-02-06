/**
 * EmployeeProgressCard
 *
 * Premium dashboard card for employee stats with:
 * - Orange border with employer name ribbon
 * - Animated donut chart for attendance percentage
 * - Clean stats layout (days, hours, streak)
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle, G, Defs, LinearGradient, Stop } from "react-native-svg";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";

interface EmployeeProgressCardProps {
  attendancePercentage: number;
  daysAttended: number;
  totalWorkingDays: number;
  hoursWorked: number;
  expectedHours: number;
  employerName?: string;
  employmentDuration?: string;
  currentStreak?: number;
  overtimeHours?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Fixed donut size for card view
const CARD_DONUT_SIZE = 80;
const CARD_STROKE_WIDTH = 10;

export default function EmployeeProgressCard({
  attendancePercentage,
  daysAttended,
  totalWorkingDays,
  hoursWorked,
  expectedHours,
  employerName,
  employmentDuration,
  currentStreak = 0,
  overtimeHours = 0,
}: EmployeeProgressCardProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const radius = (CARD_DONUT_SIZE - CARD_STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  const progressPercent = Math.min(Math.max(attendancePercentage, 0), 100);
  const remainingPercent = 100 - progressPercent;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: progressPercent,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progressPercent, progressAnim, scaleAnim]);

  const progressOffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const remainingLength = (remainingPercent / 100) * circumference;

  const getHealthStatus = () => {
    if (progressPercent >= 90) return { label: "Excellent", color: Colors.success };
    if (progressPercent >= 75) return { label: "Good", color: Colors.success };
    if (progressPercent >= 50) return { label: "Fair", color: Colors.warning };
    return { label: "Low", color: Colors.error };
  };

  const health = getHealthStatus();

  // Format hours worked
  const formatHoursDisplay = (hours: number) => {
    if (hours >= 100) return `${Math.round(hours)}h`;
    return `${hours.toFixed(1)}h`;
  };

  return (
    <AnimatedRN.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
      {/* Orange Top Ribbon */}
      <View style={styles.topRibbon}>
        <Text style={styles.ribbonText} numberOfLines={1}>
          {employerName || "Your Progress"}
        </Text>
        <View style={styles.ribbonBadge}>
          <View style={[styles.ribbonBadgeDot, { backgroundColor: health.color }]} />
          <Text style={styles.ribbonBadgeText}>{health.label}</Text>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.cardContent}>
        {/* Donut Chart */}
        <Animated.View style={[styles.donutWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.svgContainer, { width: CARD_DONUT_SIZE, height: CARD_DONUT_SIZE }]}>
            <Svg width={CARD_DONUT_SIZE} height={CARD_DONUT_SIZE}>
              <Defs>
                <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#34D399" />
                  <Stop offset="100%" stopColor="#10B981" />
                </LinearGradient>
              </Defs>
              {/* Background circle */}
              <Circle
                cx={CARD_DONUT_SIZE / 2}
                cy={CARD_DONUT_SIZE / 2}
                r={radius}
                stroke={Colors.gray100}
                strokeWidth={CARD_STROKE_WIDTH}
                fill="transparent"
              />
              <G rotation="-90" origin={`${CARD_DONUT_SIZE / 2}, ${CARD_DONUT_SIZE / 2}`}>
                {/* Progress arc */}
                {progressPercent > 0 && (
                  <AnimatedCircle
                    cx={CARD_DONUT_SIZE / 2}
                    cy={CARD_DONUT_SIZE / 2}
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth={CARD_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    strokeLinecap="round"
                  />
                )}
                {/* Remaining arc (gray) */}
                {remainingPercent > 0 && progressPercent < 100 && (
                  <Circle
                    cx={CARD_DONUT_SIZE / 2}
                    cy={CARD_DONUT_SIZE / 2}
                    r={radius}
                    stroke={Colors.gray200}
                    strokeWidth={CARD_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={`${remainingLength} ${circumference - remainingLength}`}
                    strokeDashoffset={-(progressPercent / 100) * circumference}
                    strokeLinecap="round"
                  />
                )}
              </G>
            </Svg>
            <View style={styles.centerContent}>
              <Text style={[styles.centerValueCard, { color: health.color }]}>
                {Math.round(progressPercent)}%
              </Text>
              <Text style={styles.centerLabelCard}>Attendance</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats - Clean minimal layout */}
        <View style={styles.statsSection}>
          {/* Primary stats row */}
          <View style={styles.primaryStats}>
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>{daysAttended}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, { color: Colors.primary }]}>
                {formatHoursDisplay(hoursWorked)}
              </Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, { color: Colors.warning }]}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>

          {/* Secondary stats row */}
          <View style={styles.secondaryStats}>
            {employmentDuration && (
              <View style={styles.secondaryStat}>
                <View style={[styles.statDot, { backgroundColor: Colors.info }]} />
                <Text style={styles.secondaryLabel}>{employmentDuration}</Text>
              </View>
            )}
            {overtimeHours > 0 && (
              <View style={styles.secondaryStat}>
                <View style={[styles.statDot, { backgroundColor: Colors.purple }]} />
                <Text style={styles.secondaryLabel}>+{overtimeHours.toFixed(1)}h OT</Text>
              </View>
            )}
            {expectedHours > 0 && (
              <View style={styles.secondaryStat}>
                <View style={[styles.statDot, { backgroundColor: Colors.cyan }]} />
                <Text style={styles.secondaryLabel}>{Math.round(expectedHours)}h expected</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </AnimatedRN.View>
  );
}

const styles = StyleSheet.create({
  donutWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerValueCard: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  centerLabelCard: {
    fontSize: 9,
    fontWeight: "500",
    color: "#8C8C8C",
    marginTop: -1,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1.5,
    borderColor: Colors.primary,
    overflow: "hidden",
  },

  // Ribbon
  topRibbon: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ribbonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  ribbonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  ribbonBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ribbonBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },

  // Content
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 14,
  },

  // Stats Section
  statsSection: {
    flex: 1,
    gap: 10,
  },

  // Primary stats (Days, Hours, Streak)
  primaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E5E7EB",
  },

  // Secondary stats (duration, overtime, expected)
  secondaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  secondaryStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
});
