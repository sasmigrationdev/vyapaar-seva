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
          return '#F59E0B';
        case 'approved':
          return '#10B981';
        case 'rejected':
          return '#EF4444';
        default:
          return '#64748B';
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
            <MaterialCommunityIcons name="coffee" size={20} color="#6366F1" />
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
            <Ionicons name="timer-outline" size={16} color="#64748B" />
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
        <ActivityIndicator size="large" color="#6366F1" />
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
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        showsVerticalScrollIndicator={false}
      >

      {/* Month Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#6366F1" />
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
          <Ionicons name="chevron-down" size={16} color="#6366F1" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#6366F1" />
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
                    <Ionicons name="chevron-back" size={20} color="#6366F1" />
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
                    <Ionicons name="chevron-forward" size={20} color="#6366F1" />
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
              <MaterialCommunityIcons name="coffee" size={18} color="#6366F1" />
              <Text style={styles.infoValue}>{summary.totalBreaks}</Text>
              <Text style={styles.infoLabel}>Total Breaks</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="timer-outline" size={18} color="#3B82F6" />
              <Text style={[styles.infoValue, { color: '#3B82F6' }]}>
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
          .map((date) => (
            <View key={date} style={styles.dateSection}>
              <View style={styles.dateSectionHeader}>
                <Ionicons name="calendar" size={16} color="#6366F1" />
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
            </View>
          ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="coffee-off-outline"
            size={64}
            color="#CBD5E1"
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
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summarySection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  dateSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  dateCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  dateCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  breakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  reasonSection: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78350F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  notesSection: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  rejectedSection: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rejectedText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthPickerYear: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  yearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  monthButton: {
    width: '30%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  monthButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
  },
});
