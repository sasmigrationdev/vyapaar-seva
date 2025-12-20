import { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAttendanceByDateRange } from '@/hooks/queries/useAttendance';
import { useMyOvertimeRequests } from '@/hooks/queries/useOvertimeRequests';
import { formatDate, formatTime, getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/utils/date.utils';
import { formatHours, getAttendanceStatus } from '@/lib/utils/attendance.utils';
import { downloadAttendanceReport } from '@/lib/utils/attendanceSheet.utils';
import { AttendanceRecord } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import AddOvertimeModal from '@/components/attendance/AddOvertimeModal';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const { success, error, info } = useAlert();
  const userId = user?.id || '';

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const startDate = getFirstDayOfMonth(selectedMonth).toISOString().split('T')[0];
  const endDate = getLastDayOfMonth(selectedMonth).toISOString().split('T')[0];

  const { data: records, isLoading, refetch } = useAttendanceByDateRange(userId, startDate, endDate);

  // Fetch overtime requests for the selected month
  const { data: overtimeRequests, refetch: refetchOvertimeRequests } = useMyOvertimeRequests(userId, {
    startDate,
    endDate,
  });

  // Helper to get overtime request for a specific attendance record
  const getOvertimeRequest = (attendanceRecordId: string) => {
    return overtimeRequests?.find(req => req.attendance_record_id === attendanceRecordId);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchOvertimeRequests()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!records || records.length === 0) {
      info('No Data', 'No attendance records available for this period');
      return;
    }

    try {
      setDownloading(true);

      // Get the current day of the selected month
      const today = new Date();
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      // If it's the current month, use today's date, otherwise use the last day of the month
      let endDay: number | undefined;
      if (month === today.getMonth() + 1 && year === today.getFullYear()) {
        endDay = today.getDate();
      }

      await downloadAttendanceReport(
        userId,
        month,
        year,
        endDay
      );
      success('Success', 'Attendance report downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      error('Error', 'Failed to generate attendance report');
    } finally {
      setDownloading(false);
    }
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => {
    const status = getAttendanceStatus(item);
    const statusColors = {
      Present: { bg: '#DCFCE7', color: '#10B981', icon: 'checkmark-circle' },
      Incomplete: { bg: '#FEF3C7', color: '#F59E0B', icon: 'time-outline' },
      Absent: { bg: '#FEE2E2', color: '#EF4444', icon: 'close-circle' },
    };
    const statusConfig = statusColors[status as keyof typeof statusColors] || statusColors.Present;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.dateIconWrapper, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon as any} size={24} color={statusConfig.color} />
            </View>
            <View>
              <Text style={styles.date}>{formatDate(new Date(item.date))}</Text>
              <Text style={styles.dateSubtext}>
                {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' })}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <View style={styles.timeCard}>
            <Ionicons name="log-in-outline" size={20} color="#10B981" />
            <View style={styles.timeCardContent}>
              <Text style={styles.timeLabel}>Check-in</Text>
              <Text style={styles.timeValue}>
                {item.check_in_time ? formatTime(new Date(item.check_in_time)) : '--:--'}
              </Text>
            </View>
          </View>

          <View style={styles.timeCard}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <View style={styles.timeCardContent}>
              <Text style={styles.timeLabel}>Check-out</Text>
              <Text style={styles.timeValue}>
                {item.check_out_time ? formatTime(new Date(item.check_out_time)) : '--:--'}
              </Text>
            </View>
          </View>

          <View style={styles.timeCard}>
            <Ionicons name="timer-outline" size={20} color="#6366F1" />
            <View style={styles.timeCardContent}>
              <Text style={styles.timeLabel}>Total Hours</Text>
              <Text style={[styles.timeValue, styles.hoursValue]}>
                {item.total_hours
                  ? formatHours(item.total_hours - (item.overtime_hours || 0))
                  : '--'}
              </Text>
              {(item.overtime_hours || 0) > 0 && (
                <Text style={styles.overtimeIndicator}>
                  +{formatHours(item.overtime_hours || 0)} OT
                </Text>
              )}
            </View>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <Feather name="file-text" size={16} color="#64748B" />
              <Text style={styles.notesLabel}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* Overtime Section - Only for completed records */}
        {item.check_in_time && item.check_out_time && (() => {
          const overtimeRequest = getOvertimeRequest(item.id);
          return (
            <View style={styles.overtimeSection}>
              {overtimeRequest?.status === 'pending' ? (
                <View style={styles.overtimePendingCard}>
                  <View style={styles.overtimePendingHeader}>
                    <View style={styles.pulseDotOrange} />
                    <Text style={styles.overtimePendingLabel}>Waiting for Approval</Text>
                  </View>
                  <View style={styles.overtimePendingContent}>
                    <MaterialCommunityIcons name="clock-plus-outline" size={20} color="#F59E0B" />
                    <View style={styles.overtimePendingInfo}>
                      <Text style={styles.overtimePendingHours}>
                        {formatHours(overtimeRequest.requested_hours)} requested
                      </Text>
                      {overtimeRequest.reason && (
                        <Text style={styles.overtimePendingReason}>{overtimeRequest.reason}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.overtimePendingFooter}>
                    <MaterialCommunityIcons name="shield-check-outline" size={14} color="#92400E" />
                    <Text style={styles.overtimePendingFooterText}>Awaiting HR review</Text>
                  </View>
                </View>
              ) : overtimeRequest?.status === 'rejected' ? (
                <View style={styles.overtimeRejectedCard}>
                  <View style={styles.overtimeRejectedHeader}>
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={styles.overtimeRejectedLabel}>Request Rejected</Text>
                  </View>
                  <View style={styles.overtimeRejectedContent}>
                    <Text style={styles.overtimeRejectedHours}>
                      {formatHours(overtimeRequest.requested_hours)} was requested
                    </Text>
                    {overtimeRequest.reviewer_notes && (
                      <Text style={styles.overtimeRejectedReason}>
                        Note: {overtimeRequest.reviewer_notes}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (item.overtime_hours || 0) > 0 ? (
                <View style={styles.overtimeDisplayCard}>
                  <View style={styles.overtimeHeader}>
                    <MaterialCommunityIcons name="clock-plus-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.overtimeLabel}>Overtime</Text>
                  </View>
                  <Text style={styles.overtimeValue}>{formatHours(item.overtime_hours || 0)}</Text>
                  {item.overtime_reason && (
                    <Text style={styles.overtimeReason}>{item.overtime_reason}</Text>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addOvertimeButton}
                  onPress={() => {
                    setSelectedRecord(item);
                    setShowOvertimeModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="clock-plus-outline" size={16} color="#8B5CF6" />
                  <Text style={styles.addOvertimeText}>Add Overtime</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </View>
    );
  };

  const previousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    const now = new Date();
    if (selectedMonth.getMonth() < now.getMonth() || selectedMonth.getFullYear() < now.getFullYear()) {
      setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
    }
  };

  const isCurrentMonth =
    selectedMonth.getMonth() === new Date().getMonth() &&
    selectedMonth.getFullYear() === new Date().getFullYear();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <View style={styles.monthSelector}>
          <TouchableOpacity
            onPress={previousMonth}
            style={styles.monthButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textInverse} />
          </TouchableOpacity>

          <View style={styles.monthTextContainer}>
            <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.textInverse} />
            <Text style={styles.monthText}>
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
              size={24}
              color={isCurrentMonth ? 'rgba(255,255,255,0.4)' : Colors.textInverse}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
              {isCurrentMonth 
                ? `Download attendance report for ${selectedMonth.toLocaleDateString('en-US', { month: 'long' })} up to today`
                : 'Download complete attendance report with salary details'
              }
            </Text>
            <TouchableOpacity
              style={[
                styles.downloadButton,
                (!records || records.length === 0) && styles.downloadButtonDisabled
              ]}
              onPress={handleDownloadReport}
              disabled={!records || records.length === 0 || downloading}
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : records && records.length > 0 ? (
        <FlatList
          data={records}
          renderItem={renderAttendanceItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Feather name="calendar" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No attendance records for this month</Text>
          <Text style={styles.emptySubtext}>Records will appear here once you check in</Text>
        </View>
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
    paddingBottom: Spacing['xl'],
    paddingHorizontal: Spacing['2xl'],
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing['lg'],
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonDisabled: {
    opacity: 0.5,
  },
  monthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['sm'],
  },
  monthText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  modernSection: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['lg'],
    gap: Spacing['md'],
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernSectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  listContent: {
    padding: Spacing['2xl'],
    paddingBottom: 120,
  },
  card: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing['lg'],
    marginBottom: Spacing['lg'],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dateIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  date: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeContainer: {
    gap: 12,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  timeCardContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  hoursValue: {
    color: '#6366F1',
  },
  overtimeIndicator: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
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
  downloadNote: {
    fontSize: Typography.fontSize.xs,
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: Spacing['sm'],
    fontStyle: 'italic',
  },
  // Overtime styles
  overtimeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  overtimeDisplayCard: {
    backgroundColor: '#FAF5FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  overtimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  overtimeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overtimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B21A8',
    marginBottom: 4,
  },
  overtimeReason: {
    fontSize: 14,
    color: '#7C3AED',
    marginBottom: 8,
  },
  addOvertimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  addOvertimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  // Overtime Pending Styles
  overtimePendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    overflow: 'hidden',
  },
  overtimePendingHeader: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  pulseDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  overtimePendingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overtimePendingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  overtimePendingInfo: {
    flex: 1,
  },
  overtimePendingHours: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  overtimePendingReason: {
    fontSize: 13,
    color: '#B45309',
    marginTop: 4,
  },
  overtimePendingFooter: {
    backgroundColor: '#FDE68A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  overtimePendingFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  // Overtime Rejected Styles
  overtimeRejectedCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    overflow: 'hidden',
  },
  overtimeRejectedHeader: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  overtimeRejectedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overtimeRejectedContent: {
    padding: 12,
  },
  overtimeRejectedHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  overtimeRejectedReason: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
