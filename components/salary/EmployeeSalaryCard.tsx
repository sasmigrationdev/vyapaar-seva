/**
 * EmployeeSalaryCard
 *
 * Rich card displaying employee salary information with:
 * - Avatar with status dot (green=has earnings, gray=no activity)
 * - Employee name + designation/department
 * - Stats row: Base Salary | Earned | Hours
 * - Full-width progress bar (earned/base percentage)
 * - Activity status indicator
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export type EmployeeStatus = "active" | "inactive" | "no_setup";

interface EmployeeSalaryCardProps {
  id: string;
  name: string;
  avatarInitials: string;
  designation?: string;
  department?: string;
  baseSalary: number;
  earnedSalary: number;
  totalHours: number;
  status: EmployeeStatus;
  index: number;
  onPress?: () => void;
}

export default function EmployeeSalaryCard({
  id,
  name,
  avatarInitials,
  designation,
  department,
  baseSalary,
  earnedSalary,
  totalHours,
  status,
  index,
  onPress,
}: EmployeeSalaryCardProps) {
  const progressPercentage =
    baseSalary > 0 ? Math.min((earnedSalary / baseSalary) * 100, 100) : 0;

  const formatCurrency = (amount: number) => {
    return `₹${Math.floor(amount).toLocaleString("en-IN")}`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case "active":
        return {
          dotColor: Colors.success,
          badgeColor: Colors.success + "15",
          badgeTextColor: Colors.success,
          label: "Earned",
        };
      case "inactive":
        return {
          dotColor: Colors.gray400,
          badgeColor: Colors.gray100,
          badgeTextColor: Colors.textTertiary,
          label: "No Activity",
        };
      case "no_setup":
        return {
          dotColor: Colors.warning,
          badgeColor: Colors.warning + "15",
          badgeTextColor: Colors.warning,
          label: "No Salary Setup",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Animated.View entering={FadeInDown.delay(50 + index * 30).springify()}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarInitials}</Text>
            </View>
            <View
              style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]}
            />
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {(designation || department) && (
              <Text style={styles.role} numberOfLines={1}>
                {[designation, department].filter(Boolean).join(" • ")}
              </Text>
            )}
          </View>

          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.badgeColor }]}
          >
            <Text
              style={[styles.statusBadgeText, { color: statusConfig.badgeTextColor }]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="cash"
              size={14}
              color={Colors.textTertiary}
            />
            <Text style={styles.statLabel}>Base</Text>
            <Text style={styles.statValue}>{formatCurrency(baseSalary)}</Text>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="currency-inr"
              size={14}
              color={Colors.success}
            />
            <Text style={styles.statLabel}>Earned</Text>
            <Text style={[styles.statValue, styles.statValueEarned]}>
              {formatCurrency(earnedSalary)}
            </Text>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={Colors.info}
            />
            <Text style={styles.statLabel}>Hours</Text>
            <Text style={[styles.statValue, styles.statValueHours]}>
              {totalHours.toFixed(1)}h
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor:
                    status === "active" ? Colors.success : Colors.gray300,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progressPercentage.toFixed(0)}% of base
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  nameSection: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  role: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: "auto",
  },
  statValueEarned: {
    color: Colors.success,
  },
  statValueHours: {
    color: Colors.info,
  },
  statsDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.sm,
  },
  progressContainer: {
    gap: 6,
  },
  progressBackground: {
    height: 6,
    backgroundColor: Colors.gray100,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: "right",
  },
});
