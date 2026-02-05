/**
 * EmployeeBentoStats
 *
 * Clean stats display with:
 * - Unified stats card with 3 key metrics
 * - Action cards for quick navigation
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { formatCurrency } from "@/lib/utils/salary.utils";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";

interface EmployeeBentoStatsProps {
  earnedSalary: number;
  baseSalary: number;
  hoursWorked: number;
  expectedHours: number;
  daysWorkedThisWeek: number;
  pendingPayments: number;
  paidPayments: number;
  onViewSalarySlips?: () => void;
  onViewAttendance?: () => void;
}

export default function EmployeeBentoStats({
  earnedSalary,
  baseSalary,
  hoursWorked,
  expectedHours,
  daysWorkedThisWeek,
  pendingPayments,
  paidPayments,
  onViewSalarySlips,
  onViewAttendance,
}: EmployeeBentoStatsProps) {
  const hoursProgress = expectedHours > 0
    ? Math.min((hoursWorked / expectedHours) * 100, 100)
    : 0;

  const salaryProgress = baseSalary > 0
    ? Math.min((earnedSalary / baseSalary) * 100, 100)
    : 0;

  return (
    <AnimatedRN.View
      entering={FadeInDown.delay(150).springify()}
      style={styles.container}
    >
      {/* Unified Stats Card */}
      <View style={styles.statsCard}>
        {/* Earned */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.success + "15" }]}>
            <MaterialCommunityIcons name="cash" size={16} color={Colors.success} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(earnedSalary)}</Text>
          <Text style={styles.statLabel}>Earned</Text>
          {baseSalary > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${salaryProgress}%`, backgroundColor: Colors.success }]} />
            </View>
          )}
        </View>

        <View style={styles.statDivider} />

        {/* Hours */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.info + "15" }]}>
            <Ionicons name="time-outline" size={16} color={Colors.info} />
          </View>
          <Text style={styles.statValue}>
            {hoursWorked > 0 ? hoursWorked.toFixed(1) : "0"}
            <Text style={styles.statUnit}>h</Text>
          </Text>
          <Text style={styles.statLabel}>This Month</Text>
          {expectedHours > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${hoursProgress}%`, backgroundColor: Colors.info }]} />
            </View>
          )}
        </View>

        <View style={styles.statDivider} />

        {/* Days */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.primary + "15" }]}>
            <MaterialCommunityIcons name="calendar-check" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{daysWorkedThisWeek}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={onViewSalarySlips}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.purple + "15" }]}>
            <MaterialCommunityIcons name="receipt" size={14} color={Colors.purple} />
          </View>
          <Text style={styles.actionText}>
            {pendingPayments > 0 ? `${pendingPayments} Pending` : `${paidPayments} Paid`}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={onViewAttendance}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.success + "15" }]}>
            <MaterialCommunityIcons name="chart-line" size={14} color={Colors.success} />
          </View>
          <Text style={styles.actionText}>Reports</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.gray400} />
        </TouchableOpacity>
      </View>
    </AnimatedRN.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing["2xl"],
  },

  // Unified Stats Card
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray100,
    marginVertical: 4,
  },
  progressBar: {
    width: "80%",
    height: 3,
    backgroundColor: Colors.gray100,
    borderRadius: 2,
    marginTop: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Action Cards
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
});
