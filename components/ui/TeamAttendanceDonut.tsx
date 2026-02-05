/**
 * TeamAttendanceDonut
 *
 * Premium dashboard card with:
 * - Orange border with organization name ribbon
 * - Donut chart for attendance
 * - Clean stats without icons
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle, G, Defs, LinearGradient, Stop } from "react-native-svg";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";

interface TeamAttendanceDonutProps {
  present: number;
  absent: number;
  onLeave?: number;
  onBreak?: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  showCard?: boolean;
  organizationName?: string;
  // Additional stats
  totalTeam?: number;
  pendingLeave?: number;
  pendingBreak?: number;
  pendingOvertime?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Fixed donut size for card view
const CARD_DONUT_SIZE = 80;
const CARD_STROKE_WIDTH = 10;

export default function TeamAttendanceDonut({
  present,
  absent,
  total,
  size = 120,
  strokeWidth = 16,
  showCard = true,
  organizationName,
  totalTeam = 0,
  pendingLeave = 0,
  pendingBreak = 0,
  pendingOvertime = 0,
}: TeamAttendanceDonutProps) {
  const presentAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const donutSize = showCard ? CARD_DONUT_SIZE : size;
  const donutStroke = showCard ? CARD_STROKE_WIDTH : strokeWidth;

  const radius = (donutSize - donutStroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const presentPercent = total > 0 ? (present / total) * 100 : 0;
  const absentPercent = total > 0 ? (absent / total) * 100 : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(presentAnim, {
        toValue: presentPercent,
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
  }, [presentPercent]);

  const presentOffset = presentAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const absentLength = (absentPercent / 100) * circumference;
  const presentLength = (presentPercent / 100) * circumference;
  const absentStart = presentLength;

  const getHealthStatus = () => {
    if (presentPercent >= 90) return { label: "Excellent", color: Colors.success };
    if (presentPercent >= 75) return { label: "Good", color: Colors.success };
    if (presentPercent >= 50) return { label: "Fair", color: Colors.warning };
    return { label: "Low", color: Colors.error };
  };

  const health = getHealthStatus();

  if (!showCard) {
    return (
      <View style={styles.standaloneContainer}>
        <Animated.View style={[styles.donutWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.svgContainer, { width: size, height: size }]}>
            <Svg width={size} height={size}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={(size - strokeWidth) / 2}
                stroke={Colors.gray100}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
            </Svg>
            <View style={styles.centerContent}>
              <Text style={[styles.centerValue, { color: health.color }]}>{present}/{total}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <AnimatedRN.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
      {/* Orange Top Ribbon */}
      <View style={styles.topRibbon}>
        <Text style={styles.ribbonText} numberOfLines={1}>
          {organizationName || "Team Attendance"}
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
                <LinearGradient id="presentGradientCard" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#34D399" />
                  <Stop offset="100%" stopColor="#10B981" />
                </LinearGradient>
              </Defs>
              <Circle
                cx={CARD_DONUT_SIZE / 2}
                cy={CARD_DONUT_SIZE / 2}
                r={radius}
                stroke={Colors.gray100}
                strokeWidth={CARD_STROKE_WIDTH}
                fill="transparent"
              />
              <G rotation="-90" origin={`${CARD_DONUT_SIZE / 2}, ${CARD_DONUT_SIZE / 2}`}>
                {present > 0 && (
                  <AnimatedCircle
                    cx={CARD_DONUT_SIZE / 2}
                    cy={CARD_DONUT_SIZE / 2}
                    r={radius}
                    stroke="url(#presentGradientCard)"
                    strokeWidth={CARD_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={presentOffset}
                    strokeLinecap="round"
                  />
                )}
                {absent > 0 && (
                  <Circle
                    cx={CARD_DONUT_SIZE / 2}
                    cy={CARD_DONUT_SIZE / 2}
                    r={radius}
                    stroke={Colors.error}
                    strokeWidth={CARD_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={`${absentLength} ${circumference - absentLength}`}
                    strokeDashoffset={-absentStart}
                    strokeLinecap="round"
                  />
                )}
              </G>
            </Svg>
            <View style={styles.centerContent}>
              <Text style={[styles.centerValueCard, { color: health.color }]}>{Math.round(presentPercent)}%</Text>
              <Text style={styles.centerLabelCard}>Efficiency</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats - Clean minimal layout */}
        <View style={styles.statsSection}>
          {/* Primary stats row */}
          <View style={styles.primaryStats}>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{totalTeam}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>{present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, { color: Colors.error }]}>{absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>

          {/* Secondary stats row */}
          <View style={styles.secondaryStats}>
            <View style={styles.secondaryStat}>
              <View style={[styles.statDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.secondaryLabel}>{pendingLeave} leave</Text>
            </View>
            <View style={styles.secondaryStat}>
              <View style={[styles.statDot, { backgroundColor: Colors.cyan }]} />
              <Text style={styles.secondaryLabel}>{pendingBreak} break</Text>
            </View>
            <View style={styles.secondaryStat}>
              <View style={[styles.statDot, { backgroundColor: Colors.purple }]} />
              <Text style={styles.secondaryLabel}>{pendingOvertime} overtime</Text>
            </View>
          </View>
        </View>
      </View>
    </AnimatedRN.View>
  );
}

const styles = StyleSheet.create({
  standaloneContainer: {
    alignItems: "center",
  },
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
  centerValue: {
    fontSize: 20,
    fontWeight: "700",
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

  // Primary stats (Total, Present, Absent)
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

  // Secondary stats (leave, break, overtime)
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
