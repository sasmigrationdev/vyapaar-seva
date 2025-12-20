import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AttendanceRecord } from '@/lib/types';
import { useAuth } from '@/hooks/auth/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate, formatTime } from '@/lib/utils/date.utils';
import { formatHours } from '@/lib/utils/attendance.utils';
import { useOvertimeRequestByAttendance } from '@/hooks/queries/useOvertimeRequests';
import { useCreateOvertimeRequest } from '@/hooks/mutations/useOvertimeRequestMutations';

interface AddOvertimeModalProps {
  visible: boolean;
  onClose: () => void;
  attendanceRecord: AttendanceRecord;
}

export default function AddOvertimeModal({
  visible,
  onClose,
  attendanceRecord,
}: AddOvertimeModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error: showError } = useAlert();
  const [hoursInput, setHoursInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('');
  const [overtimeReason, setOvertimeReason] = useState('');

  // Fetch existing overtime request for this attendance record
  const { data: existingRequest, isLoading: isLoadingRequest } = useOvertimeRequestByAttendance(
    attendanceRecord?.id || '',
    { enabled: visible && !!attendanceRecord?.id }
  );

  // Create overtime request mutation
  const createRequestMutation = useCreateOvertimeRequest(
    user?.id || '',
    user?.organization_id || undefined,
    {
      onSuccess: () => {
        success('Request Submitted', 'Your overtime request has been submitted for HR approval.');
        onClose();
      },
      onError: (err) => {
        showError('Error', err.message || 'Failed to submit overtime request');
      },
    }
  );

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setHoursInput('');
      setMinutesInput('');
      setOvertimeReason('');
    }
  }, [visible]);

  // Parse input values
  const parsedHours = parseInt(hoursInput, 10) || 0;
  const parsedMinutes = parseInt(minutesInput, 10) || 0;
  const totalOvertimeHours = parsedHours + (parsedMinutes / 60);

  const handleHoursChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= 10)) {
      setHoursInput(num);
    }
  };

  const handleMinutesChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= 59)) {
      setMinutesInput(num);
    }
  };

  const handleSubmit = () => {
    if (totalOvertimeHours > 10) {
      showError('Invalid', 'Maximum overtime is 10 hours');
      return;
    }

    if (totalOvertimeHours <= 0) {
      showError('Invalid', 'Please enter valid overtime hours or minutes');
      return;
    }

    createRequestMutation.mutate({
      attendanceRecordId: attendanceRecord.id,
      requestDate: attendanceRecord.date,
      requestedHours: Math.round(totalOvertimeHours * 100) / 100, // Round to 2 decimal places
      reason: overtimeReason.trim() || undefined,
    });
  };

  const canSubmit = totalOvertimeHours > 0 && totalOvertimeHours <= 10 && !existingRequest;
  const regularHours = attendanceRecord?.total_hours || 0;

  if (!attendanceRecord) {
    return null;
  }

  // Helper function to get status color
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

  // Helper function to get status background color
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FEF3C7';
      case 'approved':
        return '#D1FAE5';
      case 'rejected':
        return '#FEE2E2';
      default:
        return '#F1F5F9';
    }
  };

  // Render existing request status
  const renderExistingRequest = () => {
    if (!existingRequest) return null;

    const status = existingRequest.status;
    const statusColor = getStatusColor(status);
    const statusBgColor = getStatusBgColor(status);

    return (
      <View style={styles.existingRequestContainer}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
          <Ionicons
            name={
              status === 'pending'
                ? 'time-outline'
                : status === 'approved'
                ? 'checkmark-circle'
                : 'close-circle'
            }
            size={20}
            color={statusColor}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status === 'pending'
              ? 'Pending Approval'
              : status === 'approved'
              ? 'Approved'
              : 'Rejected'}
          </Text>
        </View>

        {/* Request Details */}
        <View style={styles.requestDetailsCard}>
          <View style={styles.requestDetailRow}>
            <Text style={styles.requestDetailLabel}>Requested Hours</Text>
            <Text style={styles.requestDetailValue}>
              {formatHours(existingRequest.requested_hours)}
            </Text>
          </View>

          {status === 'approved' && existingRequest.approved_hours && (
            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>Approved Hours</Text>
              <Text style={[styles.requestDetailValue, { color: '#10B981' }]}>
                {formatHours(existingRequest.approved_hours)}
              </Text>
            </View>
          )}

          {existingRequest.reason && (
            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>Reason</Text>
              <Text style={styles.requestDetailValue}>{existingRequest.reason}</Text>
            </View>
          )}

          {existingRequest.reviewer_notes && (
            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>HR Notes</Text>
              <Text style={styles.requestDetailValue}>{existingRequest.reviewer_notes}</Text>
            </View>
          )}

          {existingRequest.reviewed_at && (
            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>Reviewed At</Text>
              <Text style={styles.requestDetailValue}>
                {formatDate(new Date(existingRequest.reviewed_at))}
              </Text>
            </View>
          )}
        </View>

        {/* Info message */}
        <View style={styles.infoMessage}>
          <Ionicons name="information-circle-outline" size={16} color="#64748B" />
          <Text style={styles.infoMessageText}>
            {status === 'pending'
              ? 'Your request is awaiting HR approval.'
              : status === 'approved'
              ? 'Your overtime has been approved and added to your record.'
              : 'Your request was rejected. Contact HR for more details.'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="clock-plus-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.modalTitle}>
                {existingRequest ? 'Overtime Request' : 'Request Overtime'}
              </Text>
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
            bounces={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {isLoadingRequest ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : existingRequest ? (
              // Show existing request status
              renderExistingRequest()
            ) : (
              // Show form to create new request
              <>
                {/* Info Card */}
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={20} color="#8B5CF6" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>Overtime Request</Text>
                    <Text style={styles.infoText}>
                      Request overtime hours for HR approval. Maximum 10 hours allowed per day.
                    </Text>
                  </View>
                </View>

                {/* Attendance Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Attendance Summary</Text>
                  <View style={styles.summaryDateRow}>
                    <Text style={styles.summaryDateLabel}>Date</Text>
                    <Text style={styles.summaryDateValue}>
                      {formatDate(new Date(attendanceRecord.date))}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Ionicons name="log-in-outline" size={18} color="#10B981" />
                      <Text style={styles.summaryLabel}>Check In</Text>
                      <Text style={styles.summaryValue}>
                        {attendanceRecord.check_in_time
                          ? formatTime(new Date(attendanceRecord.check_in_time))
                          : '--:--'}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                      <Text style={styles.summaryLabel}>Check Out</Text>
                      <Text style={styles.summaryValue}>
                        {attendanceRecord.check_out_time
                          ? formatTime(new Date(attendanceRecord.check_out_time))
                          : '--:--'}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Ionicons name="timer-outline" size={18} color="#6366F1" />
                      <Text style={styles.summaryLabel}>Regular</Text>
                      <Text style={[styles.summaryValue, { color: '#6366F1' }]}>
                        {formatHours(regularHours - (attendanceRecord.overtime_hours || 0))}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Overtime Hours & Minutes Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Overtime Duration <Text style={styles.hint}>(Max: 10 hours)</Text>
                  </Text>
                  <View style={styles.timeInputRow}>
                    <View style={styles.timeInputContainer}>
                      <View style={styles.timeInputWrapper}>
                        <TextInput
                          style={styles.timeInput}
                          placeholder="0"
                          value={hoursInput}
                          onChangeText={handleHoursChange}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <Text style={styles.timeInputLabel}>Hours</Text>
                    </View>

                    <Text style={styles.timeSeparator}>:</Text>

                    <View style={styles.timeInputContainer}>
                      <View style={styles.timeInputWrapper}>
                        <TextInput
                          style={styles.timeInput}
                          placeholder="0"
                          value={minutesInput}
                          onChangeText={handleMinutesChange}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <Text style={styles.timeInputLabel}>Minutes</Text>
                    </View>
                  </View>
                </View>

                {/* Selected Overtime Display */}
                {totalOvertimeHours > 0 && (
                  <View style={styles.selectedDisplay}>
                    <MaterialCommunityIcons name="clock-plus-outline" size={20} color="#8B5CF6" />
                    <Text style={styles.selectedDisplayText}>
                      Total: {parsedHours}h {parsedMinutes}m overtime
                    </Text>
                  </View>
                )}

                {/* Overtime Reason Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Reason <Text style={styles.hint}>(Optional)</Text>
                  </Text>
                  <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                    <MaterialCommunityIcons
                      name="text"
                      size={18}
                      color="#64748B"
                      style={styles.textAreaIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="e.g., Project deadline, Extra work, Client meeting"
                      value={overtimeReason}
                      onChangeText={setOvertimeReason}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelFooterButton]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelFooterButtonText}>
                {existingRequest ? 'Close' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            {!existingRequest && (
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.submitFooterButton,
                  (!canSubmit || createRequestMutation.isPending) && styles.submitFooterButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || createRequestMutation.isPending}
                activeOpacity={0.8}
              >
                {createRequestMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitFooterButtonText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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
    backgroundColor: '#FAF5FF',
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
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  existingRequestContainer: {
    gap: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  requestDetailsCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  requestDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestDetailLabel: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  requestDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 2,
    textAlign: 'right',
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FAF5FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B21A8',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#7C3AED',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  summaryDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryDateLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  hint: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94A3B8',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeInputContainer: {
    alignItems: 'center',
    gap: 6,
  },
  timeInputWrapper: {
    width: 80,
    height: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
    textAlign: 'center',
    width: '100%',
  },
  timeInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 20,
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF5FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  selectedDisplayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B21A8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '400',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
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
  cancelFooterButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelFooterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  submitFooterButton: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitFooterButtonDisabled: {
    opacity: 0.5,
  },
  submitFooterButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
