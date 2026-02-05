import { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  StatusBar,
  TextInput,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { Text } from "@/components/ui/Text";
import { Stack } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useAllBreaksByMonth,
  useBreaksByDate,
} from "@/hooks/queries/useBreakRequests";
import { useRemoveBreak } from "@/hooks/mutations/useBreakRequestMutations";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/auth/useAuth";
import { BreakRequest } from "@/lib/types";
import AddBreakForEmployeeModal from "@/components/attendance/AddBreakForEmployeeModal";
import EmptyState from "@/components/ui/EmptyState";
import {
  BreaksHeroHeader,
  BreaksSummaryStats,
  BreaksActionBar,
  BreakRecordCard,
} from "@/components/breaks";
import { Colors, Typography, Spacing, BorderRadius } from "@/constants/theme";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HRBreaksScreen() {
  const { user } = useAuth();
  const { success, error, confirmDestructive } = useAlert();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<"month" | "date">("month");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const dateString = selectedDate.toISOString().split("T")[0];

  // Memoize filter objects
  const organizationId = user?.organization_id || "";
  const employeeFilters = useMemo(
    () => ({ role: "employee" as const, organizationId }),
    [organizationId]
  );

  // Employee list query
  const { data: employees } = useAllUsers(employeeFilters);

  // Queries
  const {
    data: monthBreaks,
    isLoading: isMonthLoading,
    refetch: refetchMonth,
    isFetching: isMonthFetching,
  } = useAllBreaksByMonth(currentMonth, currentYear, user?.organization_id || "", {
    enabled: dateFilterMode === "month" && !!user?.organization_id,
  } as any);

  const {
    data: dateBreaks,
    isLoading: isDateLoading,
    refetch: refetchDate,
    isFetching: isDateFetching,
  } = useBreaksByDate(dateString, user?.organization_id || "", {
    enabled: dateFilterMode === "date" && !!user?.organization_id,
  } as any);

  // Mutations
  const removeBreakMutation = useRemoveBreak(user?.id || "", {
    onSuccess: () => {
      success("Success", "Break removed successfully");
      refetch();
    },
    onError: (err) => {
      error("Error", err.message || "Failed to remove break");
    },
  });

  // Filter breaks
  const allBreaks = dateFilterMode === "month" ? monthBreaks : dateBreaks;
  const breaks = useMemo(() => {
    if (!allBreaks) return [];
    let filtered = selectedEmployeeId === "all"
      ? allBreaks
      : allBreaks.filter((br: any) => br.user_id === selectedEmployeeId);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((br: any) =>
        br.user?.full_name?.toLowerCase().includes(query) ||
        br.user?.employee_id?.toLowerCase().includes(query)
      );
    }

    // Sort by latest first
    return filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.request_date).getTime();
      const dateB = new Date(b.created_at || b.request_date).getTime();
      return dateB - dateA;
    });
  }, [allBreaks, selectedEmployeeId, searchQuery]);

  const isLoading = dateFilterMode === "month" ? isMonthLoading : isDateLoading;
  const isFetching = dateFilterMode === "month" ? isMonthFetching : isDateFetching;
  const refetch = dateFilterMode === "month" ? refetchMonth : refetchDate;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!breaks) return { totalBreaks: 0, pendingCount: 0, hours: 0, minutes: 0 };

    const totalBreaks = breaks.length;
    const pendingCount = breaks.filter((b) => b.status === "pending_start").length;
    const totalMinutes = breaks
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + (b.duration_minutes || 0), 0);

    return {
      totalBreaks,
      pendingCount,
      hours: Math.floor(totalMinutes / 60),
      minutes: Math.round(totalMinutes % 60),
    };
  }, [breaks]);

  // Subtitle for hero
  const heroSubtitle = useMemo(() => {
    if (dateFilterMode === "month") {
      return `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    }
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [dateFilterMode, currentMonth, currentYear, selectedDate]);

  // Handlers
  const handleDateChange = (event: any, date?: Date) => {
    if (date) setSelectedDate(date);
    setShowDatePicker(false);
  };

  const handlePreviousMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const handleRemoveBreak = (breakRequest: BreakRequest) => {
    confirmDestructive(
      "Remove Break",
      "Are you sure you want to remove this break?",
      () => {
        removeBreakMutation.mutate({
          breakRequestId: breakRequest.id,
          userId: breakRequest.user_id,
          requestDate: breakRequest.request_date,
        });
      },
      undefined,
      "Remove"
    );
  };

  const selectedEmployee = employees?.find((emp) => emp.id === selectedEmployeeId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={Colors.primaryLight}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Hero Header */}
        <BreaksHeroHeader subtitle={heroSubtitle} />

        {/* Summary Stats */}
        <BreaksSummaryStats
          totalBreaks={stats.totalBreaks}
          pendingCount={stats.pendingCount}
          durationHours={stats.hours}
          durationMinutes={stats.minutes}
          isLoading={isLoading}
        />

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Compact Filter Row */}
          <View style={styles.filterRow}>
            {/* View Toggle */}
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, dateFilterMode === "month" && styles.toggleBtnActive]}
                onPress={() => {
                  setDateFilterMode("month");
                  setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
                }}
              >
                <MaterialCommunityIcons
                  name="calendar-month"
                  size={16}
                  color={dateFilterMode === "month" ? Colors.textInverse : Colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, dateFilterMode === "date" && styles.toggleBtnActive]}
                onPress={() => setDateFilterMode("date")}
              >
                <MaterialCommunityIcons
                  name="calendar-today"
                  size={16}
                  color={dateFilterMode === "date" ? Colors.textInverse : Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Date/Month Navigation */}
            {dateFilterMode === "month" ? (
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={handlePreviousMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.monthDisplay}
                  onPress={() => setShowMonthPicker(true)}
                >
                  <Text style={styles.monthText}>
                    {MONTH_NAMES[currentMonth].slice(0, 3)} {currentYear}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.datePicker}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={16} color={Colors.primary} />
                <Text style={styles.dateText}>
                  {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </TouchableOpacity>
            )}

            {/* Employee Filter */}
            <TouchableOpacity
              style={styles.employeeBtn}
              onPress={() => setShowEmployeePicker(true)}
            >
              <Ionicons name="person" size={16} color={Colors.primary} />
              <Text style={styles.employeeBtnText} numberOfLines={1}>
                {selectedEmployeeId === "all" ? "All" : selectedEmployee?.full_name?.split(" ")[0] || "All"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or ID..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Break Records */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : breaks && breaks.length > 0 ? (
            <View style={styles.cardsContainer}>
              {breaks.map((item: any, index: number) => (
                <BreakRecordCard
                  key={item.id}
                  id={item.id}
                  employeeName={item.user?.full_name || "Unknown"}
                  employeeId={item.user?.employee_id || "N/A"}
                  status={item.status}
                  requestDate={item.request_date}
                  actualStartTime={item.actual_start_time}
                  actualEndTime={item.actual_end_time}
                  durationMinutes={item.duration_minutes}
                  notes={item.notes}
                  index={index}
                  onRemove={item.status === "completed" ? () => handleRemoveBreak(item) : undefined}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="coffee-off-outline"
              iconLibrary="material-community"
              title="No breaks found"
              subtitle={
                searchQuery
                  ? "Try adjusting your search"
                  : dateFilterMode === "month"
                  ? "No breaks recorded for this month"
                  : "No breaks recorded for this date"
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <BreaksActionBar onAddBreak={() => setShowAssignModal(true)} />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.monthPickerModal} onStartShouldSetResponder={() => true}>
            <View style={styles.monthPickerHeader}>
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date(selectedDate.getFullYear() - 1, currentMonth, 1))}
                style={styles.yearBtn}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{currentYear}</Text>
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date(selectedDate.getFullYear() + 1, currentMonth, 1))}
                style={styles.yearBtn}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthsGrid}>
              {MONTH_NAMES.map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.monthBtn, currentMonth === index && styles.monthBtnActive]}
                  onPress={() => {
                    setSelectedDate(new Date(currentYear, index, 1));
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={[styles.monthBtnText, currentMonth === index && styles.monthBtnTextActive]}>
                    {month.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Employee Picker Modal */}
      <Modal
        visible={showEmployeePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmployeePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmployeePicker(false)}
        >
          <View style={styles.employeePickerModal} onStartShouldSetResponder={() => true}>
            <View style={styles.employeePickerHeader}>
              <Text style={styles.employeePickerTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.employeeList}>
              <TouchableOpacity
                style={[styles.employeeItem, selectedEmployeeId === "all" && styles.employeeItemActive]}
                onPress={() => {
                  setSelectedEmployeeId("all");
                  setShowEmployeePicker(false);
                }}
              >
                <Ionicons name="people" size={20} color={selectedEmployeeId === "all" ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.employeeItemText, selectedEmployeeId === "all" && styles.employeeItemTextActive]}>
                  All Employees
                </Text>
                {selectedEmployeeId === "all" && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
              {employees?.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={[styles.employeeItem, selectedEmployeeId === emp.id && styles.employeeItemActive]}
                  onPress={() => {
                    setSelectedEmployeeId(emp.id);
                    setShowEmployeePicker(false);
                  }}
                >
                  <View style={styles.employeeAvatar}>
                    <Text style={styles.employeeAvatarText}>
                      {emp.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.employeeItemText, selectedEmployeeId === emp.id && styles.employeeItemTextActive]}>
                      {emp.full_name}
                    </Text>
                    <Text style={styles.employeeItemSubtext}>ID: {emp.employee_id}</Text>
                  </View>
                  {selectedEmployeeId === emp.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Break Modal */}
      {showAssignModal && (
        <AddBreakForEmployeeModal
          visible={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            refetch();
          }}
          preSelectedDate={selectedDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  contentSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  monthNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xs,
  },
  navBtn: {
    padding: Spacing.xs,
  },
  monthDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
  },
  monthText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  datePicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  employeeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    maxWidth: 120,
  },
  employeeBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  loadingContainer: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  monthPickerModal: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    width: "85%",
    maxWidth: 360,
  },
  monthPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  yearBtn: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
  },
  yearText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  monthBtn: {
    width: "30%",
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
  },
  monthBtnActive: {
    backgroundColor: Colors.primary,
  },
  monthBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  monthBtnTextActive: {
    color: Colors.textInverse,
  },
  employeePickerModal: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius["2xl"],
    width: "85%",
    maxHeight: "70%",
  },
  employeePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  employeePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  employeeList: {
    maxHeight: 400,
  },
  employeeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  employeeItemActive: {
    backgroundColor: Colors.primary + "10",
  },
  employeeItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  employeeItemTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  employeeItemSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  employeeAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
});
