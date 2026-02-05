/**
 * SalarySummaryStats
 *
 * Three-stat card floating over hero showing:
 * - Total Base: Sum of all employee base salaries
 * - Earned: Total earned this month across all employees
 * - Active: Count of employees with earnings this month
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface SalarySummaryStatsProps {
  totalBase: number;
  totalEarned: number;
  activeCount: number;
  totalCount: number;
  isLoading?: boolean;
  onTotalBasePress?: () => void;
  onEarnedPress?: () => void;
  onActivePress?: () => void;
}

export default function SalarySummaryStats({
  totalBase,
  totalEarned,
  activeCount,
  totalCount,
  isLoading = false,
  onTotalBasePress,
  onEarnedPress,
  onActivePress,
}: SalarySummaryStatsProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${Math.floor(amount).toLocaleString("en-IN")}`;
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={styles.container}
    >
      <View style={styles.statsCard}>
        {/* Total Base */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onTotalBasePress}
          activeOpacity={0.7}
          disabled={!onTotalBasePress}
        >
          <View
            style={[styles.statIcon, { backgroundColor: Colors.primary + "15" }]}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={18}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.statValue}>
            {isLoading ? "—" : formatCurrency(totalBase)}
          </Text>
          <Text style={styles.statLabel}>Base</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        {/* Earned This Month */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onEarnedPress}
          activeOpacity={0.7}
          disabled={!onEarnedPress}
        >
          <View
            style={[
              styles.statIcon,
              { backgroundColor: Colors.success + "15" },
            ]}
          >
            <MaterialCommunityIcons
              name="currency-inr"
              size={18}
              color={Colors.success}
            />
          </View>
          <Text style={[styles.statValue, styles.statValueSuccess]}>
            {isLoading ? "—" : formatCurrency(totalEarned)}
          </Text>
          <Text style={styles.statLabel}>Earned</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        {/* Active Employees */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onActivePress}
          activeOpacity={0.7}
          disabled={!onActivePress}
        >
          <View
            style={[
              styles.statIcon,
              {
                backgroundColor:
                  activeCount > 0 ? Colors.info + "15" : Colors.gray100,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="account-check"
              size={18}
              color={activeCount > 0 ? Colors.info : Colors.gray400}
            />
          </View>
          <Text
            style={[styles.statValue, activeCount > 0 && styles.statValueInfo]}
          >
            {isLoading ? "—" : activeCount}
          </Text>
          <Text style={styles.statLabel}>
            of {totalCount} Active
          </Text>
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
  statValueSuccess: {
    color: Colors.success,
  },
  statValueInfo: {
    color: Colors.info,
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
