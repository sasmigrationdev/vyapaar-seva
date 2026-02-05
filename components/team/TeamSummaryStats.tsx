/**
 * TeamSummaryStats
 *
 * Actionable team health metrics with:
 * - New joins this month
 * - Employees needing salary setup
 * - Employees with incomplete profiles
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface TeamSummaryStatsProps {
  newJoinsThisMonth: number;
  needsSetup: number;
  incompleteProfiles: number;
  onNewJoinsPress?: () => void;
  onNeedsSetupPress?: () => void;
  onIncompletePress?: () => void;
}

export default function TeamSummaryStats({
  newJoinsThisMonth,
  needsSetup,
  incompleteProfiles,
  onNewJoinsPress,
  onNeedsSetupPress,
  onIncompletePress,
}: TeamSummaryStatsProps) {
  const hasIssues = needsSetup > 0 || incompleteProfiles > 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={styles.container}
    >
      <View style={styles.statsCard}>
        {/* New Joins */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onNewJoinsPress}
          activeOpacity={0.7}
          disabled={!onNewJoinsPress}
        >
          <View style={[styles.statIcon, { backgroundColor: Colors.success + "15" }]}>
            <MaterialCommunityIcons name="account-plus" size={18} color={Colors.success} />
          </View>
          <Text style={styles.statValue}>{newJoinsThisMonth}</Text>
          <Text style={styles.statLabel}>New</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        {/* Needs Setup */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onNeedsSetupPress}
          activeOpacity={0.7}
          disabled={!onNeedsSetupPress}
        >
          <View style={[styles.statIcon, { backgroundColor: needsSetup > 0 ? Colors.warning + "15" : Colors.gray100 }]}>
            <MaterialCommunityIcons
              name="currency-inr"
              size={18}
              color={needsSetup > 0 ? Colors.warning : Colors.gray400}
            />
          </View>
          <Text style={[styles.statValue, needsSetup > 0 && styles.statValueWarning]}>
            {needsSetup}
          </Text>
          <Text style={styles.statLabel}>No Salary</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        {/* Incomplete Profiles */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onIncompletePress}
          activeOpacity={0.7}
          disabled={!onIncompletePress}
        >
          <View style={[styles.statIcon, { backgroundColor: incompleteProfiles > 0 ? Colors.error + "15" : Colors.gray100 }]}>
            <MaterialCommunityIcons
              name="account-alert"
              size={18}
              color={incompleteProfiles > 0 ? Colors.error : Colors.gray400}
            />
          </View>
          <Text style={[styles.statValue, incompleteProfiles > 0 && styles.statValueError]}>
            {incompleteProfiles}
          </Text>
          <Text style={styles.statLabel}>Incomplete</Text>
        </TouchableOpacity>
      </View>

      {/* Action hint when there are issues */}
      {hasIssues && (
        <View style={styles.hintRow}>
          <MaterialCommunityIcons name="information-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.hintText}>Tap a stat to filter employees needing attention</Text>
        </View>
      )}
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
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statValueWarning: {
    color: Colors.warning,
  },
  statValueError: {
    color: Colors.error,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray100,
    marginVertical: 8,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  hintText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
