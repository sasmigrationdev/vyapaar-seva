/**
 * BreaksSummaryStats
 *
 * Three-stat card floating over hero showing:
 * - Total breaks count
 * - Pending breaks count
 * - Total duration
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface BreaksSummaryStatsProps {
  totalBreaks: number;
  pendingCount: number;
  durationHours: number;
  durationMinutes: number;
  isLoading?: boolean;
  onPendingPress?: () => void;
}

export default function BreaksSummaryStats({
  totalBreaks,
  pendingCount,
  durationHours,
  durationMinutes,
  isLoading = false,
  onPendingPress,
}: BreaksSummaryStatsProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={styles.container}
    >
      <View style={styles.statsCard}>
        {/* Total Breaks */}
        <View style={styles.statItem}>
          <View
            style={[styles.statIcon, { backgroundColor: Colors.primary + "15" }]}
          >
            <MaterialCommunityIcons
              name="coffee"
              size={18}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.statValue}>
            {isLoading ? "—" : totalBreaks}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statDivider} />

        {/* Pending */}
        <TouchableOpacity
          style={styles.statItem}
          onPress={onPendingPress}
          activeOpacity={0.7}
          disabled={!onPendingPress}
        >
          <View
            style={[
              styles.statIcon,
              {
                backgroundColor:
                  pendingCount > 0 ? Colors.warning + "15" : Colors.gray100,
              },
            ]}
          >
            <Ionicons
              name="time"
              size={18}
              color={pendingCount > 0 ? Colors.warning : Colors.gray400}
            />
          </View>
          <Text
            style={[
              styles.statValue,
              pendingCount > 0 && styles.statValueWarning,
            ]}
          >
            {isLoading ? "—" : pendingCount}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        {/* Duration */}
        <View style={styles.statItem}>
          <View
            style={[styles.statIcon, { backgroundColor: Colors.info + "15" }]}
          >
            <Ionicons name="timer" size={18} color={Colors.info} />
          </View>
          <Text style={[styles.statValue, styles.statValueInfo]}>
            {isLoading ? "—" : `${durationHours}h ${durationMinutes}m`}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
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
