import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

interface TeamHealthScoreProps {
  presentCount: number;
  totalCount: number;
  onPress?: () => void;
  size?: "small" | "medium" | "large";
}

export default function TeamHealthScore({
  presentCount,
  totalCount,
  onPress,
  size = "medium",
}: TeamHealthScoreProps) {
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const sizes = {
    small: { container: 80, strokeWidth: 6, fontSize: 18, labelSize: 9 },
    medium: { container: 100, strokeWidth: 8, fontSize: 24, labelSize: 10 },
    large: { container: 120, strokeWidth: 10, fontSize: 32, labelSize: 12 },
  };

  const config = sizes[size];
  const radius = (config.container - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 80) return Colors.success;
    if (percentage >= 60) return Colors.warning;
    return Colors.error;
  };

  const progressColor = getColor();

  const content = (
    <View style={[styles.container, { width: config.container, height: config.container }]}>
      <Svg width={config.container} height={config.container} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={config.container / 2}
          cy={config.container / 2}
          r={radius}
          stroke={Colors.gray200}
          strokeWidth={config.strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={config.container / 2}
          cy={config.container / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={config.strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${config.container / 2} ${config.container / 2})`}
        />
      </Svg>
      <View style={styles.centerContent}>
        <Text style={[styles.percentage, { fontSize: config.fontSize, color: progressColor }]}>
          {percentage}%
        </Text>
        <Text style={[styles.label, { fontSize: config.labelSize }]}>Present</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// Extended version with stats below
export function TeamHealthScoreCard({
  presentCount,
  totalCount,
  pendingCount,
  onBreakCount,
  onPress,
}: TeamHealthScoreProps & {
  pendingCount?: number;
  onBreakCount?: number;
}) {
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const getHealthLabel = () => {
    if (percentage >= 90) return { text: "Excellent", color: Colors.success };
    if (percentage >= 75) return { text: "Good", color: Colors.success };
    if (percentage >= 50) return { text: "Needs Attention", color: Colors.warning };
    return { text: "Critical", color: Colors.error };
  };

  const health = getHealthLabel();

  return (
    <View style={styles.card}>
      {/* Health Badge */}
      <View style={[styles.healthBadge, { backgroundColor: health.color }]}>
        <Text style={styles.healthBadgeText}>{health.text}</Text>
      </View>

      <View style={styles.cardContent}>
        <TeamHealthScore
          presentCount={presentCount}
          totalCount={totalCount}
          onPress={onPress}
          size="large"
        />

        <View style={styles.statsColumn}>
          <View style={styles.statRow}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primary + "20" }]}>
              <MaterialCommunityIcons name="account-group" size={16} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statIcon, { backgroundColor: Colors.success + "20" }]}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
          </View>

          {pendingCount !== undefined && (
            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: Colors.warning + "20" }]}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.warning} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          )}

          {onBreakCount !== undefined && onBreakCount > 0 && (
            <View style={styles.statRow}>
              <View style={[styles.statIcon, { backgroundColor: Colors.info + "20" }]}>
                <MaterialCommunityIcons name="coffee" size={16} color={Colors.info} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{onBreakCount}</Text>
                <Text style={styles.statLabel}>On Break</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  centerContent: {
    alignItems: "center",
  },
  percentage: {
    fontWeight: "800",
    letterSpacing: -1,
  },
  label: {
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    ...Shadows.md,
  },
  healthBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  healthBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  statsColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  statContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
});
