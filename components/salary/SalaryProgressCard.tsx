import ProgressBar from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/utils/salary.utils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";

interface SalaryProgressCardProps {
  earnedSalary: number;
  baseSalary: number;
  hoursWorked: number;
  expectedHours: number;
  compact?: boolean;
  hourlyRate?: number;
  daysWorkedThisWeek?: number;
}

export default function SalaryProgressCard({
  earnedSalary,
  baseSalary,
  hoursWorked,
  expectedHours,
  compact = false,
  hourlyRate,
  daysWorkedThisWeek,
}: SalaryProgressCardProps) {
  const salaryProgress = baseSalary > 0 ? (earnedSalary / baseSalary) * 100 : 0;
  const hoursProgress =
    expectedHours > 0 ? (hoursWorked / expectedHours) * 100 : 0;

  const showWeeklyStats =
    (hourlyRate != null && hourlyRate > 0) || daysWorkedThisWeek != null;

  return (
    <View style={styles.container}>
      {/* Weekly Stats Row (if available) */}
      {showWeeklyStats && !compact && (
        <View style={styles.statsRow}>
          {hourlyRate != null && hourlyRate > 0 && (
            <View style={styles.statCard}>
              <MaterialCommunityIcons
                name="cash-clock"
                size={18}
                color="#6366F1"
              />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Hourly Rate</Text>
                <Text
                  style={styles.statValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatCurrency(hourlyRate)}/h
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Salary Progress */}
      <View style={[styles.section, styles.card]}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="cash" size={20} color="#10B981" />
          <Text style={styles.label}>Earned This Month</Text>
        </View>
        <Text
          style={styles.earnedAmount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {formatCurrency(earnedSalary)}
        </Text>
        <Text style={styles.baseAmount} numberOfLines={1}>
          of {formatCurrency(baseSalary)}
        </Text>
        {!compact && (
          <ProgressBar
            progress={Math.min(salaryProgress, 100)}
            color="#10B981"
            height={8}
            style={styles.progressBar}
          />
        )}
      </View>

      {/* Hours Progress */}
      {!compact && (
        <View style={[styles.section, styles.card]}>
          <View style={styles.row}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color="#6366F1"
            />
            <Text style={styles.label}>Hours Worked</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursValue}>
              {hoursWorked.toFixed(1)}h
              <Text style={styles.hoursTotal}>
                {" "}
                / {expectedHours.toFixed(1)}h
              </Text>
            </Text>
            <Text style={styles.percentage}>
              {Math.min(hoursProgress, 100).toFixed(0)}%
            </Text>
          </View>
          <ProgressBar
            progress={Math.min(hoursProgress, 100)}
            color="#6366F1"
            height={8}
            style={styles.progressBar}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  card: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statContent: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  earnedAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10B981",
  },
  baseAmount: {
    fontSize: 14,
    color: "#64748B",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  hoursValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  hoursTotal: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  percentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  progressBar: {
    marginTop: 4,
  },
});
