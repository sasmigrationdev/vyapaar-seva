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
import {
  Colors,
  BorderRadius,
  Spacing,
  StatusColors,
  Typography,
} from '@/constants/theme';

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

  const MAX_REASON_LENGTH = 500;

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
        return Colors.warning;
      case 'approved':
        return Colors.success;
      case 'rejected':
        return Colors.error;
      default:
        return Colors.gray500;
    }
  };

  // Helper function to get status background color
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending':
        return StatusColors.pending.background;
      case 'approved':
        return StatusColors.approved.background;
      case 'rejected':
        return StatusColors.rejected.background;
      default:
        return Colors.gray100;
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
              <Text style={[styles.requestDetailValue, { color: Colors.success }]}>
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
          <Ionicons name="information-circle-outline" size={16} color={Colors.gray500} />
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
                <MaterialCommunityIcons name="clock-plus-outline" size={20} color={Colors.purple} />
              </View>
              <Text style={styles.modalTitle}>
                {existingRequest ? 'Overtime Request' : 'Request Overtime'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close overtime request modal"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={Colors.gray500} />
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
                <ActivityIndicator size="large" color={Colors.purple} />
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
                  <Ionicons name="information-circle" size={20} color={Colors.purple} />
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
                      <Ionicons name="log-in-outline" size={18} color={Colors.success} />
                      <Text style={styles.summaryLabel}>Check In</Text>
                      <Text style={styles.summaryValue}>
                        {attendanceRecord.check_in_time
                          ? formatTime(new Date(attendanceRecord.check_in_time))
                          : '--:--'}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                      <Text style={styles.summaryLabel}>Check Out</Text>
                      <Text style={styles.summaryValue}>
                        {attendanceRecord.check_out_time
                          ? formatTime(new Date(attendanceRecord.check_out_time))
                          : '--:--'}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Ionicons name="timer-outline" size={18} color={Colors.indigo} />
                      <Text style={styles.summaryLabel}>Regular</Text>
                      <Text style={[styles.summaryValue, { color: Colors.indigo }]}>
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
                          placeholderTextColor={Colors.textTertiary}
                          accessibilityLabel="Overtime hours"
                          accessibilityHint="Enter number of overtime hours, maximum 10"
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
                          placeholderTextColor={Colors.textTertiary}
                          accessibilityLabel="Overtime minutes"
                          accessibilityHint="Enter number of overtime minutes"
                        />
                      </View>
                      <Text style={styles.timeInputLabel}>Minutes</Text>
                    </View>
                  </View>
                </View>

                {/* Selected Overtime Display */}
                {totalOvertimeHours > 0 && (
                  <View style={styles.selectedDisplay}>
                    <MaterialCommunityIcons name="clock-plus-outline" size={20} color={Colors.purple} />
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
                      color={Colors.gray500}
                      style={styles.textAreaIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="e.g., Project deadline, Extra work, Client meeting"
                      value={overtimeReason}
                      onChangeText={(text) => setOvertimeReason(text.slice(0, MAX_REASON_LENGTH))}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      placeholderTextColor={Colors.textTertiary}
                      accessibilityLabel="Overtime reason, optional"
                      accessibilityHint="Enter the reason for overtime"
                    />
                  </View>
                  {/* Character counter */}
                  <View style={styles.fieldFooter}>
                    <View />
                    <Text style={[
                      styles.charCount,
                      overtimeReason.length >= MAX_REASON_LENGTH * 0.9 && styles.charCountWarning
                    ]}>
                      {overtimeReason.length}/{MAX_REASON_LENGTH}
                    </Text>
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
              accessibilityLabel={existingRequest ? "Close" : "Cancel"}
              accessibilityRole="button"
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
                accessibilityLabel={createRequestMutation.isPending ? "Submitting request" : "Submit overtime request"}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit || createRequestMutation.isPending }}
              >
                {createRequestMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color={Colors.textInverse} />
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["3xl"],
    borderTopRightRadius: BorderRadius["3xl"],
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: Spacing.xl,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
  },
  existingRequestContainer: {
    gap: Spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statusText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  requestDetailsCard: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  requestDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestDetailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    flex: 1,
  },
  requestDetailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.gray100,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.purpleLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#6B21A8',
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: '#7C3AED',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  summaryDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryDateLabel: {
    fontSize: 13,
    color: Colors.gray500,
  },
  summaryDateValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
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
    gap: Spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.gray500,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray700,
  },
  hint: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textTertiary,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  timeInputContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeInputWrapper: {
    width: 80,
    height: 60,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInput: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.purple,
    textAlign: 'center',
    width: '100%',
  },
  timeInputLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray500,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.purple,
    marginBottom: Spacing.xl,
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.purpleLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: Spacing.lg,
  },
  selectedDisplayText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#6B21A8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  fieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  charCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  charCountWarning: {
    color: Colors.warning,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.regular,
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
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  cancelFooterButton: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelFooterButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray500,
  },
  submitFooterButton: {
    backgroundColor: Colors.purple,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitFooterButtonDisabled: {
    opacity: 0.5,
  },
  submitFooterButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
});
