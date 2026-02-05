import { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useBreaksByMonth,
  useBreakSummaryByMonth,
} from '@/hooks/queries/useBreakRequests';
import { useAuth } from '@/hooks/auth/useAuth';
import { BreakRequest } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils/date.utils';
import { Text } from '@/components/ui/Text';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Typography, Shadows, StatusColors } from '@/constants/theme';

export default function EmployeeBreaksScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  // Queries
  const {
    data: breaks,
    isLoading,
    refetch,
    isFetching,
  } = useBreaksByMonth(user?.id || '', currentMonth, currentYear);

  const { data: summary } = useBreakSummaryByMonth(
    user?.id || '',
    currentMonth,
    currentYear
  );

  // Group breaks by date
  const breaksByDate = useMemo(() => {
    if (!breaks) return {};

    const grouped: Record<string, BreakRequest[]> = {};

    breaks.forEach((br) => {
      const date = br.request_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(br);
    });

    return grouped;
  }, [breaks]);

  // Date picker handlers
  const handleMonthChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowMonthPicker(false);
  };

  const handlePreviousMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
    );
  };

  const renderBreakCard = (item: BreakRequest) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending':
          return Colors.warning;
        case 'approved':
          return Colors.success;
        case 'rejected':
          return Colors.error;
        default:
          return Colors.gray500;
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'pending':
          return 'clock-outline';
        case 'approved':
          return 'checkmark-circle';
        case 'rejected':
          return 'close-circle';
        default:
          return 'help-circle-outline';
      }
    };

    const hours = item.duration_minutes
      ? Math.floor(item.duration_minutes / 60)
      : 0;
    const minutes = item.duration_minutes ? Math.round(item.duration_minutes % 60) : 0;

    return (
      <View key={item.id} style={styles.breakCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.timeContainer}>
            <MaterialCommunityIcons name="coffee" size={20} color={Colors.indigo} />
            <Text style={styles.timeText}>
              {item.approved_start_time
                ? formatTime(new Date(item.approved_start_time))
                : item.requested_start_time
                ? formatTime(new Date(item.requested_start_time))
                : 'N/A'}{' '}
              -{' '}
              {item.approved_end_time
                ? formatTime(new Date(item.approved_end_time))
                : item.requested_end_time
                ? formatTime(new Date(item.requested_end_time))
                : 'N/A'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(item.status)}15` },
            ]}
          >
            <Ionicons
              name={getStatusIcon(item.status) as any}
              size={14}
              color={getStatusColor(item.status)}
            />
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Duration */}
        {item.duration_minutes !== null && item.status === 'completed' && (
          <View style={styles.durationRow}>
            <Ionicons name="timer-outline" size={16} color={Colors.gray500} />
            <Text style={styles.durationText}>
              Duration: {hours > 0 && `${hours}h `}
              {minutes}m
            </Text>
          </View>
        )}

        {/* Reason */}
        {item.reason && (
          <View style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        )}

        {/* Notes */}
        {item.notes && item.status === 'completed' && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>HR Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* Reviewer Notes (for rejected) */}
        {item.reviewer_notes && item.status === 'rejected' && (
          <View style={styles.rejectedSection}>
            <Text style={styles.rejectedLabel}>Rejection Reason:</Text>
            <Text style={styles.rejectedText}>{item.reviewer_notes}</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen
          options={{
            title: 'My Breaks',
            headerShown: false,
          }}
        />
        <ActivityIndicator size="large" color={Colors.indigo} />
        <Text style={styles.loadingText}>Loading your breaks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Breaks',
          headerShown: false,
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Breaks</Text>
        <Text style={styles.headerSubtitle}>
          View your break history and status
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={Colors.indigo}
            colors={[Colors.indigo]}
          />
        }
        showsVerticalScrollIndicator={false}
      >

      {/* Month Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.indigo} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateDisplay}
          onPress={() => setShowMonthPicker(true)}
        >
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.indigo} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={Colors.indigo} />
        </TouchableOpacity>
      </View>

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <Modal
          visible={showMonthPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMonthPicker(false)}
          >
            <View style={styles.monthPickerModal}>
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.monthPickerHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDate(
                        new Date(selectedDate.getFullYear() - 1, selectedDate.getMonth(), 1)
                      );
                    }}
                    style={styles.yearButton}
                  >
                    <Ionicons name="chevron-back" size={20} color={Colors.indigo} />
                  </TouchableOpacity>

                  <Text style={styles.monthPickerYear}>{selectedDate.getFullYear()}</Text>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDate(
                        new Date(selectedDate.getFullYear() + 1, selectedDate.getMonth(), 1)
                      );
                    }}
                    style={styles.yearButton}
                  >
                    <Ionicons name="chevron-forward" size={20} color={Colors.indigo} />
                  </TouchableOpacity>
                </View>

                <View style={styles.monthsGrid}>
                  {[
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ].map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.monthButton,
                        selectedDate.getMonth() === index && styles.monthButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedDate(
                          new Date(selectedDate.getFullYear(), index, 1)
                        );
                        setShowMonthPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.monthButtonText,
                          selectedDate.getMonth() === index &&
                            styles.monthButtonTextActive,
                        ]}
                      >
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Summary Statistics */}
      {summary && (
        <View style={styles.summarySection}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="coffee" size={18} color={Colors.indigo} />
              <Text style={styles.infoValue}>{summary.totalBreaks}</Text>
              <Text style={styles.infoLabel}>Total Breaks</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="timer-outline" size={18} color={Colors.info} />
              <Text style={[styles.infoValue, { color: Colors.info }]}>
                {Math.floor(summary.totalBreakMinutes / 60)}h{' '}
                {Math.round(summary.totalBreakMinutes % 60)}m
              </Text>
              <Text style={styles.infoLabel}>Total Time</Text>
            </View>
          </View>
        </View>
      )}

      {/* Breaks List */}
      {Object.keys(breaksByDate).length > 0 ? (
        Object.keys(breaksByDate)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .map((date, dateIndex) => (
            <Animated.View
              key={date}
              style={styles.dateSection}
              entering={FadeInDown.delay(100 + dateIndex * 100).springify()}
            >
              <View style={styles.dateSectionHeader}>
                <Ionicons name="calendar" size={16} color={Colors.indigo} />
                <Text style={styles.dateSectionTitle}>
                  {formatDate(new Date(date))}
                </Text>
                <View style={styles.dateCountBadge}>
                  <Text style={styles.dateCountText}>
                    {breaksByDate[date].length}{' '}
                    {breaksByDate[date].length === 1 ? 'break' : 'breaks'}
                  </Text>
                </View>
              </View>
              {breaksByDate[date].map((br) => renderBreakCard(br))}
            </Animated.View>
          ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="coffee-off-outline"
            size={64}
            color={Colors.gray300}
          />
          <Text style={styles.emptyTitle}>No breaks this month</Text>
          <Text style={styles.emptySubtitle}>
            You haven't taken any breaks this month yet
          </Text>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    paddingTop: Spacing['6xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  navButton: {
    padding: 8,
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },
  summarySection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  dateSection: {
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateSectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  dateCountBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
  },
  dateCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  breakCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  timeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm + 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  durationText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reasonSection: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: StatusColors.pending.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: StatusColors.pending.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  reasonText: {
    fontSize: Typography.fontSize.xs,
    color: StatusColors.pending.text,
    lineHeight: 16,
  },
  notesSection: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rejectedSection: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: StatusColors.rejected.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: StatusColors.rejected.border,
  },
  rejectedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: StatusColors.rejected.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  rejectedText: {
    fontSize: Typography.fontSize.xs,
    color: StatusColors.rejected.text,
    lineHeight: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'] * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPickerModal: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 400,
    ...Shadows.lg,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthPickerYear: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  yearButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  monthButton: {
    width: '30%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  monthButtonActive: {
    backgroundColor: Colors.indigo,
    borderColor: Colors.indigo,
  },
  monthButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  monthButtonTextActive: {
    color: Colors.textInverse,
  },
});
