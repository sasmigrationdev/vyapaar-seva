import AssignBreakModal from "@/components/attendance/AssignBreakModal";
import AttendanceActionBar from "@/components/attendance/AttendanceActionBar";
import AttendanceTable, {
  AttendanceTableHeader,
} from "@/components/attendance/AttendanceTable";
import MarkAttendanceModal from "@/components/attendance/MarkAttendanceModal";
import { useHRAllEmployeesAttendance } from "@/hooks/queries/useAttendance";
import { useAllLeaveRequests } from "@/hooks/queries/useLeave";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/auth/useAuth";
import { AttendanceRecord, AttendanceWithUser } from "@/lib/types";
import { getAttendanceStatus } from "@/lib/utils/attendance.utils";
import { formatDateToISO, formatTime } from "@/lib/utils/date.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Pressable,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

type StatusFilter = "all" | "present" | "absent" | "incomplete";
type SortField = "name" | "checkIn" | "checkOut" | "hours";
type SortOrder = "asc" | "desc";

export default function HRAttendanceScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const organizationId = user?.organization_id || '';

  // Day view state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Common state
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<
    AttendanceRecord | undefined
  >(undefined);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<
    string | undefined
  >(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [assignBreakModalVisible, setAssignBreakModalVisible] = useState(false);
  const [selectedRecordForBreak, setSelectedRecordForBreak] = useState<
    AttendanceWithUser | undefined
  >(undefined);
  const [showStatusLegend, setShowStatusLegend] = useState(false);

  const targetDate = formatDateToISO(selectedDate);

  // Memoize filter objects to prevent React Compiler cache size issues
  const attendanceFilters = useMemo(
    () => ({ date: targetDate, organizationId }),
    [targetDate, organizationId]
  );

  const employeeFilters = useMemo(
    () => ({ role: "employee" as const, isActive: true, organizationId }),
    [organizationId]
  );

  // Day view queries
  const {
    data: dayRecords,
    isLoading: isDayLoading,
    isFetching: isFetchingDayRecords,
    refetch: refetchDayRecords,
  } = useHRAllEmployeesAttendance(attendanceFilters);

  const { data: allEmployees, isFetching: isFetchingEmployees } = useAllUsers(employeeFilters);

  // Leave query for today
  const leaveFilters = useMemo(
    () => ({
      status: 'approved',
      startDate: targetDate,
      endDate: targetDate,
      organizationId
    }),
    [targetDate, organizationId]
  );
  const { data: leaveRequests } = useAllLeaveRequests(leaveFilters);

  const isLoadingData = isDayLoading || isFetchingDayRecords || isFetchingEmployees;

  // Calculate comprehensive day view statistics
  const dayStats = useMemo(() => {
    if (isLoadingData) {
      return {
        totalEmployees: 0,
        presentCount: 0,
        incompleteCount: 0,
        absentCount: 0,
        onLeaveCount: 0,
        totalHoursWorked: 0,
        averageHours: 0,
        totalOvertimeHours: 0,
        totalBreakMinutes: 0,
        attendanceRate: 0,
        avgCheckInTime: null as string | null,
      };
    }

    const totalEmployees = allEmployees?.length || 0;

    // Count by status from records
    const presentCount = dayRecords?.filter((r) => getAttendanceStatus(r) === "Present").length || 0;
    const incompleteCount = dayRecords?.filter((r) => getAttendanceStatus(r) === "Incomplete").length || 0;
    const recordsWithNoCheckIn = dayRecords?.filter((r) => getAttendanceStatus(r) === "Absent").length || 0;
    const onLeaveCount = leaveRequests?.length || 0;

    // Absent = employees with no record + employees with record but no check-in
    const employeesWithCheckIn = new Set(
      dayRecords?.filter(r => r.check_in_time).map(r => r.user_id) || []
    );
    const employeesOnLeave = new Set(leaveRequests?.map(l => l.user_id) || []);
    const employeesWithoutCheckIn = allEmployees?.filter(
      e => !employeesWithCheckIn.has(e.id) && !employeesOnLeave.has(e.id)
    ).length || 0;
    const absentCount = employeesWithoutCheckIn;

    // Hours calculations
    const totalHoursWorked = dayRecords?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0;
    const totalOvertimeHours = dayRecords?.reduce((sum, r) => sum + (r.overtime_hours || 0), 0) || 0;
    const totalBreakMinutes = dayRecords?.reduce((sum, r) => sum + (r.total_break_minutes || 0), 0) || 0;

    const recordsWithHours = dayRecords?.filter(r => r.total_hours && r.total_hours > 0) || [];
    const averageHours = recordsWithHours.length > 0
      ? totalHoursWorked / recordsWithHours.length
      : 0;

    // Attendance rate
    const attendanceRate = totalEmployees > 0
      ? Math.round(((presentCount + incompleteCount) / totalEmployees) * 100)
      : 0;

    // Average check-in time
    let avgCheckInTime: string | null = null;
    const checkInTimes = dayRecords?.filter(r => r.check_in_time).map(r => new Date(r.check_in_time!)) || [];
    if (checkInTimes.length > 0) {
      const avgTimestamp = checkInTimes.reduce((sum, d) => sum + d.getTime(), 0) / checkInTimes.length;
      avgCheckInTime = formatTime(new Date(avgTimestamp));
    }

    return {
      totalEmployees,
      presentCount,
      incompleteCount,
      absentCount,
      onLeaveCount,
      totalHoursWorked,
      averageHours,
      totalOvertimeHours,
      totalBreakMinutes,
      attendanceRate,
      avgCheckInTime,
    };
  }, [dayRecords, allEmployees, leaveRequests, isLoadingData]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!dayRecords) return [];

    let filtered = [...dayRecords];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.user?.full_name?.toLowerCase().includes(query) ||
          r.user?.employee_id?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => {
        const status = getAttendanceStatus(r).toLowerCase();
        return status === statusFilter;
      });
    }

    return filtered;
  }, [dayRecords, searchQuery, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchDayRecords();
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAttendance = () => {
    setSelectedRecord(undefined);
    setSelectedEmployeeId(undefined);
    setModalVisible(true);
  };

  const handleEditAttendance = (record: AttendanceRecord) => {
    if (record.id.startsWith("absent-")) {
      setSelectedRecord(undefined);
      setSelectedEmployeeId(record.user_id);
      setModalVisible(true);
      return;
    }

    setSelectedRecord(record);
    setSelectedEmployeeId(undefined);
    setModalVisible(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleAssignBreak = (record: AttendanceWithUser) => {
    setSelectedRecordForBreak(record);
    setAssignBreakModalVisible(true);
  };

  const previousDay = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const nextDay = () => {
    const now = new Date();
    if (selectedDate < now) {
      setSelectedDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 1);
        return newDate;
      });
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const handleDatePickerChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
    }
  };

  const statusFilterOptions = useMemo(() => {
    return [
      { value: "all" as StatusFilter, label: "All", count: dayRecords?.length || 0 },
      {
        value: "present" as StatusFilter,
        label: "Present",
        count: dayStats.presentCount,
      },
      {
        value: "incomplete" as StatusFilter,
        label: "Working",
        count: dayStats.incompleteCount,
      },
      {
        value: "absent" as StatusFilter,
        label: "Absent",
        count: dayStats.absentCount,
      },
    ];
  }, [dayRecords, dayStats]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.headerSection}>
          {/* Date Navigation Row */}
          <View style={styles.dateRow}>
            <TouchableOpacity
              onPress={previousDay}
              style={styles.navButton}
              activeOpacity={0.7}
              accessibilityLabel="Go to previous day"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateContainer}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              accessibilityLabel={`Selected date: ${selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}, tap to change`}
              accessibilityRole="button"
            >
              {isToday ? (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayText}>Today</Text>
                </View>
              ) : (
                <View style={styles.dateTextRow}>
                  <Text style={styles.dateMainText}>
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.jumpTodayButton}
                    onPress={() => setSelectedDate(new Date())}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.jumpTodayText}>Today</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={nextDay}
              style={[styles.navButton, isToday && styles.navButtonDisabled]}
              disabled={isToday}
              activeOpacity={0.7}
              accessibilityLabel="Go to next day"
              accessibilityRole="button"
              accessibilityState={{ disabled: isToday }}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isToday ? Colors.gray300 : Colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Compact Stats Grid - Tappable for filtering */}
          <View style={styles.statsGrid}>
            {/* Attendance Rate - Primary (shows all) */}
            <TouchableOpacity
              style={[styles.primaryStatCard, statusFilter === 'all' && styles.statCardSelected]}
              onPress={() => setStatusFilter('all')}
              activeOpacity={0.7}
            >
              <View style={styles.rateCircle}>
                <Text style={styles.rateValue}>
                  {isLoadingData ? '—' : dayStats.attendanceRate}
                </Text>
                <Text style={styles.ratePercent}>%</Text>
              </View>
              <Text style={styles.primaryStatLabel}>
                {dayStats.totalEmployees} Total
              </Text>
            </TouchableOpacity>

            {/* Present */}
            <TouchableOpacity
              style={[
                styles.statCard,
                statusFilter === 'present' && styles.statCardSelectedGreen,
                dayStats.presentCount > 0 && statusFilter !== 'present' && styles.statCardHighlight,
              ]}
              onPress={() => setStatusFilter('present')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statValue, { color: statusFilter === 'present' ? Colors.textInverse : Colors.success }]}>
                {isLoadingData ? '—' : dayStats.presentCount}
              </Text>
              <Text style={[styles.statLabel, statusFilter === 'present' && styles.statLabelSelected]}>Present</Text>
            </TouchableOpacity>

            {/* Working */}
            <TouchableOpacity
              style={[
                styles.statCard,
                statusFilter === 'incomplete' && styles.statCardSelectedAmber,
                dayStats.incompleteCount > 0 && statusFilter !== 'incomplete' && styles.statCardHighlightAmber,
              ]}
              onPress={() => setStatusFilter('incomplete')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statValue, { color: statusFilter === 'incomplete' ? Colors.textInverse : Colors.warning }]}>
                {isLoadingData ? '—' : dayStats.incompleteCount}
              </Text>
              <Text style={[styles.statLabel, statusFilter === 'incomplete' && styles.statLabelSelected]}>Working</Text>
            </TouchableOpacity>

            {/* Absent */}
            <TouchableOpacity
              style={[
                styles.statCard,
                statusFilter === 'absent' && styles.statCardSelectedRed,
                dayStats.absentCount > 0 && statusFilter !== 'absent' && styles.statCardAlert,
              ]}
              onPress={() => setStatusFilter('absent')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.statValue,
                { color: statusFilter === 'absent' ? Colors.textInverse : (dayStats.absentCount > 0 ? Colors.error : Colors.textTertiary) }
              ]}>
                {isLoadingData ? '—' : dayStats.absentCount}
              </Text>
              <Text style={[styles.statLabel, statusFilter === 'absent' && styles.statLabelSelected]}>Absent</Text>
            </TouchableOpacity>
          </View>

          {/* Secondary Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total Hours</Text>
              <Text style={styles.infoValue}>
                {isLoadingData ? '—' : `${dayStats.totalHoursWorked.toFixed(1)}h`}
              </Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Avg Check-in</Text>
              <Text style={styles.infoValue}>
                {isLoadingData ? '—' : (dayStats.avgCheckInTime || '—')}
              </Text>
            </View>

            {dayStats.totalOvertimeHours > 0 && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Overtime</Text>
                  <Text style={[styles.infoValue, { color: Colors.purple }]}>
                    +{dayStats.totalOvertimeHours.toFixed(1)}h
                  </Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textTertiary}
              accessibilityLabel="Search attendance records"
              accessibilityHint="Enter employee name or ID to filter"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          {/* Active filter indicator */}
          {statusFilter !== 'all' && (
            <TouchableOpacity
              style={styles.activeFilterBadge}
              onPress={() => setStatusFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={styles.activeFilterText}>
                {statusFilter === 'present' ? 'Present' : statusFilter === 'incomplete' ? 'Working' : 'Absent'}
              </Text>
              <Ionicons name="close" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>


        {/* Table Header */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <AttendanceTableHeader
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
        </Animated.View>

        {/* Table Content */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={[styles.tableContainer, { minHeight: 300, paddingBottom: 20 }]}>
          {isLoadingData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <AttendanceTable
              data={filteredRecords}
              onEdit={handleEditAttendance}
              onAssignBreak={handleAssignBreak}
              sortField={sortField}
              sortOrder={sortOrder}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {searchQuery || statusFilter !== "all"
                  ? "No matching records"
                  : "No attendance records"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Mark attendance to see records here"}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <MarkAttendanceModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedRecord(undefined);
          setSelectedEmployeeId(undefined);
        }}
        existingRecord={selectedRecord}
        employeeId={selectedEmployeeId}
        initialDate={formatDateToISO(selectedDate)}
      />

      {selectedRecordForBreak && (
        <AssignBreakModal
          visible={assignBreakModalVisible}
          onClose={() => {
            setAssignBreakModalVisible(false);
            setSelectedRecordForBreak(undefined);
          }}
          attendanceRecord={selectedRecordForBreak}
        />
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <>
          {Platform.OS === 'android' ? (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
              maximumDate={new Date()}
            />
          ) : (
            <View style={styles.iosPickerOverlay}>
              <TouchableOpacity
                style={styles.iosPickerBackdrop}
                activeOpacity={1}
                onPress={() => setShowDatePicker(false)}
              />
              <View style={styles.iosPickerContainer}>
                <View style={styles.iosPickerHeader}>
                  <Text style={styles.iosPickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.iosPickerDoneButton}
                    accessibilityLabel="Done selecting date"
                    accessibilityRole="button"
                  >
                    <Text style={styles.iosPickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDatePickerChange}
                  maximumDate={new Date()}
                  style={styles.iosDatePicker}
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* Floating Action Bar */}
      <AttendanceActionBar
        onMarkAttendance={handleMarkAttendance}
        onOpenCalendar={() => setShowDatePicker(true)}
        onJumpToToday={() => setSelectedDate(new Date())}
        isToday={isToday}
      />
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
  tableContainer: {
    flex: 1,
  },
  headerSection: {
    backgroundColor: Colors.background,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '12',
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonDisabled: {
    backgroundColor: Colors.gray100,
    opacity: 0.4,
  },
  dateContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  todayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  todayText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  dateTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dateMainText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  jumpTodayButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
  },
  jumpTodayText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  primaryStatCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    minWidth: 72,
  },
  rateCircle: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  rateValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  ratePercent: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    opacity: 0.8,
  },
  primaryStatLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.9,
    marginTop: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: "center",
  },
  statCardHighlight: {
    backgroundColor: Colors.success + '10',
  },
  statCardHighlightAmber: {
    backgroundColor: Colors.warning + '10',
  },
  statCardAlert: {
    backgroundColor: Colors.error + '10',
  },
  statCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  statCardSelectedGreen: {
    backgroundColor: Colors.success,
  },
  statCardSelectedAmber: {
    backgroundColor: Colors.warning,
  },
  statCardSelectedRed: {
    backgroundColor: Colors.error,
  },
  statLabelSelected: {
    color: Colors.textInverse,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  // Info Row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    height: 36,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  activeFilterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  activeFilterText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  legendContainer: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  legendTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  legendItems: {
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  legendDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing['4xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing['4xl'],
    gap: Spacing['lg'],
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
  },
  iosPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  iosPickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iosPickerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  iosPickerDoneButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.indigo,
    borderRadius: BorderRadius.md,
  },
  iosPickerDoneText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  iosDatePicker: {
    height: 200,
  },
});
