import { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAttendanceByYearMonth, useFirstAttendanceDate } from '@/hooks/queries/useAttendance';
import { useUserAttendanceSummary } from '@/hooks/queries/useAttendanceSummary';
import { useMyOvertimeRequests } from '@/hooks/queries/useOvertimeRequests';
import { formatTime } from '@/lib/utils/date.utils';
import { formatHours } from '@/lib/utils/attendance.utils';
import { downloadAttendanceReport } from '@/lib/utils/attendanceSheet.utils';
import { AttendanceRecord, YearFilter, MonthFilter } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import AddOvertimeModal from '@/components/attendance/AddOvertimeModal';
import YearMonthSelector from '@/components/ui/YearMonthSelector';
import EnhancedAttendanceStats from '@/components/attendance/EnhancedAttendanceStats';

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

  // Calculate date range for overtime requests
  const dateRange = useMemo(() => {
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
  const { data: overtimeRequests, refetch: refetchOvertimeRequests } = useMyOvertimeRequests(userId, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Helper to get overtime request for a specific attendance record
  const getOvertimeRequest = (attendanceRecordId: string) => {
    return overtimeRequests?.find(req => req.attendance_record_id === attendanceRecordId);
  };

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

  const toggleExpand = (recordId: string) => {
    setExpandedRecordId(prev => prev === recordId ? null : recordId);
  };

  const renderTableRow = ({ item }: { item: AttendanceRecord }) => {
    const isExpanded = expandedRecordId === item.id;
    const overtimeRequest = getOvertimeRequest(item.id);

    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });

    const hasOvertimeContent = (item.overtime_hours || 0) > 0 || overtimeRequest;
    const hasExpandableContent = item.notes || hasOvertimeContent || (item.check_in_time && item.check_out_time);

    return (
      <View style={styles.tableRowWrapper}>
        <TouchableOpacity
          style={[styles.tableRow, isExpanded && styles.tableRowExpanded]}
          onPress={() => hasExpandableContent && toggleExpand(item.id)}
          activeOpacity={hasExpandableContent ? 0.7 : 1}
        >
          {/* Date */}
          <View style={styles.tableCellDate}>
            <Text style={styles.tableCellDateText}>{dateStr}</Text>
            <Text style={styles.tableCellWeekday}>{weekday}</Text>
          </View>

          {/* Check-in */}
          <View style={styles.tableCellTime}>
            <Text style={styles.tableCellTimeText}>
              {item.check_in_time ? formatTime(new Date(item.check_in_time)) : '--:--'}
            </Text>
          </View>

          {/* Check-out */}
          <View style={styles.tableCellTime}>
            <Text style={styles.tableCellTimeText}>
              {item.check_out_time ? formatTime(new Date(item.check_out_time)) : '--:--'}
            </Text>
          </View>

          {/* Hours */}
          <View style={styles.tableCellHours}>
            <Text style={styles.tableCellHoursText}>
              {item.total_hours
                ? formatHours(item.total_hours - (item.overtime_hours || 0))
                : '--'}
            </Text>
          </View>

          {/* OT */}
          <View style={styles.tableCellOT}>
            {(item.overtime_hours || 0) > 0 ? (
              <Text style={styles.tableCellOTText}>{formatHours(item.overtime_hours || 0)}</Text>
            ) : overtimeRequest?.status === 'pending' ? (
              <View style={styles.otPendingDot} />
            ) : item.check_in_time && item.check_out_time && !overtimeRequest ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedRecord(item);
                  setShowOvertimeModal(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#8B5CF6" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.tableCellOTEmpty}>--</Text>
            )}
          </View>

          {/* Expand indicator */}
          {hasExpandableContent && (
            <View style={styles.expandIndicator}>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#94A3B8"
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Notes Section */}
            {item.notes && (
              <View style={styles.expandedSection}>
                <View style={styles.expandedSectionHeader}>
                  <Feather name="file-text" size={14} color="#64748B" />
                  <Text style={styles.expandedSectionLabel}>Notes</Text>
                </View>
                <Text style={styles.expandedNotesText}>{item.notes}</Text>
              </View>
            )}

            {/* Overtime Section */}
            {item.check_in_time && item.check_out_time && (() => {
              if (overtimeRequest?.status === 'pending') {
                return (
                  <View style={styles.expandedOvertimePending}>
                    <View style={styles.expandedOvertimeHeader}>
                      <View style={styles.pulseDotOrange} />
                      <Text style={styles.expandedOvertimePendingLabel}>Waiting for Approval</Text>
                    </View>
                    <View style={styles.expandedOvertimeRow}>
                      <MaterialCommunityIcons name="clock-plus-outline" size={16} color="#F59E0B" />
                      <Text style={styles.expandedOvertimePendingHours}>
                        {formatHours(overtimeRequest.requested_hours)} requested
                      </Text>
                    </View>
                    {overtimeRequest.reason && (
                      <Text style={styles.expandedOvertimeReason}>{overtimeRequest.reason}</Text>
                    )}
                  </View>
                );
              }

              if (overtimeRequest?.status === 'rejected') {
                return (
                  <View style={styles.expandedOvertimeRejected}>
                    <View style={styles.expandedOvertimeHeader}>
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                      <Text style={styles.expandedOvertimeRejectedLabel}>Request Rejected</Text>
                    </View>
                    <Text style={styles.expandedOvertimeRejectedHours}>
                      {formatHours(overtimeRequest.requested_hours)} was requested
                    </Text>
                    {overtimeRequest.reviewer_notes && (
                      <Text style={styles.expandedOvertimeRejectedNote}>
                        Note: {overtimeRequest.reviewer_notes}
                      </Text>
                    )}
                  </View>
                );
              }

              if ((item.overtime_hours || 0) > 0) {
                return (
                  <View style={styles.expandedOvertimeApproved}>
                    <View style={styles.expandedOvertimeHeader}>
                      <MaterialCommunityIcons name="clock-plus-outline" size={14} color="#8B5CF6" />
                      <Text style={styles.expandedOvertimeApprovedLabel}>Overtime Approved</Text>
                    </View>
                    <Text style={styles.expandedOvertimeApprovedHours}>
                      {formatHours(item.overtime_hours || 0)}
                    </Text>
                    {item.overtime_reason && (
                      <Text style={styles.expandedOvertimeApprovedReason}>{item.overtime_reason}</Text>
                    )}
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  style={styles.expandedAddOvertimeButton}
                  onPress={() => {
                    setSelectedRecord(item);
                    setShowOvertimeModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="clock-plus-outline" size={16} color="#8B5CF6" />
                  <Text style={styles.expandedAddOvertimeText}>Request Overtime</Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableCellDate}>
        <Text style={styles.tableHeaderText}>Date</Text>
      </View>
      <View style={styles.tableCellTime}>
        <Text style={styles.tableHeaderText}>In</Text>
      </View>
      <View style={styles.tableCellTime}>
        <Text style={styles.tableHeaderText}>Out</Text>
      </View>
      <View style={styles.tableCellHours}>
        <Text style={styles.tableHeaderText}>Hours</Text>
      </View>
      <View style={styles.tableCellOT}>
        <Text style={styles.tableHeaderText}>OT</Text>
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
        />
      </View>

      {/* Download Report Section */}
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
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.downloadButtonText}>Download PDF Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Attendance Records Section */}
      <View style={styles.modernSection}>
        <View style={styles.modernSectionHeader}>
          <Text style={styles.modernSectionTitle}>Attendance Records</Text>
          <Text style={styles.recordsCount}>{records.length} records</Text>
        </View>
      </View>

      {/* Table Container with Header */}
      {records.length > 0 && (
        <View style={styles.tableContainer}>
          <TableHeader />
        </View>
      )}
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="calendar" size={64} color="#CBD5E1" />
      <Text style={styles.emptyText}>No attendance records for this period</Text>
      <Text style={styles.emptySubtext}>Records will appear here once you check in</Text>
    </View>
  );

  const ListFooter = () => (
    records.length > 0 ? <View style={styles.tableFooter} /> : null
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isLoading ? (
        <>
          <ListHeader />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        </>
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
              colors={['#6366F1']}
              tintColor="#6366F1"
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
    </View>
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
  // Table Styles
  tableContainer: {
    marginHorizontal: Spacing.lg,
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
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRowWrapper: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundSecondary,
  },
  tableRowExpanded: {
    backgroundColor: '#F8FAFC',
  },
  tableRowSeparator: {
    marginHorizontal: Spacing.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  tableCellDate: {
    width: 65,
    paddingRight: 4,
  },
  tableCellDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  tableCellWeekday: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  tableCellTime: {
    flex: 1,
    alignItems: 'center',
  },
  tableCellTimeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
  },
  tableCellHours: {
    flex: 1,
    alignItems: 'center',
  },
  tableCellHoursText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  tableCellOT: {
    width: 40,
    alignItems: 'center',
  },
  tableCellOTText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  tableCellOTEmpty: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  otPendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  expandIndicator: {
    width: 16,
    alignItems: 'center',
  },
  tableFooter: {
    marginHorizontal: Spacing.lg,
    height: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  expandedSection: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  expandedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  expandedSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedNotesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  // Expanded Overtime Styles
  expandedOvertimePending: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  expandedOvertimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  expandedOvertimePendingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedOvertimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedOvertimePendingHours: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  expandedOvertimeReason: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 4,
  },
  expandedOvertimeRejected: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  expandedOvertimeRejectedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedOvertimeRejectedHours: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  expandedOvertimeRejectedNote: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 4,
    fontStyle: 'italic',
  },
  expandedOvertimeApproved: {
    backgroundColor: '#FAF5FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  expandedOvertimeApprovedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedOvertimeApprovedHours: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B21A8',
    marginTop: 2,
  },
  expandedOvertimeApprovedReason: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 4,
  },
  expandedAddOvertimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#FAF5FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  expandedAddOvertimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
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
    padding: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
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
