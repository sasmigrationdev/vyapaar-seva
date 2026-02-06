/**
 * MiniCalendarHeatmap
 *
 * GitHub-inspired contribution heatmap with:
 * - Apple-style subtle depth on cells
 * - Smooth color gradients
 * - Quick stats summary header
 * - Touch feedback on cells
 * - Weekend highlighting
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { AttendanceRecord } from "@/lib/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isWeekend,
  isFuture,
} from "date-fns";
import { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import Animated, { FadeInDown, FadeIn, FadeInUp } from "react-native-reanimated";

interface MiniCalendarHeatmapProps {
  records: Pick<AttendanceRecord, "date" | "total_hours" | "check_in_time">[];
  month: number;
  year: number;
  cellSize?: number;
  gap?: number;
  onDayPress?: (date: Date, hours: number | undefined) => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// GitHub-style color scale (5 levels)
const HEATMAP_COLORS = {
  empty: "#EBEDF0",
  level1: "#9BE9A8", // 1-2 hours
  level2: "#40C463", // 2-4 hours
  level3: "#30A14E", // 4-6 hours
  level4: "#216E39", // 6-8 hours
  level5: "#0E4429", // 8+ hours
};

export default function MiniCalendarHeatmap({
  records,
  month,
  year,
  cellSize = 32,
  gap = 3,
  onDayPress,
}: MiniCalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const firstDay = startOfMonth(new Date(year, month));
  const lastDay = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });

  // Create maps for quick lookup
  const hoursMap = new Map<string, number>();
  let totalPresent = 0;
  let totalHours = 0;

  records.forEach((record) => {
    if (record.check_in_time) {
      const dateKey = record.date;
      const hours = record.total_hours || 0;
      hoursMap.set(dateKey, hours);
      totalPresent++;
      totalHours += hours;
    }
  });

  // GitHub-style color based on hours
  const getCellColor = (hours: number | undefined, day: Date) => {
    if (isFuture(day)) return "transparent";
    if (hours === undefined || hours === 0) return HEATMAP_COLORS.empty;
    if (hours < 2) return HEATMAP_COLORS.level1;
    if (hours < 4) return HEATMAP_COLORS.level2;
    if (hours < 6) return HEATMAP_COLORS.level3;
    if (hours < 8) return HEATMAP_COLORS.level4;
    return HEATMAP_COLORS.level5;
  };

  // Calculate weeks grid
  const startOffset = getDay(firstDay);
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = Array(startOffset).fill(null);

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const today = new Date();

  const handleDayPress = useCallback(
    (day: Date, hours: number | undefined) => {
      const dateKey = format(day, "yyyy-MM-dd");
      setSelectedDay(selectedDay === dateKey ? null : dateKey);
      onDayPress?.(day, hours);
    },
    [selectedDay, onDayPress]
  );

  // Quick stats for header
  const avgHours = totalPresent > 0 ? (totalHours / totalPresent).toFixed(1) : "0";
  const workingDays = days.filter((d) => !isWeekend(d) && !isFuture(d)).length;
  const attendanceRate = workingDays > 0 ? Math.round((totalPresent / workingDays) * 100) : 0;

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.container}>
      {/* Header with quick stats */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.monthTitle}>
            {format(new Date(year, month), "MMMM")}
          </Text>
          <Text style={styles.yearText}>{year}</Text>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{totalPresent}</Text>
            <Text style={styles.quickStatLabel}>days</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{avgHours}h</Text>
            <Text style={styles.quickStatLabel}>avg</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: Colors.success }]}>
              {attendanceRate}%
            </Text>
            <Text style={styles.quickStatLabel}>rate</Text>
          </View>
        </View>
      </View>

      {/* Weekday labels */}
      <View style={[styles.weekdayRow, { gap }]}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} style={[styles.weekdayLabel, { width: cellSize }]}>
            <Text
              style={[
                styles.weekdayText,
                (index === 0 || index === 6) && styles.weekendText,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={[styles.grid, { gap }]}>
        {weeks.map((week, weekIndex) => (
          <Animated.View
            key={weekIndex}
            entering={FadeIn.delay(40 * weekIndex).springify()}
            style={[styles.weekRow, { gap }]}
          >
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <View
                    key={`empty-${dayIndex}`}
                    style={[styles.cell, { width: cellSize, height: cellSize }]}
                  />
                );
              }

              const dateKey = format(day, "yyyy-MM-dd");
              const hours = hoursMap.get(dateKey);
              const cellColor = getCellColor(hours, day);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay === dateKey;
              const isFutureDay = isFuture(day);
              const isWeekendDay = isWeekend(day);

              return (
                <Pressable
                  key={dateKey}
                  onPress={() => !isFutureDay && handleDayPress(day, hours)}
                  disabled={isFutureDay}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: cellColor,
                      opacity: isFutureDay ? 0.3 : pressed ? 0.7 : 1,
                      borderWidth: isToday ? 2 : isSelected ? 1.5 : 0,
                      borderColor: isToday
                        ? Colors.primary
                        : isSelected
                        ? Colors.text
                        : "transparent",
                    },
                    hours !== undefined && hours >= 6 && styles.cellWithShadow,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color:
                          hours !== undefined && hours >= 4
                            ? "#FFFFFF"
                            : isWeekendDay
                            ? Colors.textTertiary
                            : Colors.textSecondary,
                        fontWeight: isToday ? "700" : "500",
                      },
                    ]}
                  >
                    {format(day, "d")}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        ))}
      </View>

      {/* Selected day tooltip */}
      {selectedDay && (
        <Animated.View entering={FadeInUp.springify()} style={styles.tooltip}>
          <View style={styles.tooltipContent}>
            <Text style={styles.tooltipDate}>
              {format(new Date(selectedDay), "EEEE, MMM d")}
            </Text>
            <View style={styles.tooltipStats}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.tooltipHours}>
                {hoursMap.get(selectedDay)?.toFixed(1) || "0"} hours worked
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        <View style={styles.legendColors}>
          {[
            HEATMAP_COLORS.empty,
            HEATMAP_COLORS.level1,
            HEATMAP_COLORS.level2,
            HEATMAP_COLORS.level3,
            HEATMAP_COLORS.level4,
            HEATMAP_COLORS.level5,
          ].map((color, index) => (
            <View
              key={index}
              style={[styles.legendCell, { backgroundColor: color }]}
            />
          ))}
        </View>
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["3xl"],
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Shadows.md,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  yearText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textTertiary,
  },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  quickStat: {
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  quickStatLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  quickStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.gray200,
  },
  // Weekday labels
  weekdayRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekdayLabel: {
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  weekendText: {
    color: Colors.textTertiary,
  },
  // Grid
  grid: {
    flexDirection: "column",
  },
  weekRow: {
    flexDirection: "row",
  },
  cell: {
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cellWithShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#22C55E",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  dayNumber: {
    fontSize: 10,
    fontWeight: "500",
  },
  // Tooltip
  tooltip: {
    marginTop: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  tooltipContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tooltipDate: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  tooltipStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tooltipHours: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  // Legend
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textTertiary,
  },
  legendColors: {
    flexDirection: "row",
    gap: 2,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
