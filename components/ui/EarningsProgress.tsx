import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface EarningsProgressProps {
  currentEarnings: number;
  totalSalary: number;
  daysWorked: number;
  totalDays: number;
  currency?: string;
  onPress?: () => void;
}

export default function EarningsProgress({
  currentEarnings,
  totalSalary,
  daysWorked,
  totalDays,
  currency = "₹",
  onPress,
}: EarningsProgressProps) {
  const percentage = totalSalary > 0 ? Math.round((currentEarnings / totalSalary) * 100) : 0;
  const progressWidth = `${Math.min(percentage, 100)}%`;

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `${currency}${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${currency}${(amount / 1000).toFixed(1)}K`;
    }
    return `${currency}${amount.toLocaleString("en-IN")}`;
  };

  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="wallet" size={20} color={Colors.success} />
          </View>
          <Text style={styles.title}>This Month's Earnings</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.gray400} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.currentAmount}>{formatCurrency(currentEarnings)}</Text>
        <Text style={styles.separator}>/</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalSalary)}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: progressWidth as any }]} />
        </View>
        <Text style={styles.percentageText}>{percentage}% earned</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="calendar-check" size={16} color={Colors.primary} />
          <Text style={styles.statText}>
            <Text style={styles.statValue}>{daysWorked}</Text>
            <Text style={styles.statLabel}> / {totalDays} days worked</Text>
          </Text>
        </View>
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

// Compact version for dashboard
export function EarningsProgressCompact({
  currentEarnings,
  totalSalary,
  currency = "₹",
  onPress,
}: Omit<EarningsProgressProps, "daysWorked" | "totalDays">) {
  const percentage = totalSalary > 0 ? Math.round((currentEarnings / totalSalary) * 100) : 0;

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `${currency}${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${currency}${(amount / 1000).toFixed(0)}K`;
    }
    return `${currency}${amount.toLocaleString("en-IN")}`;
  };

  const content = (
    <View style={styles.compactContainer}>
      <View style={styles.compactHeader}>
        <Text style={styles.compactTitle}>Earnings</Text>
        <Text style={styles.compactPercentage}>{percentage}%</Text>
      </View>
      <Text style={styles.compactAmount}>{formatCurrency(currentEarnings)}</Text>
      <View style={styles.compactProgressBackground}>
        <View
          style={[
            styles.compactProgressFill,
            { width: `${Math.min(percentage, 100)}%` as any },
          ]}
        />
      </View>
      <Text style={styles.compactSubtext}>of {formatCurrency(totalSalary)}</Text>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    ...Shadows.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  currentAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -1,
  },
  separator: {
    fontSize: 20,
    fontWeight: "400",
    color: Colors.gray400,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  progressContainer: {
    gap: Spacing.xs,
  },
  progressBackground: {
    height: 10,
    backgroundColor: Colors.gray200,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: 5,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.success,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.xs,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statText: {
    fontSize: 13,
  },
  statValue: {
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  // Compact styles
  compactContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    ...Shadows.sm,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compactPercentage: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.success,
  },
  compactAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  compactProgressBackground: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: "hidden",
  },
  compactProgressFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  compactSubtext: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
});
