import { Colors, Shadows, Spacing, BorderRadius } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface WeeklyAttendanceChartProps {
  data: { date: string; dayLabel: string; count: number }[];
  isLoading?: boolean;
  totalEmployees?: number;
}

const CHART_WIDTH = Dimensions.get("window").width - Spacing.xl * 2 - Spacing.lg * 2;
const CHART_HEIGHT = 120;
const CHART_PADDING = { top: 20, right: 10, bottom: 30, left: 10 };

export default function WeeklyAttendanceChart({
  data,
  isLoading = false,
  totalEmployees = 0,
}: WeeklyAttendanceChartProps) {
  const animationProgress = useSharedValue(0);

  // Hooks must be called before any early returns (Rules of Hooks)
  const animatedLineProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: (1 - animationProgress.value) * 1000,
    };
  });

  useEffect(() => {
    animationProgress.value = 0;
    animationProgress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="chart-line"
              size={18}
              color={Colors.primary}
            />
          </View>
          <View>
            <Text style={styles.title}>Weekly Trend</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </View>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.loadingText}>Loading chart data...</Text>
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="chart-line"
              size={18}
              color={Colors.primary}
            />
          </View>
          <View>
            <Text style={styles.title}>Weekly Trend</Text>
            <Text style={styles.subtitle}>No data available</Text>
          </View>
        </View>
      </View>
    );
  }

  // Calculate chart dimensions
  const graphWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const graphHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Find max value for scaling (at least 1 to avoid division by zero)
  const maxValue = Math.max(...data.map(d => d.count), 1);
  const yScale = graphHeight / maxValue;
  const xStep = graphWidth / (data.length - 1 || 1);

  // Generate points
  const points = data.map((d, i) => ({
    x: CHART_PADDING.left + i * xStep,
    y: CHART_PADDING.top + graphHeight - d.count * yScale,
    ...d,
  }));

  // Create SVG path for the line
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;

    // Use quadratic curve for smooth line
    const prevPoint = points[i - 1];
    const cpX = (prevPoint.x + point.x) / 2;
    return `${path} Q ${cpX} ${prevPoint.y} ${cpX} ${(prevPoint.y + point.y) / 2} T ${point.x} ${point.y}`;
  }, "");

  // Create area path (for gradient fill)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${CHART_PADDING.top + graphHeight} L ${points[0].x} ${CHART_PADDING.top + graphHeight} Z`;

  // Calculate average
  const avgAttendance = data.reduce((sum, d) => sum + d.count, 0) / data.length;
  const avgPercentage = totalEmployees > 0 ? Math.round((avgAttendance / totalEmployees) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="chart-line"
            size={18}
            color={Colors.primary}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Weekly Attendance</Text>
          <Text style={styles.subtitle}>
            Last 7 days {totalEmployees > 0 ? `• Avg ${avgPercentage}%` : ""}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statValue}>{Math.round(avgAttendance)}</Text>
          <Text style={styles.statLabel}>avg/day</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Area fill */}
          <Path d={areaPath} fill="url(#areaGradient)" />

          {/* Animated line */}
          <AnimatedPath
            d={linePath}
            stroke={Colors.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1000"
            animatedProps={animatedLineProps}
          />

          {/* Data points */}
          {points.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#FFFFFF"
              stroke={Colors.primary}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {/* Day labels */}
        <View style={styles.labelsContainer}>
          {points.map((point, i) => (
            <View
              key={i}
              style={[
                styles.labelWrapper,
                { left: point.x - 15 },
              ]}
            >
              <Text style={[
                styles.dayLabel,
                i === points.length - 1 && styles.todayLabel,
              ]}>
                {i === points.length - 1 ? "Today" : point.dayLabel}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    alignItems: "flex-end",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  chartContainer: {
    position: "relative",
  },
  chartPlaceholder: {
    height: CHART_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  labelsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  labelWrapper: {
    position: "absolute",
    width: 30,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textTertiary,
  },
  todayLabel: {
    color: Colors.primary,
    fontWeight: "600",
  },
});
