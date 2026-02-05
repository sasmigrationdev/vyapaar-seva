/**
 * SalaryTab
 *
 * Salary configuration display with:
 * - Wallet-style salary card with gradient
 * - Quick math calculations
 * - Visual appeal like payment apps
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { User } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/salary.utils";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import AnimatedRN, { FadeIn } from "react-native-reanimated";

interface SalaryTabProps {
  employee: User;
  onEditPress: () => void;
}

export default function SalaryTab({ employee, onEditPress }: SalaryTabProps) {
  const baseSalary = Number(employee.base_salary || 0);
  const hourlyRate = Number(employee.hourly_rate || 0);
  const dailyHours = Number(employee.daily_working_hours || 8);
  const workingDaysPerWeek = (employee.working_days as string[])?.length || 5;

  // Calculate derived values (assuming ~4.33 weeks per month for accuracy)
  const workingDaysPerMonth = Math.round(workingDaysPerWeek * 4.33);
  const monthlyHours = workingDaysPerMonth * dailyHours;

  // Per day: if base salary exists, divide by working days per month; else use hourly * daily hours
  const perDay = baseSalary > 0
    ? baseSalary / workingDaysPerMonth
    : hourlyRate * dailyHours;

  // Per week: per day * working days per week
  const perWeek = perDay * workingDaysPerWeek;

  // Overtime rate: 1.5x hourly (or derived hourly from base)
  const effectiveHourlyRate = hourlyRate > 0 ? hourlyRate : (baseSalary / monthlyHours);
  const overtimeRate = effectiveHourlyRate * 1.5;

  const hasSalaryConfig = baseSalary > 0 || hourlyRate > 0;

  if (!hasSalaryConfig) {
    return (
      <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <MaterialCommunityIcons name="cash-off" size={40} color={Colors.gray400} />
          </View>
          <Text style={styles.emptyTitle}>No Salary Configured</Text>
          <Text style={styles.emptySubtitle}>
            Set up salary details to track earnings and generate payslips
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={onEditPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Configure Salary</Text>
          </TouchableOpacity>
        </View>
      </AnimatedRN.View>
    );
  }

  return (
    <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Salary Card - Wallet Style */}
      <View style={styles.salaryCardWrapper}>
        <LinearGradient
          colors={["#1E3A5F", "#2D5A8E", "#3D7ABF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.salaryCard}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardBadge}>
              <MaterialCommunityIcons name="wallet" size={14} color="#FFFFFF" />
              <Text style={styles.cardBadgeText}>SALARY CONFIG</Text>
            </View>
            <TouchableOpacity onPress={onEditPress} activeOpacity={0.7}>
              <Feather name="edit-2" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          {/* Main Amount */}
          <View style={styles.mainAmount}>
            {baseSalary > 0 ? (
              <>
                <Text style={styles.amountLabel}>Base Salary</Text>
                <Text style={styles.amountValue}>{formatCurrency(baseSalary)}</Text>
                <Text style={styles.amountPeriod}>per month</Text>
              </>
            ) : (
              <>
                <Text style={styles.amountLabel}>Hourly Rate</Text>
                <Text style={styles.amountValue}>{formatCurrency(hourlyRate)}</Text>
                <Text style={styles.amountPeriod}>per hour</Text>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Secondary Info */}
          <View style={styles.secondaryRow}>
            {baseSalary > 0 && hourlyRate > 0 && (
              <View style={styles.secondaryItem}>
                <Text style={styles.secondaryLabel}>Hourly Rate</Text>
                <Text style={styles.secondaryValue}>{formatCurrency(hourlyRate)}/hr</Text>
              </View>
            )}
            <View style={styles.secondaryItem}>
              <Text style={styles.secondaryLabel}>Expected Hours</Text>
              <Text style={styles.secondaryValue}>{monthlyHours}h/month</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Math Section */}
      <View style={styles.quickMathSection}>
        <Text style={styles.sectionTitle}>Quick Math</Text>

        <View style={styles.mathGrid}>
          <View style={styles.mathCard}>
            <View style={[styles.mathIcon, { backgroundColor: Colors.primary + "15" }]}>
              <MaterialCommunityIcons name="calendar-today" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.mathValue}>{formatCurrency(perDay)}</Text>
            <Text style={styles.mathLabel}>Per Day</Text>
          </View>

          <View style={styles.mathCard}>
            <View style={[styles.mathIcon, { backgroundColor: Colors.info + "15" }]}>
              <MaterialCommunityIcons name="calendar-week" size={18} color={Colors.info} />
            </View>
            <Text style={styles.mathValue}>{formatCurrency(perWeek)}</Text>
            <Text style={styles.mathLabel}>Per Week</Text>
          </View>

          <View style={styles.mathCard}>
            <View style={[styles.mathIcon, { backgroundColor: Colors.purple + "15" }]}>
              <MaterialCommunityIcons name="clock-plus-outline" size={18} color={Colors.purple} />
            </View>
            <Text style={styles.mathValue}>{formatCurrency(overtimeRate)}</Text>
            <Text style={styles.mathLabel}>OT Rate/hr</Text>
          </View>
        </View>
      </View>

      {/* Working Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Working Details</Text>

        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <MaterialCommunityIcons name="calendar-week" size={18} color={Colors.gray500} />
              <Text style={styles.detailLabel}>Working Days</Text>
            </View>
            <Text style={styles.detailValue}>{workingDaysPerWeek} days/week</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="time-outline" size={18} color={Colors.gray500} />
              <Text style={styles.detailLabel}>Daily Hours</Text>
            </View>
            <Text style={styles.detailValue}>{dailyHours} hours</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.gray500} />
              <Text style={styles.detailLabel}>Monthly Target</Text>
            </View>
            <Text style={styles.detailValue}>{monthlyHours} hours</Text>
          </View>
        </View>
      </View>
    </AnimatedRN.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },

  // Salary Card
  salaryCardWrapper: {
    ...Shadows.lg,
    borderRadius: BorderRadius["2xl"],
  },
  salaryCard: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  cardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  mainAmount: {
    marginBottom: Spacing.lg,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  amountPeriod: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: Spacing.md,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  secondaryItem: {},
  secondaryLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  secondaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 2,
  },

  // Quick Math
  quickMathSection: {},
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  mathGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  mathCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  mathIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  mathValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  mathLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Details Card
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  detailsList: {
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
