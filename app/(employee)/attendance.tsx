import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAttendanceByYearMonth, useFirstAttendanceDate } from '@/hooks/queries/useAttendance';
import { useUserAttendanceSummary } from '@/hooks/queries/useAttendanceSummary';
import { useMyOvertimeRequests } from '@/hooks/queries/useOvertimeRequests';
import { useUserLeaveRequests } from '@/hooks/queries/useLeave';
import { formatTime } from '@/lib/utils/date.utils';
import { formatHours } from '@/lib/utils/attendance.utils';
import { downloadAttendanceReport } from '@/lib/utils/attendanceSheet.utils';
import { AttendanceRecord, YearFilter, MonthFilter } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, StatusColors } from '@/constants/theme';
import AddOvertimeModal from '@/components/attendance/AddOvertimeModal';
import YearMonthSelector from '@/components/ui/YearMonthSelector';
import EnhancedAttendanceStats from '@/components/attendance/EnhancedAttendanceStats';
import AttendanceViewToggle, { ViewMode } from '@/components/attendance/AttendanceViewToggle';
import AttendanceCalendarView, { CalendarDay } from '@/components/attendance/AttendanceCalendarView';
import DayDetailModal from '@/components/attendance/DayDetailModal';
import WeeklyHoursChart from '@/components/attendance/WeeklyHoursChart';
import SwipeableAttendanceRow from '@/components/attendance/SwipeableAttendanceRow';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const { success, error, info } = useAlert();
  const userId = user?.id || '';

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<YearFilter>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<MonthFilter>(currentDate.getMonth());
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<CalendarDay | null>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);

  // Get first attendance date to determine year range
  const { data: firstAttendanceDate } = useFirstAttendanceDate(userId);
  const minYear = firstAttendanceDate ? new Date(firstAttendanceDate).getFullYear() : currentDate.getFullYear() - 2;

  // Fetch attendance records
  const {
    data: attendanceData,
    isLoading,
    refetch
  } = useAttendanceByYearMonth(userId, selectedYear, selectedMonth);
  const records = attendanceData?.records || [];

  // Fetch attendance summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary
  } = useUserAttendanceSummary(userId, selectedYear, selectedMonth);

  // Fetch leave requests for calendar
  const { data: leaveRequests } = useUserLeaveRequests(userId);

  // Calculate date range for overtime requests (also used as filter param)
  const overtimeFilters = useMemo(() => {
    if (selectedYear === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (selectedMonth === 'all') {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      };
    }
    const year = selectedYear as number;
    const month = selectedMonth as number;
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return { startDate, endDate };
  }, [selectedYear, selectedMonth]);

  // Fetch overtime requests for the selected period
  const { data: overtimeRequests, refetch: refetchOvertimeRequests } = useMyOvertimeRequests(
    userId,
    overtimeFilters
  );

  // Helper to get overtime request for a specific attendance record
  const getOvertimeRequest = useCallback((attendanceRecordId: string) => {
    return overtimeRequests?.find(req => req.attendance_record_id === attendanceRecordId);
  }, [overtimeRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchSummary(), refetchOvertimeRequests()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!records || records.length === 0) {
      info('No Data', 'No attendance records available for this period');
      return;
    }

    if (selectedYear === 'all' || selectedMonth === 'all') {
      info('Select Month', 'Please select a specific month to download the report');
      return;
    }

    try {
      setDownloading(true);

      const today = new Date();
      const month = (selectedMonth as number) + 1;
      const year = selectedYear as number;

      // If it's the current month, use today's date, otherwise use the last day of the month
      let endDay: number | undefined;
      if (month === today.getMonth() + 1 && year === today.getFullYear()) {
        endDay = today.getDate();
      }

      await downloadAttendanceReport(userId, month, year, endDay);
      success('Success', 'Attendance report downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      error('Error', 'Failed to generate attendance report');
    } finally {
      setDownloading(false);
    }
  };

  const getDisplayMonthText = () => {
    if (selectedYear === 'all') return 'All Years';
    if (selectedMonth === 'all') return `${selectedYear} - All Months`;
    const date = new Date(selectedYear as number, selectedMonth as number, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth();
  const isSpecificMonth = selectedYear !== 'all' && selectedMonth !== 'all';

  const toggleExpand = (recordId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedRecordId(prev => prev === recordId ? null : recordId);
  };

  const handleViewChange = (view: ViewMode) => {
    setViewMode(view);
  };

  const handleDayPress = (day: CalendarDay) => {
    if (!day.isCurrentMonth || day.isFuture) return;
    setSelectedCalendarDay(day);
    setShowDayDetailModal(true);
  };

  const handleRequestOvertimeFromCalendar = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowOvertimeModal(true);
  };

  const renderTableRow = useCallback(({ item, index }: { item: AttendanceRecord; index: number }) => {
    const overtimeRequest = getOvertimeRequest(item.id);

    return (
      <SwipeableAttendanceRow
        item={item}
        index={index}
        isExpanded={expandedRecordId === item.id}
        overtimeRequest={overtimeRequest}
        onToggleExpand={() => toggleExpand(item.id)}
        onRequestOvertime={() => {
          setSelectedRecord(item);
          setShowOvertimeModal(true);
        }}
      />
    );
  }, [expandedRecordId, getOvertimeRequest]);

  const TableHeader = () => (
    <View style={styles.tableHeader} accessibilityRole="header">
      <View style={styles.tableCellDate}>
        <Text style={styles.tableHeaderText} accessibilityLabel="Date">Date</Text>
      </View>
      <View style={styles.tableCellTime}>
        <Text style={styles.tableHeaderText} accessibilityLabel="Check-in time">In</Text>
      </View>
      <View style={styles.tableCellTime}>
        <Text style={styles.tableHeaderText} accessibilityLabel="Check-out time">Out</Text>
      </View>
      <View style={styles.tableCellHours}>
        <Text style={styles.tableHeaderText} accessibilityLabel="Working hours">Hours</Text>
      </View>
      <View style={styles.tableCellOT}>
        <Text style={styles.tableHeaderText} accessibilityLabel="Overtime hours">OT</Text>
      </View>
      <View style={styles.expandIndicator} />
    </View>
  );

  const ListHeader = () => (
    <>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <Text style={styles.heroTitle}>{getDisplayMonthText()}</Text>
        <View style={styles.selectorWrapper}>
          <YearMonthSelector
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
            minYear={minYear}
            showAllOption={true}
          />
        </View>
      </LinearGradient>

      {/* View Toggle */}
      {isSpecificMonth && (
        <AttendanceViewToggle
          activeView={viewMode}
          onViewChange={handleViewChange}
          tableRecordsCount={records.length}
        />
      )}

      {/* Hours Progress Section - Only show for specific month in table view */}
      {isSpecificMonth && viewMode === 'table' && (
        <View style={styles.hoursProgressSection}>
          <WeeklyHoursChart
            records={records}
            expectedHoursPerDay={user?.daily_working_hours || 8}
            isLoading={isLoading}
          />
        </View>
      )}

      {/* Enhanced Stats Section */}
      <View style={styles.statsSection}>
        <EnhancedAttendanceStats
          totalWorkingHours={summary?.totalWorkingHours || 0}
          expectedDays={summary?.expectedWorkingDays || 0}
          attendedDays={summary?.daysAttended || 0}
          leavesTaken={summary?.approvedLeaveDays || 0}
          absentDays={summary?.absentDays || 0}
          overtimeHours={summary?.approvedOvertimeHours || 0}
          attendancePercentage={summary?.attendancePercentage}
          isLoading={isSummaryLoading}
          animate={true}
        />
      </View>

      {/* Calendar View */}
      {viewMode === 'calendar' && isSpecificMonth && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          <AttendanceCalendarView
            year={selectedYear as number}
            month={selectedMonth as number}
            records={records}
            leaves={leaveRequests?.filter(l => l.status === 'approved')}
            onDayPress={handleDayPress}
            isLoading={isLoading}
          />
        </Animated.View>
      )}

      {/* Download Report Section */}
      {viewMode === 'table' && (
        <View style={styles.modernSection}>
          <View style={styles.modernSectionHeader}>
            <Text style={styles.modernSectionTitle}>Monthly Report</Text>
          </View>

          <View style={styles.groupedList}>
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderLeft}>
                <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                <Text style={styles.reportTitle}>Attendance Report</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.reportContent}>
              <Text style={styles.reportHint}>
                {selectedYear === 'all' || selectedMonth === 'all'
                  ? 'Select a specific month to download the report'
                  : isCurrentMonth
                    ? `Download attendance report for ${getDisplayMonthText()} up to today`
                    : 'Download complete attendance report with salary details'
                }
              </Text>
              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  (!records || records.length === 0 || selectedYear === 'all' || selectedMonth === 'all') && styles.downloadButtonDisabled
                ]}
                onPress={handleDownloadReport}
                disabled={!records || records.length === 0 || downloading || selectedYear === 'all' || selectedMonth === 'all'}
                activeOpacity={0.7}
                accessibilityLabel={downloading ? "Downloading report" : "Download PDF attendance report"}
                accessibilityRole="button"
                accessibilityState={{ disabled: !records || records.length === 0 || downloading || selectedYear === 'all' || selectedMonth === 'all' }}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color={Colors.textInverse} />
                    <Text style={styles.downloadButtonText}>Download PDF Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Attendance Records Section - Table View Only */}
      {viewMode === 'table' && (
        <>
          <View style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Attendance Records</Text>
              <Text style={styles.recordsCount}>{records.length} records</Text>
            </View>
            <Text style={styles.swipeHint}>Swipe left on a row to request overtime</Text>
          </View>

          {/* Table Container with Header */}
          {records.length > 0 && (
            <View style={styles.tableContainer}>
              <TableHeader />
            </View>
          )}
        </>
      )}
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="calendar" size={64} color={Colors.gray300} />
      <Text style={styles.emptyText}>No attendance records for this period</Text>
      <Text style={styles.emptySubtext}>Records will appear here once you check in</Text>
    </View>
  );

  const ListFooter = () => (
    records.length > 0 && viewMode === 'table' ? <View style={styles.tableFooter} /> : null
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isLoading ? (
        <>
          <ListHeader />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.indigo} />
          </View>
        </>
      ) : viewMode === 'calendar' ? (
        // Calendar view: use ScrollView instead of FlatList
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.indigo]}
              tintColor={Colors.indigo}
            />
          }
        />
      ) : (
        <FlatList
          data={records}
          renderItem={renderTableRow}
          keyExtractor={item => item.id}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.tableRowSeparator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.indigo]}
              tintColor={Colors.indigo}
            />
          }
        />
      )}

      {/* Overtime Modal */}
      {selectedRecord && (
        <AddOvertimeModal
          visible={showOvertimeModal}
          onClose={() => {
            setShowOvertimeModal(false);
            setSelectedRecord(null);
          }}
          attendanceRecord={selectedRecord}
        />
      )}

      {/* Day Detail Modal */}
      <DayDetailModal
        visible={showDayDetailModal}
        onClose={() => {
          setShowDayDetailModal(false);
          setSelectedCalendarDay(null);
        }}
        day={selectedCalendarDay}
        overtimeRequest={selectedCalendarDay?.record ? getOvertimeRequest(selectedCalendarDay.record.id) : undefined}
        onRequestOvertime={handleRequestOvertimeFromCalendar}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    paddingTop: Spacing['5xl'],
    paddingBottom: Spacing['lg'],
    paddingHorizontal: Spacing['2xl'],
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    textAlign: 'center',
    marginBottom: Spacing['md'],
  },
  selectorWrapper: {
    marginTop: Spacing['xs'],
  },
  hoursProgressSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  statsSection: {
    paddingTop: Spacing['lg'],
    paddingBottom: Spacing['sm'],
  },
  modernSection: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['md'],
    gap: Spacing['md'],
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernSectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  listContent: {
    paddingBottom: 120,
  },
  recordsCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  swipeHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  // Table Styles
  tableContainer: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRowSeparator: {
    marginHorizontal: Spacing.xl,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  tableCellDate: {
    width: 65,
    paddingRight: 4,
  },
  tableCellTime: {
    flex: 1,
    alignItems: 'center',
  },
  tableCellHours: {
    flex: 1,
    alignItems: 'center',
  },
  tableCellOT: {
    width: 40,
    alignItems: 'center',
  },
  expandIndicator: {
    width: 16,
    alignItems: 'center',
  },
  tableFooter: {
    marginHorizontal: Spacing.xl,
    height: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'] + Spacing.lg,
    gap: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  groupedList: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  reportHeader: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reportTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  reportContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  reportHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['md'],
    paddingHorizontal: Spacing['lg'],
    borderRadius: BorderRadius.xl,
    gap: Spacing['sm'],
  },
  downloadButtonDisabled: {
    backgroundColor: Colors.gray300,
    opacity: 0.6,
  },
  downloadButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
});
