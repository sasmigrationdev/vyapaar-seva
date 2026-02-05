/**
 * PayrollSummaryStats
 *
 * Floating stats card showing:
 * - Total payroll periods
 * - Total amount paid
 * - In progress periods
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface PayrollSummaryStatsProps {
  totalPeriods: number;
  completedCount: number;
  totalAmount: number;
  paidAmount: number;
  inProgressCount: number;
  draftCount: number;
  isLoading?: boolean;
  onTotalPress?: () => void;
  onInProgressPress?: () => void;
}

export default function PayrollSummaryStats({
  totalPeriods,
  completedCount,
  totalAmount,
  paidAmount,
  inProgressCount,
  draftCount,
  isLoading = false,
  onTotalPress,
  onInProgressPress,
}: PayrollSummaryStatsProps) {
  const formatAmount = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${Math.floor(amount / 1000)}K`;
    }
    return `₹${amount}`;
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={styles.container}
    >
      <View style={styles.statsCard}>
        {/* Total Periods */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onTotalPress}
          activeOpacity={0.7}
          disabled={!onTotalPress}
        >
          <View style={[styles.statIcon, { backgroundColor: Colors.primary + "15" }]}>
            <MaterialCommunityIcons
              name="file-document-multiple"
              size={18}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.statValue}>
            {isLoading ? "—" : totalPeriods}
          </Text>
          <Text style={styles.statLabel}>Periods</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        {/* Total Amount */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.success + "15" }]}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={18}
              color={Colors.success}
            />
          </View>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            {isLoading ? "—" : formatAmount(totalAmount)}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statDivider} />

        {/* In Progress */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onInProgressPress}
          activeOpacity={0.7}
          disabled={!onInProgressPress}
        >
          <View
            style={[
              styles.statIcon,
              {
                backgroundColor:
                  inProgressCount > 0 ? Colors.warning + "15" : Colors.gray100,
              },
            ]}
          >
            <Ionicons
              name="time"
              size={18}
              color={inProgressCount > 0 ? Colors.warning : Colors.gray400}
            />
          </View>
          <Text
            style={[
              styles.statValue,
              inProgressCount > 0 && styles.statValueWarning,
            ]}
          >
            {isLoading ? "—" : inProgressCount}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing["2xl"],
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statValueWarning: {
    color: Colors.warning,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray100,
    marginVertical: 8,
  },
});
