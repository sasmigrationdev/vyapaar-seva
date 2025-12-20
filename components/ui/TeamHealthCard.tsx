import { Text } from "@/components/ui/Text";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface TeamHealthCardProps {
  // Attendance data
  totalStaff: number;
  presentToday: number;
  pendingCheckIn: number;

  // Approval data
  pendingLeaves: number;
  pendingBreaks: number;
  pendingJoins: number;

  // State
  isLoading?: boolean;

  // Actions
  onAttendancePress?: () => void;
  onApprovalsPress?: () => void;
}

export default function TeamHealthCard({
  totalStaff,
  presentToday,
  pendingCheckIn,
  pendingLeaves,
  pendingBreaks,
  pendingJoins,
  isLoading = false,
  onAttendancePress,
  onApprovalsPress,
}: TeamHealthCardProps) {
  const attendanceRate =
    totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0;
  const totalPending = pendingLeaves + pendingBreaks + pendingJoins;

  // Compute health status based on attendance rate
  const healthStatus = (() => {
    if (attendanceRate >= 90) return { label: "Excellent", color: "#10B981" };
    if (attendanceRate >= 70) return { label: "Good", color: "#3B82F6" };
    if (attendanceRate >= 50) return { label: "Fair", color: "#F59E0B" };
    return { label: "Needs Attention", color: "#EF4444" };
  })();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingPlaceholder}>
          <Text style={styles.loadingText}>Loading team health...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Health Display */}
      <View style={styles.healthRow}>
        {/* Attendance Rate Display */}
        <TouchableOpacity
          style={styles.progressContainer}
          onPress={onAttendancePress}
          activeOpacity={0.8}
        >
          <View style={styles.rateCircle}>
            <Text style={styles.progressValue}>{attendanceRate}%</Text>
            <Text style={styles.progressLabel}>Present</Text>
          </View>
        </TouchableOpacity>

        {/* Stats Column */}
        <View style={styles.statsColumn}>
          <View style={styles.statRow}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={16} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{totalStaff}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Total Staff
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(16, 185, 129, 0.4)" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{presentToday}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Checked In
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(251, 191, 36, 0.45)" },
              ]}
            >
              <Ionicons name="time" size={16} color="#FBBF24" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{pendingCheckIn}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Pending
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Pending Approvals Row */}
      <TouchableOpacity
        style={styles.approvalsRow}
        onPress={onApprovalsPress}
        activeOpacity={0.7}
      >
        <View style={styles.approvalsLeft}>
          <View style={styles.approvalsBadge}>
            <MaterialCommunityIcons
              name="clipboard-clock-outline"
              size={18}
              color={totalPending > 0 ? Colors.warning : Colors.success}
            />
          </View>
          <View>
            <Text style={styles.approvalsTitle}>Pending Approvals</Text>
            <Text style={styles.approvalsSubtitle}>
              {totalPending === 0
                ? "All caught up!"
                : `${pendingLeaves}L  ${pendingBreaks}B  ${pendingJoins}J`}
            </Text>
          </View>
        </View>

        {totalPending > 0 && (
          <View style={styles.approvalsBadgeCount}>
            <Text style={styles.approvalsBadgeText}>{totalPending}</Text>
          </View>
        )}

        <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
      </TouchableOpacity>

      {/* Health Status Badge */}
      <View
        style={[styles.healthBadge, { backgroundColor: healthStatus.color }]}
      >
        <Text style={styles.healthLabel} numberOfLines={1}>
          {healthStatus.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: Spacing.md,
    ...Shadows.md,
  },
  loadingPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingTop: Spacing.xl,
  },
  progressContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  rateCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  progressValue: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statsColumn: {
    flex: 1,
    gap: Spacing.sm,
    minWidth: 0,
    overflow: "hidden",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minWidth: 0,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  statContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
    minWidth: 0,
    overflow: "hidden",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    flexShrink: 0,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    flexShrink: 1,
    minWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: Spacing.xs,
  },
  approvalsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  approvalsLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  approvalsBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  approvalsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  approvalsSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  approvalsBadgeCount: {
    backgroundColor: Colors.warning,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  approvalsBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  healthBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  healthLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
});
