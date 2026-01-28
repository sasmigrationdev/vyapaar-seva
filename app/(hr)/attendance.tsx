import AssignBreakModal from "@/components/attendance/AssignBreakModal";
import AttendanceStatsCards from "@/components/attendance/AttendanceStatsCards";
import AttendanceTable, {
  AttendanceTableHeader,
} from "@/components/attendance/AttendanceTable";
import MarkAttendanceModal from "@/components/attendance/MarkAttendanceModal";
import { useHRAllEmployeesAttendance } from "@/hooks/queries/useAttendance";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/auth/useAuth";
import { AttendanceRecord, AttendanceWithUser } from "@/lib/types";
import { getAttendanceStatus } from "@/lib/utils/attendance.utils";
import { formatDateToISO } from "@/lib/utils/date.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
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
} from "react-native";
import { Text } from "@/components/ui/Text";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

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

  const targetDate = formatDateToISO(selectedDate);

  // Day view queries
  const {
    data: dayRecords,
    isLoading: isDayLoading,
    isFetching: isFetchingDayRecords,
    refetch: refetchDayRecords,
  } = useHRAllEmployeesAttendance({
    date: targetDate,
    organizationId,
  });

  const { data: allEmployees, isFetching: isFetchingEmployees } = useAllUsers({
    role: "employee",
    isActive: true,
    organizationId,
  });

  const isLoadingData = isDayLoading || isFetchingDayRecords || isFetchingEmployees;

  // Calculate day view statistics
  const dayStats = useMemo(() => {
    if (isLoadingData) {
      return {
        totalEmployees: 0,
        presentCount: 0,
        absentCount: 0,
        averageHours: 0,
      };
    }

    const totalEmployees = allEmployees?.length || 0;
    const presentCount =
      dayRecords?.filter((r) => {
        const status = getAttendanceStatus(r);
        return status === "Present" || status === "Incomplete";
      }).length || 0;
    const totalHours =
      dayRecords?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0;
    const averageHours =
      dayRecords && dayRecords.length > 0 ? totalHours / dayRecords.length : 0;
    const absentCount = totalEmployees - (dayRecords?.length || 0);

    return {
      totalEmployees,
      presentCount,
      absentCount,
      averageHours,
    };
  }, [dayRecords, allEmployees, isLoadingData]);

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
        label: "Incomplete",
        count: dayRecords?.filter((r) => getAttendanceStatus(r) === "Incomplete").length || 0,
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
        {/* Day Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity
            onPress={previousDay}
            style={styles.monthButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthTextContainer}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="calendar-today"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.monthText}>
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextDay}
            style={[styles.monthButton, isToday && styles.monthButtonDisabled]}
            disabled={isToday}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isToday ? Colors.gray300 : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Day View Statistics Cards */}
        <AttendanceStatsCards
          totalEmployees={dayStats.totalEmployees}
          presentCount={dayStats.presentCount}
          absentCount={dayStats.absentCount}
          averageHours={dayStats.averageHours}
          isLoading={isLoadingData}
        />

        {/* Search and Filters */}
        <View style={styles.filtersContainer}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textTertiary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChips}
            contentContainerStyle={styles.filterChipsContent}
          >
            {statusFilterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  statusFilter === option.value && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === option.value &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.filterChipBadge,
                    statusFilter === option.value &&
                      styles.filterChipBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipBadgeText,
                      statusFilter === option.value &&
                        styles.filterChipBadgeTextActive,
                    ]}
                  >
                    {option.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Table Header */}
        <AttendanceTableHeader
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        {/* Table Content */}
        <View style={[styles.tableContainer, { minHeight: 300, paddingBottom: 20 }]}>
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
        </View>
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 60 + (insets.bottom > 0 ? insets.bottom : 0) + Spacing['lg'] }]}
        onPress={handleMarkAttendance}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.textInverse} />
      </TouchableOpacity>
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
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 20,
    paddingVertical: Spacing['md'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: "center",
    alignItems: "center",
  },
  monthButtonDisabled: {
    backgroundColor: Colors.gray100,
    opacity: 0.5,
  },
  monthTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing['sm'],
    flex: 1,
    justifyContent: "center",
  },
  monthText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  filtersContainer: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing['md'],
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing['md'],
    gap: Spacing['sm'],
    marginBottom: Spacing['sm'],
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  filterChips: {
    marginTop: 4,
  },
  filterChipsContent: {
    gap: Spacing['sm'],
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing['sm'],
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing['lg'],
    paddingVertical: Spacing['sm'],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  filterChipBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: Spacing['sm'],
    paddingVertical: 2,
    borderRadius: BorderRadius.lg,
    minWidth: 24,
    alignItems: "center",
  },
  filterChipBadgeActive: {
    backgroundColor: Colors.primaryLight,
  },
  filterChipBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  filterChipBadgeTextActive: {
    color: Colors.textInverse,
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iosPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  iosPickerDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  iosPickerDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iosDatePicker: {
    height: 200,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
    elevation: 8,
  },
});
