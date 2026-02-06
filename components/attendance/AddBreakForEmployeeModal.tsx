import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAllUsers } from '@/hooks/queries/useUser';
import { useAllAttendanceRecords } from '@/hooks/queries/useAttendance';
import { useHRAddManualBreak } from '@/hooks/mutations/useBreakRequestMutations';
import { useBreaksByDate } from '@/hooks/queries/useBreakRequests';
import TimePicker from '@/components/ui/TimePicker';
import DatePicker from '@/components/ui/DatePicker';
import { formatDate } from '@/lib/utils/date.utils';
import { AttendanceBreak } from '@/lib/types';
import { FontFamily } from '@/constants/theme';

interface AddBreakForEmployeeModalProps {
  visible: boolean;
  onClose: () => void;
  preSelectedDate?: Date;
}

export default function AddBreakForEmployeeModal({
  visible,
  onClose,
  preSelectedDate,
}: AddBreakForEmployeeModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error, info } = useAlert();

  // State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedDateString, setSelectedDateString] = useState<string>(() => {
    // Always default to today's date (latest date)
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [breakStartTime, setBreakStartTime] = useState('');
  const [breakEndTime, setBreakEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAttendanceDetailsExpanded, setIsAttendanceDetailsExpanded] = useState(true);

  // Queries - only fetch employees, not HR or admin
  const { data: employees, isLoading: isLoadingEmployees } = useAllUsers({
    role: 'employee',
    organizationId: user?.organization_id,
  });

  // Use selectedDateString directly for queries
  const { data: attendanceRecords, isLoading: isLoadingAttendance, error: attendanceError, refetch: refetchAttendance } = useAllAttendanceRecords(
    {
      startDate: selectedDateString,
      endDate: selectedDateString,
      userId: selectedEmployeeId || undefined,
      organizationId: user?.organization_id,
    },
    {
      enabled: !!selectedEmployeeId,
      refetchOnMount: true,
      staleTime: 0, // Always fetch fresh data
    }
  );

  // Query existing breaks for the selected date
  const { data: existingBreaksForDate, isLoading: isLoadingBreaks } = useBreaksByDate(
    selectedDateString,
    user?.organization_id || '',
    {
      enabled: !!selectedEmployeeId && !!user?.organization_id,
      staleTime: 0, // Always fetch fresh data
      refetchOnMount: true,
    } as any
  );

  // Find attendance record for selected employee and date
  const attendanceRecord = attendanceRecords?.find(
    (record) =>
      record.user_id === selectedEmployeeId && record.date === selectedDateString
  );

  // Filter breaks for the selected employee
  const employeeBreaksForDate = existingBreaksForDate?.filter(
    (br: any) => br.user_id === selectedEmployeeId
  );

  // Mutation
  const assignBreakMutation = useHRAddManualBreak(user?.id || '', {
    onSuccess: () => {
      success('Success', 'Break assigned successfully');
      handleReset();
      onClose();
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to assign break');
    },
  });

  // Filter employees by search query
  const filteredEmployees = employees?.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(query) ||
      emp.employee_id?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (visible) {
      // Reset to today's date when modal opens
      setSelectedDateString(new Date().toISOString().split('T')[0]);
    }
  }, [visible]);

  const handleReset = () => {
    setSelectedEmployeeId('');
    setBreakStartTime('');
    setBreakEndTime('');
    setNotes('');
    setSearchQuery('');
    setIsAttendanceDetailsExpanded(true); // Reset to expanded state
  };

  const handleDateChange = (dateString: string) => {
    setSelectedDateString(dateString);
    // Reset break times when date changes
    setBreakStartTime('');
    setBreakEndTime('');
  };

  const calculateDuration = (): number | null => {
    if (!breakStartTime || !breakEndTime) return null;

    const [startHour, startMinute] = breakStartTime.split(':').map(Number);
    const [endHour, endMinute] = breakEndTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    return endTotalMinutes - startTotalMinutes;
  };

  const duration = calculateDuration();
  const hours = duration ? Math.floor(duration / 60) : 0;
  const minutes = duration ? duration % 60 : 0;

  const handleAssign = () => {
    if (!selectedEmployeeId) {
      error('Required', 'Please select an employee');
      return;
    }

    if (!breakStartTime) {
      error('Required', 'Please enter break start time');
      return;
    }

    if (!breakEndTime) {
      error('Required', 'Please enter break end time');
      return;
    }

    if (duration === null || duration <= 0) {
      error('Invalid Time', 'End time must be after start time');
      return;
    }

    // Validation: Check if attendance record exists
    if (!attendanceRecord) {
      info(
        'Cannot Add Break',
        `No attendance record found for ${formatDate(new Date(selectedDateString))}. The employee was either absent or hasn't checked in yet.`
      );
      return;
    }

    // Validation: Check if it's an off day
    if (attendanceRecord.is_valid_day === false) {
      info(
        'Cannot Add Break',
        `${formatDate(new Date(selectedDateString))} is marked as an off day for this employee. Cannot add breaks on off days.`
      );
      return;
    }

    // Validation: Check if break times are within check-in/check-out range
    if (attendanceRecord.check_in_time) {
      const checkInTime = new Date(attendanceRecord.check_in_time);
      const checkOutTime = attendanceRecord.check_out_time
        ? new Date(attendanceRecord.check_out_time)
        : null;

      const [startHour, startMinute] = breakStartTime.split(':').map(Number);
      const [endHour, endMinute] = breakEndTime.split(':').map(Number);

      const breakStart = new Date(selectedDateString + 'T00:00:00');
      breakStart.setHours(startHour, startMinute, 0, 0);

      const breakEnd = new Date(selectedDateString + 'T00:00:00');
      breakEnd.setHours(endHour, endMinute, 0, 0);

      // Check if break start is before check-in
      if (breakStart < checkInTime) {
        error(
          'Invalid Break Time',
          `Break start time cannot be before check-in time (${checkInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}).`
        );
        return;
      }

      // Check if break end is after check-out (if checked out)
      if (checkOutTime && breakEnd > checkOutTime) {
        error(
          'Invalid Break Time',
          `Break end time cannot be after check-out time (${checkOutTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}).`
        );
        return;
      }
    }

    proceedWithAssignment();
  };

  const proceedWithAssignment = () => {
    const [startHour, startMinute] = breakStartTime.split(':').map(Number);
    const [endHour, endMinute] = breakEndTime.split(':').map(Number);

    const startDate = new Date(selectedDateString + 'T00:00:00');
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(selectedDateString + 'T00:00:00');
    endDate.setHours(endHour, endMinute, 0, 0);

    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    assignBreakMutation.mutate({
      userId: selectedEmployeeId,
      attendanceRecordId: attendanceRecord?.id || '',
      requestDate: selectedDateString,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      notes: notes.trim() || undefined,
    });
  };

  const selectedEmployee = employees?.find(
    (emp) => emp.id === selectedEmployeeId
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="coffee" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Add Break</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Select Employee */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Select Employee <Text style={styles.required}>*</Text>
              </Text>

              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Selected Employee Display */}
              {selectedEmployee && (
                <View style={styles.selectedEmployeeCard}>
                  <View style={styles.selectedEmployeeInfo}>
                    <View style={styles.employeeAvatar}>
                      <Ionicons name="person" size={20} color="#6366F1" />
                    </View>
                    <View style={styles.employeeDetails}>
                      <Text style={styles.employeeName}>
                        {selectedEmployee.full_name}
                      </Text>
                      <Text style={styles.employeeId}>
                        ID: {selectedEmployee.employee_id}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => setSelectedEmployeeId('')}
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Employee List */}
              {!selectedEmployeeId && (
                <View style={styles.employeeListContainer}>
                  {isLoadingEmployees ? (
                    <View style={styles.centerContent}>
                      <ActivityIndicator size="small" color="#6366F1" />
                      <Text style={styles.loadingText}>Loading employees...</Text>
                    </View>
                  ) : filteredEmployees && filteredEmployees.length > 0 ? (
                    <ScrollView
                      style={styles.employeeList}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={true}
                    >
                      {filteredEmployees.map((employee) => (
                        <TouchableOpacity
                          key={employee.id}
                          style={styles.employeeItem}
                          onPress={() => setSelectedEmployeeId(employee.id)}
                        >
                          <View style={styles.employeeAvatar}>
                            <Ionicons name="person" size={18} color="#6366F1" />
                          </View>
                          <View style={styles.employeeInfo}>
                            <Text style={styles.employeeItemName}>
                              {employee.full_name}
                            </Text>
                            <Text style={styles.employeeItemId}>
                              ID: {employee.employee_id}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#CBD5E1"
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No employees found</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Date Selection */}
            {selectedEmployeeId && (
              <>
                <DatePicker
                  value={selectedDateString}
                  onChange={handleDateChange}
                  label="Date"
                  required
                  maximumDate={new Date()}
                />

                {/* Loading State */}
                {(isLoadingAttendance || isLoadingBreaks) && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={styles.loadingText}>Loading attendance data...</Text>
                  </View>
                )}

                {/* Attendance Details */}
                {!isLoadingAttendance && !isLoadingBreaks && attendanceRecord && (
                  <View style={styles.section}>
                    <TouchableOpacity
                      style={styles.collapsibleHeader}
                      onPress={() =>
                        setIsAttendanceDetailsExpanded(!isAttendanceDetailsExpanded)
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionTitle}>Attendance Details</Text>
                      <Ionicons
                        name={isAttendanceDetailsExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#6366F1"
                      />
                    </TouchableOpacity>
                    {isAttendanceDetailsExpanded && (
                      <View style={styles.attendanceDetailsCard}>
                      {/* Check-in/Check-out Times */}
                      <View style={styles.attendanceRow}>
                        <View style={styles.attendanceItem}>
                          <View style={styles.attendanceIconWrapper}>
                            <Ionicons name="log-in" size={16} color="#10B981" />
                          </View>
                          <View style={styles.attendanceInfo}>
                            <Text style={styles.attendanceLabel}>Check-In</Text>
                            <Text style={styles.attendanceTime}>
                              {attendanceRecord.check_in_time
                                ? new Date(
                                    attendanceRecord.check_in_time
                                  ).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })
                                : 'Not checked in'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.attendanceItem}>
                          <View style={styles.attendanceIconWrapper}>
                            <Ionicons name="log-out" size={16} color="#EF4444" />
                          </View>
                          <View style={styles.attendanceInfo}>
                            <Text style={styles.attendanceLabel}>Check-Out</Text>
                            <Text style={styles.attendanceTime}>
                              {attendanceRecord.check_out_time
                                ? new Date(
                                    attendanceRecord.check_out_time
                                  ).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })
                                : 'Not checked out'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Status Indicators */}
                      <View style={styles.statusRow}>
                        {attendanceRecord.is_valid_day === false && (
                          <View style={styles.statusBadge}>
                            <MaterialCommunityIcons
                              name="calendar-remove"
                              size={14}
                              color="#EF4444"
                            />
                            <Text style={styles.statusBadgeText}>Off Day</Text>
                          </View>
                        )}
                        {attendanceRecord.is_valid_day !== false && (
                          <View
                            style={[styles.statusBadge, styles.statusBadgeSuccess]}
                          >
                            <MaterialCommunityIcons
                              name="calendar-check"
                              size={14}
                              color="#10B981"
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                styles.statusBadgeTextSuccess,
                              ]}
                            >
                              Working Day
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Existing Breaks */}
                      {employeeBreaksForDate && employeeBreaksForDate.length > 0 && (
                        <View style={styles.existingBreaksSection}>
                          <Text style={styles.existingBreaksTitle}>
                            Existing Breaks ({employeeBreaksForDate.length})
                          </Text>
                          {employeeBreaksForDate.map((breakReq: any, index: number) => {
                            // Use fallback logic: actual_* first, then approved_*
                            const startTimeStr = breakReq.actual_start_time || breakReq.approved_start_time;
                            const endTimeStr = breakReq.actual_end_time || breakReq.approved_end_time;

                            const startTime = startTimeStr
                              ? new Date(startTimeStr)
                              : null;
                            const endTime = endTimeStr
                              ? new Date(endTimeStr)
                              : null;

                            const durationMins =
                              startTime && endTime
                                ? Math.round(
                                    (endTime.getTime() - startTime.getTime()) /
                                      60000
                                  )
                                : 0;

                            return (
                              <View key={breakReq.id} style={styles.existingBreakItem}>
                                <View style={styles.breakTimeRow}>
                                  <Text style={styles.breakTime}>
                                    {startTime?.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}{' '}
                                    -{' '}
                                    {endTime?.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}
                                  </Text>
                                  <Text style={styles.breakDuration}>
                                    {Math.floor(durationMins / 60) > 0 &&
                                      `${Math.floor(durationMins / 60)}h `}
                                    {durationMins % 60}m
                                  </Text>
                                </View>
                                {breakReq.notes && (
                                  <Text
                                    style={styles.breakNotes}
                                    numberOfLines={1}
                                  >
                                    {breakReq.notes}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                    )}
                  </View>
                )}

                {/* Warning if no attendance record */}
                {!isLoadingAttendance && !isLoadingBreaks && !attendanceRecord && (
                  <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.errorTitle}>No Attendance Record</Text>
                      <Text style={styles.errorText}>
                        This employee was absent or hasn't checked in for this
                        date. Cannot add breaks.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Warning if off day */}
                {!isLoadingAttendance && !isLoadingBreaks && attendanceRecord && attendanceRecord.is_valid_day === false && (
                  <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.errorTitle}>Off Day</Text>
                      <Text style={styles.errorText}>
                        This date is marked as an off day. Cannot add breaks on
                        off days.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Break Times */}
                {!isLoadingAttendance && !isLoadingBreaks && attendanceRecord && attendanceRecord.is_valid_day !== false && (
                  <>
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Break Schedule <Text style={styles.required}>*</Text>
                      </Text>

                      <View style={{ marginBottom: 12 }}>
                        <TimePicker
                          value={breakStartTime}
                          onChange={setBreakStartTime}
                          label="Break Start Time"
                          required
                          iconName="play-circle-outline"
                          iconColor="#10B981"
                        />
                      </View>

                      <View style={{ marginBottom: 12 }}>
                        <TimePicker
                          value={breakEndTime}
                          onChange={setBreakEndTime}
                          label="Break End Time"
                          required
                          iconName="stop-circle-outline"
                          iconColor="#EF4444"
                        />
                      </View>

                      {/* Duration Preview */}
                      {duration !== null && duration > 0 && (
                        <View style={styles.durationPreview}>
                          <Ionicons name="timer-outline" size={18} color="#6366F1" />
                          <Text style={styles.durationLabel}>Duration:</Text>
                          <Text style={styles.durationValue}>
                            {hours > 0 && `${hours}h `}
                            {minutes}m
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Notes */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                      <View style={styles.textAreaWrapper}>
                        <MaterialCommunityIcons
                          name="note-text-outline"
                          size={18}
                          color="#64748B"
                          style={styles.textAreaIcon}
                        />
                        <TextInput
                          style={styles.textArea}
                          placeholder="Add notes about this break..."
                          value={notes}
                          onChangeText={setNotes}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.assignButton,
                (!selectedEmployeeId ||
                  !breakStartTime ||
                  !breakEndTime ||
                  !attendanceRecord ||
                  attendanceRecord.is_valid_day === false ||
                  isLoadingAttendance ||
                  isLoadingBreaks ||
                  assignBreakMutation.isPending) &&
                  styles.assignButtonDisabled,
              ]}
              onPress={handleAssign}
              disabled={
                !selectedEmployeeId ||
                !breakStartTime ||
                !breakEndTime ||
                !attendanceRecord ||
                attendanceRecord.is_valid_day === false ||
                isLoadingAttendance ||
                isLoadingBreaks ||
                assignBreakMutation.isPending
              }
            >
              {assignBreakMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.assignButtonText}>Assign Break</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  required: {
    color: '#EF4444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: '#0F172A',
  },
  selectedEmployeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  selectedEmployeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  employeeId: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  changeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  changeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  employeeListContainer: {
    maxHeight: 300,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  employeeList: {
    maxHeight: 300,
  },
  centerContent: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  employeeItemId: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  durationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  durationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
    flex: 1,
  },
  textAreaWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  assignButton: {
    backgroundColor: '#F59E0B',
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  attendanceDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attendanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  attendanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attendanceIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendanceTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  statusBadgeSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  statusBadgeTextSuccess: {
    color: '#059669',
  },
  existingBreaksSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  existingBreaksTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  existingBreakItem: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  breakDuration: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  breakNotes: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
});
