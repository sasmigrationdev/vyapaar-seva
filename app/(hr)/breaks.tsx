import { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Text } from '@/components/ui/Text';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useAllBreaksByMonth,
  useBreaksByDate,
} from '@/hooks/queries/useBreakRequests';
import { useRemoveBreak } from '@/hooks/mutations/useBreakRequestMutations';
import { useAllUsers } from '@/hooks/queries/useUser';
import { useAuth } from '@/hooks/auth/useAuth';
import { BreakRequest } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils/date.utils';
import AddBreakForEmployeeModal from '@/components/attendance/AddBreakForEmployeeModal';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function HRBreaksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, confirmDestructive } = useAlert();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<'month' | 'date'>('month');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const dateString = selectedDate.toISOString().split('T')[0];

  // Employee list query - only fetch employees, not HR or admin
  const { data: employees } = useAllUsers({
    role: 'employee',
    organizationId: user?.organization_id || '',
  });

  // Queries
  const {
    data: monthBreaks,
    isLoading: isMonthLoading,
    refetch: refetchMonth,
    isFetching: isMonthFetching,
  } = useAllBreaksByMonth(currentMonth, currentYear, user?.organization_id || '', {
    enabled: dateFilterMode === 'month' && !!user?.organization_id,
  } as any);

  const {
    data: dateBreaks,
    isLoading: isDateLoading,
    refetch: refetchDate,
    isFetching: isDateFetching,
  } = useBreaksByDate(dateString, user?.organization_id || '', {
    enabled: dateFilterMode === 'date' && !!user?.organization_id,
  } as any);

  // Mutations
  const removeBreakMutation = useRemoveBreak(user?.id || '', {
    onSuccess: () => {
      success('Success', 'Break removed successfully');
      if (dateFilterMode === 'month') {
        refetchMonth();
      } else {
        refetchDate();
      }
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to remove break');
    },
  });

  // Filter breaks by selected employee and sort by latest first
  const allBreaks = dateFilterMode === 'month' ? monthBreaks : dateBreaks;
  const breaks = useMemo(() => {
    if (!allBreaks) return allBreaks;
    let filtered = selectedEmployeeId === 'all'
      ? allBreaks
      : allBreaks.filter((br: any) => br.user_id === selectedEmployeeId);

    // Sort by created_at descending (latest first)
    return filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.request_date).getTime();
      const dateB = new Date(b.created_at || b.request_date).getTime();
      return dateB - dateA;
    });
  }, [allBreaks, selectedEmployeeId]);

  const isLoading = dateFilterMode === 'month' ? isMonthLoading : isDateLoading;
  const isFetching =
    dateFilterMode === 'month' ? isMonthFetching : isDateFetching;
  const refetch = dateFilterMode === 'month' ? refetchMonth : refetchDate;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!breaks) return null;

    const totalBreaks = breaks.length;
    const totalMinutes = breaks
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.duration_minutes || 0), 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    return {
      totalBreaks,
      totalMinutes,
      hours,
      minutes,
    };
  }, [breaks]);

  // Date picker handlers
  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowDatePicker(false);
  };

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

  const handleClearDateFilter = () => {
    setDateFilterMode('month');
    setSelectedDate(new Date());
  };

  const handleRemoveBreak = (breakRequest: BreakRequest) => {
    confirmDestructive(
      'Remove Break',
      'Are you sure you want to remove this break? This action cannot be undone.',
      () => {
        removeBreakMutation.mutate({
          breakRequestId: breakRequest.id,
          userId: breakRequest.user_id,
          requestDate: breakRequest.request_date,
        });
      },
      undefined,
      'Remove'
    );
  };

  const renderBreakCard = (item: BreakRequest & {
    user?: { full_name: string; employee_id: string };
  }, index: number, array: any[]) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending_start':
          return '#F59E0B';
        case 'active':
          return '#3B82F6';
        case 'completed':
          return '#10B981';
        case 'rejected':
          return '#EF4444';
        case 'cancelled':
          return '#64748B';
        default:
          return '#64748B';
      }
    };

    const hours = item.duration_minutes
      ? Math.floor(item.duration_minutes / 60)
      : 0;
    const minutes = item.duration_minutes ? Math.round(item.duration_minutes % 60) : 0;

    return (
      <View
        key={item.id}
        style={[
          styles.breakListItem,
          index === array.length - 1 && styles.listItemLast
        ]}
      >
        <View style={styles.breakListHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.employeeAvatar}>
              <Ionicons name="person" size={16} color={Colors.primary} />
            </View>
            <View style={styles.employeeDetails}>
              <Text style={styles.employeeName}>
                {item.user?.full_name || 'Unknown'}
              </Text>
              <Text style={styles.employeeId}>
                ID: {item.user?.employee_id || 'N/A'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(item.status)}15` },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status === 'pending_start' ? 'Pending' :
               item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.breakDetailsGrid}>
          <View style={styles.breakDetailItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.breakDetailLabel}>Date</Text>
            <Text style={styles.breakDetailValue}>
              {formatDate(new Date(item.request_date))}
            </Text>
          </View>

          {item.actual_start_time && (
            <View style={styles.breakDetailItem}>
              <MaterialCommunityIcons name="coffee" size={14} color={Colors.textSecondary} />
              <Text style={styles.breakDetailLabel}>Time</Text>
              <Text style={styles.breakDetailValue}>
                {formatTime(new Date(item.actual_start_time))}
                {item.actual_end_time ? ` - ${formatTime(new Date(item.actual_end_time))}` : ' (Ongoing)'}
              </Text>
            </View>
          )}

          {item.actual_start_time && item.actual_end_time && item.duration_minutes != null && (
            <View style={styles.breakDetailItem}>
              <Ionicons name="timer-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.breakDetailLabel}>Duration</Text>
              <Text style={styles.breakDetailValue}>
                {hours > 0 && `${hours}h `}{minutes}m
              </Text>
            </View>
          )}
        </View>

        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {item.status === 'completed' && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveBreak(item)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen
          options={{
            title: 'Breaks Management',
            headerShown: false,
          }}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading breaks...</Text>
      </View>
    );
  }

  const selectedEmployee = employees?.find((emp) => emp.id === selectedEmployeeId);

  // Calculate pending approvals count
  const pendingApprovalsCount = breaks?.filter((b: any) => b.status === 'pending_start').length || 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Breaks',
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerShadowVisible: false,
        }}
      />
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats ? stats.totalBreaks : '0'}</Text>
            <Text style={styles.statText}>
              {dateFilterMode === 'month' ? 'This Month' : 'Today'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingApprovalsCount}</Text>
            <Text style={styles.statText}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {stats ? `${stats.hours}h ${stats.minutes}m` : '0h 0m'}
            </Text>
            <Text style={styles.statText}>Duration</Text>
          </View>
        </View>

        {/* Filter Mode Toggle */}
      <View style={styles.filterModeSection}>
        <View style={styles.filterModeContainer}>
          <TouchableOpacity
            style={[
              styles.filterModeButton,
              dateFilterMode === 'month' && styles.filterModeButtonActive,
            ]}
            onPress={() => {
              setDateFilterMode('month');
              setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
            }}
          >
            <MaterialCommunityIcons
              name="calendar-month"
              size={18}
              color={dateFilterMode === 'month' ? Colors.textInverse : Colors.textSecondary}
            />
            <Text
              style={[
                styles.filterModeText,
                dateFilterMode === 'month' && styles.filterModeTextActive,
              ]}
            >
              Month View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterModeButton,
              dateFilterMode === 'date' && styles.filterModeButtonActive,
            ]}
            onPress={() => setDateFilterMode('date')}
          >
            <MaterialCommunityIcons
              name="calendar-today"
              size={18}
              color={dateFilterMode === 'date' ? Colors.textInverse : Colors.textSecondary}
            />
            <Text
              style={[
                styles.filterModeText,
                dateFilterMode === 'date' && styles.filterModeTextActive,
              ]}
            >
              Date View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Employee Filter */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.employeeFilter}
          onPress={() => setShowEmployeePicker(!showEmployeePicker)}
        >
          <View style={styles.employeeFilterContent}>
            <Ionicons name="people" size={18} color={Colors.primary} />
            <Text style={styles.employeeFilterText}>
              {selectedEmployeeId === 'all'
                ? 'All Employees'
                : selectedEmployee?.full_name || 'Unknown'}
            </Text>
          </View>
          <Ionicons
            name={showEmployeePicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Employee Picker Dropdown */}
      {showEmployeePicker && (
        <View style={styles.employeePickerWrapper}>
          <View style={styles.employeePickerDropdown}>
          <TouchableOpacity
            style={[
              styles.employeePickerItem,
              selectedEmployeeId === 'all' && styles.employeePickerItemActive,
            ]}
            onPress={() => {
              setSelectedEmployeeId('all');
              setShowEmployeePicker(false);
            }}
          >
            <Ionicons
              name="people"
              size={18}
              color={selectedEmployeeId === 'all' ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.employeePickerItemText,
                selectedEmployeeId === 'all' && styles.employeePickerItemTextActive,
              ]}
            >
              All Employees
            </Text>
            {selectedEmployeeId === 'all' && (
              <Ionicons name="checkmark" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>

          <ScrollView style={styles.employeePickerScroll} nestedScrollEnabled>
            {employees?.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.employeePickerItem,
                  selectedEmployeeId === emp.id && styles.employeePickerItemActive,
                ]}
                onPress={() => {
                  setSelectedEmployeeId(emp.id);
                  setShowEmployeePicker(false);
                }}
              >
                <View style={styles.employeePickerAvatar}>
                  <Ionicons name="person" size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.employeePickerItemText,
                      selectedEmployeeId === emp.id &&
                        styles.employeePickerItemTextActive,
                    ]}
                  >
                    {emp.full_name}
                  </Text>
                  <Text style={styles.employeePickerItemSubtext}>
                    ID: {emp.employee_id}
                  </Text>
                </View>
                {selectedEmployeeId === emp.id && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
        </View>
      )}

      {/* Date Navigation */}
      {dateFilterMode === 'month' ? (
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
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
            <Ionicons name="chevron-down" size={16} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.dateNavigation}>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.datePickerText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={handleClearDateFilter}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

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
                    <Ionicons name="chevron-back" size={20} color={Colors.primary} />
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
                    <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
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

        {/* Add Break Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAssignModal(true)}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.textInverse} />
            <Text style={styles.addButtonText}>Add Break</Text>
          </TouchableOpacity>
        </View>

        {/* Breaks List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Break Records</Text>
          {breaks && breaks.length > 0 ? (
            <View style={styles.listContainer}>
              {breaks.map((item: any, index: number) => renderBreakCard(item, index, breaks))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="coffee-off-outline"
                size={48}
                color={Colors.gray300}
              />
              <Text style={styles.emptyTitle}>No breaks found</Text>
              <Text style={styles.emptySubtitle}>
                {dateFilterMode === 'month'
                  ? 'No breaks recorded for this month'
                  : 'No breaks recorded for this date'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing['md'],
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    gap: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['xl'],
    backgroundColor: Colors.background,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing['xs'],
  },
  statNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  section: {
    gap: Spacing['md'],
    paddingHorizontal: Spacing['lg'],
    paddingVertical: Spacing['md'],
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['md'],
    borderRadius: BorderRadius.lg,
    gap: Spacing['sm'],
  },
  addButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  listContainer: {
    gap: Spacing['md'],
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing['sm'],
    paddingVertical: Spacing['4xl'],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  topControls: {
    paddingHorizontal: Spacing['lg'],
    paddingVertical: Spacing['md'],
    marginHorizontal: Spacing['lg'],
    marginBottom: Spacing['md'],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
  },
  employeeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    paddingVertical: Spacing['md'],
    paddingHorizontal: Spacing['lg'],
    borderRadius: BorderRadius.lg,
  },
  employeeFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['sm'],
    flex: 1,
  },
  employeeFilterText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  employeePickerWrapper: {
    paddingHorizontal: Spacing['lg'],
    marginBottom: Spacing['md'],
  },
  employeePickerDropdown: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    maxHeight: 300,
    overflow: 'hidden',
  },
  employeePickerScroll: {
    maxHeight: 250,
  },
  employeePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['lg'],
    gap: Spacing['md'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  employeePickerItemActive: {
    backgroundColor: Colors.primaryLight + '20',
  },
  employeePickerAvatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeePickerItemText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  employeePickerItemTextActive: {
    color: Colors.primary,
  },
  employeePickerItemSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterModeSection: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing['lg'],
    paddingVertical: Spacing['md'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterModeContainer: {
    flexDirection: 'row',
    gap: Spacing['sm'],
  },
  filterModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['xs'],
    paddingVertical: Spacing['sm'],
    paddingHorizontal: Spacing['md'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterModeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterModeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterModeTextActive: {
    color: Colors.textInverse,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['md'],
    paddingHorizontal: Spacing['lg'],
    marginHorizontal: Spacing['lg'],
    marginVertical: Spacing['md'],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
  },
  navButton: {
    padding: Spacing['xs'],
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['xs'],
  },
  dateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['sm'],
    paddingVertical: Spacing['xs'],
  },
  datePickerText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['xs'],
    paddingVertical: Spacing['sm'],
    paddingHorizontal: Spacing['md'],
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.lg,
  },
  clearFilterText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.error,
  },
  breakListItem: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing['lg'],
    gap: Spacing['md'],
  },
  listItemLast: {
    marginBottom: 0,
  },
  breakListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing['sm'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['sm'],
    flex: 1,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  employeeId: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing['sm'],
    paddingVertical: Spacing['xs'],
    borderRadius: BorderRadius.lg,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  breakDetailsGrid: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing['md'],
    gap: Spacing['sm'],
  },
  breakDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['xs'],
  },
  breakDetailLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginLeft: Spacing['xs'],
  },
  breakDetailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  notesSection: {
    padding: Spacing['md'],
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    gap: Spacing['xs'],
  },
  notesText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: Spacing['xs'],
    paddingVertical: Spacing['sm'],
    paddingHorizontal: Spacing['md'],
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.lg,
  },
  removeButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPickerModal: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['xl'],
    width: '85%',
    maxWidth: 400,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['lg'],
    paddingBottom: Spacing['lg'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthPickerYear: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  yearButton: {
    padding: Spacing['sm'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['md'],
  },
  monthButton: {
    width: '30%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
  },
  monthButtonActive: {
    backgroundColor: Colors.primary,
  },
  monthButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  monthButtonTextActive: {
    color: Colors.textInverse,
  },
});
