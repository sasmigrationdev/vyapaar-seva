/**
 * PayrollPeriodCard
 *
 * Rich card for displaying a payroll period with:
 * - Month/year title with status badge
 * - Stats row (employees, gross, net)
 * - Progress bar for payment status
 * - Created date footer
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface PayrollPeriodCardProps {
  id: string;
  month: number;
  year: number;
  status: string;
  totalEmployees: number;
  employeesPaid: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  createdAt: string;
  index: number;
  onPress: () => void;
}

const getMonthName = (month: number) => {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return monthNames[month - 1] || "";
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "draft":
      return { color: Colors.gray500, label: "Draft", bgColor: Colors.gray100, icon: "pencil-outline" };
    case "in_review":
      return { color: Colors.warning, label: "In Review", bgColor: Colors.warning + "15", icon: "eye-outline" };
    case "approved":
      return { color: Colors.info, label: "Approved", bgColor: Colors.info + "15", icon: "checkmark-circle-outline" };
    case "processing":
      return { color: "#6366f1", label: "Processing", bgColor: "#6366f115", icon: "sync-outline" };
    case "completed":
      return { color: Colors.success, label: "Completed", bgColor: Colors.success + "15", icon: "checkmark-done-outline" };
    case "cancelled":
      return { color: Colors.error, label: "Cancelled", bgColor: Colors.error + "15", icon: "close-circle-outline" };
    default:
      return { color: Colors.gray500, label: status, bgColor: Colors.gray100, icon: "help-circle-outline" };
  }
};

const formatAmount = (amount: number) => {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${Math.floor(amount / 1000)}K`;
  }
  return `₹${amount}`;
};

export default function PayrollPeriodCard({
  id,
  month,
  year,
  status,
  totalEmployees,
  employeesPaid,
  totalGrossSalary,
  totalNetSalary,
  createdAt,
  index,
  onPress,
}: PayrollPeriodCardProps) {
  const statusConfig = getStatusConfig(status);
  const progressPercentage = totalEmployees > 0
    ? Math.round((employeesPaid / totalEmployees) * 100)
    : 0;

  return (
    <Animated.View entering={FadeInDown.delay(50 + index * 30).springify()}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.monthIcon}>
              <MaterialCommunityIcons
                name="calendar-month"
                size={18}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.title}>
              {getMonthName(month)} {year}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group" size={14} color={Colors.textTertiary} />
            <Text style={styles.statValue}>{totalEmployees}</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash" size={14} color={Colors.textTertiary} />
            <Text style={styles.statValue}>{formatAmount(totalGrossSalary)}</Text>
            <Text style={styles.statLabel}>Gross</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash-check" size={14} color={Colors.success} />
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {formatAmount(totalNetSalary)}
            </Text>
            <Text style={styles.statLabel}>Net</Text>
          </View>
        </View>

        {/* Progress Section */}
        {status !== "draft" && totalEmployees > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Payment Progress</Text>
              <Text style={[styles.progressPercentage, { color: statusConfig.color }]}>
                {progressPercentage}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%`, backgroundColor: statusConfig.color }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {employeesPaid} of {totalEmployees} employees paid
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.dateInfo}>
            <Feather name="clock" size={12} color={Colors.textTertiary} />
            <Text style={styles.dateText}>
              Created {new Date(createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    overflow: "hidden",
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  monthIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.gray100,
  },
  progressSection: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray50,
    backgroundColor: Colors.gray50,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textTertiary,
  },
});
