/**
 * ReportsTab
 *
 * Reports and downloads with:
 * - Month selector with calendar visual
 * - Download buttons for different formats
 * - Attendance summary stats
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { downloadAttendanceReport } from "@/lib/utils/attendanceSheet.utils";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AnimatedRN, { FadeIn } from "react-native-reanimated";

interface ReportsTabProps {
  employeeId: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function ReportsTab({ employeeId, onSuccess, onError }: ReportsTabProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const isCurrentMonth =
    selectedMonth.getMonth() === new Date().getMonth() &&
    selectedMonth.getFullYear() === new Date().getFullYear();

  const previousMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    if (!isCurrentMonth) {
      setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      await downloadAttendanceReport(
        employeeId,
        selectedMonth.getMonth() + 1,
        selectedMonth.getFullYear()
      );
      onSuccess?.("Report downloaded successfully");
    } catch (err) {
      console.error("Download error:", err);
      onError?.("Failed to generate report");
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Get days in selected month
  const getDaysInMonth = () => {
    return new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  };

  // Get the weekday of the first day of the month (0 = Sunday)
  const getFirstDayOfMonth = () => {
    return new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth();
  const firstDayOffset = getFirstDayOfMonth();

  return (
    <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Month Selector Card */}
      <View style={styles.monthCard}>
        <View style={styles.monthSelector}>
          <TouchableOpacity
            onPress={previousMonth}
            style={styles.monthButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.monthDisplay}>
            <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.primary} />
            <Text style={styles.monthText}>
              {selectedMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>

          <TouchableOpacity
            onPress={nextMonth}
            style={[styles.monthButton, isCurrentMonth && styles.monthButtonDisabled]}
            disabled={isCurrentMonth}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isCurrentMonth ? Colors.gray300 : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Mini Calendar Visual */}
        <View style={styles.miniCalendar}>
          {/* Weekday Headers */}
          <View style={styles.weekdayHeaders}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <Text key={i} style={styles.weekdayHeader}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday =
                isCurrentMonth && day === new Date().getDate();
              return (
                <View
                  key={day}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Download Actions */}
      <View style={styles.downloadSection}>
        <Text style={styles.sectionTitle}>Download Reports</Text>

        <View style={styles.downloadGrid}>
          {/* PDF Download */}
          <TouchableOpacity
            style={styles.downloadCard}
            onPress={handleDownloadPDF}
            disabled={downloadingPDF}
            activeOpacity={0.7}
          >
            <View style={[styles.downloadIcon, { backgroundColor: Colors.error + "15" }]}>
              {downloadingPDF ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <MaterialCommunityIcons name="file-pdf-box" size={24} color={Colors.error} />
              )}
            </View>
            <Text style={styles.downloadTitle}>Attendance PDF</Text>
            <Text style={styles.downloadSubtitle}>Detailed report with check-in/out times</Text>
            <View style={styles.downloadBadge}>
              <Feather name="download" size={12} color={Colors.primary} />
              <Text style={styles.downloadBadgeText}>Download</Text>
            </View>
          </TouchableOpacity>

          {/* Salary Slip */}
          <TouchableOpacity
            style={[styles.downloadCard, styles.downloadCardDisabled]}
            activeOpacity={0.7}
            disabled
          >
            <View style={[styles.downloadIcon, { backgroundColor: Colors.info + "15" }]}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color={Colors.info} />
            </View>
            <Text style={styles.downloadTitle}>Salary Slip</Text>
            <Text style={styles.downloadSubtitle}>Monthly earnings breakdown</Text>
            <View style={[styles.downloadBadge, { backgroundColor: Colors.gray100 }]}>
              <Text style={[styles.downloadBadgeText, { color: Colors.gray500 }]}>
                Coming Soon
              </Text>
            </View>
          </TouchableOpacity>
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

  // Month Card
  monthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    justifyContent: "center",
    alignItems: "center",
  },
  monthButtonDisabled: {
    opacity: 0.5,
  },
  monthDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  // Mini Calendar
  miniCalendar: {
    gap: Spacing.sm,
  },
  weekdayHeaders: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.xs,
  },
  weekdayHeader: {
    width: 32,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellToday: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 12,
    color: Colors.text,
  },
  dayTextToday: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Download Section
  downloadSection: {},
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  downloadGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  downloadCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  downloadCardDisabled: {
    opacity: 0.6,
  },
  downloadIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  downloadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  downloadSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  downloadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  downloadBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
});
