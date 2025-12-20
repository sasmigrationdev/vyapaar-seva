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
import { Text } from '@/components/ui/Text';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { OvertimeRequestWithUser } from '@/lib/types';
import {
  useApproveOvertimeRequest,
  useRejectOvertimeRequest,
} from '@/hooks/mutations/useOvertimeRequestMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { formatTime, formatDate } from '@/lib/utils/date.utils';
import { formatHours } from '@/lib/utils/attendance.utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OvertimeApprovalModalProps {
  visible: boolean;
  onClose: () => void;
  overtimeRequest: OvertimeRequestWithUser;
}

export default function OvertimeApprovalModal({
  visible,
  onClose,
  overtimeRequest,
}: OvertimeApprovalModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error, confirmDestructive } = useAlert();
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [approvedHoursInput, setApprovedHoursInput] = useState('');
  const [approvedMinutesInput, setApprovedMinutesInput] = useState('');

  const approveOvertimeMutation = useApproveOvertimeRequest(user?.id || '', {
    onSuccess: () => {
      success('Success', 'Overtime request approved successfully');
      onClose();
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to approve overtime request');
    },
  });

  const rejectOvertimeMutation = useRejectOvertimeRequest(user?.id || '', {
    onSuccess: () => {
      success('Success', 'Overtime request rejected');
      onClose();
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to reject overtime request');
    },
  });

  // Initialize approved hours from requested hours when modal opens
  useEffect(() => {
    if (visible && overtimeRequest) {
      setReviewerNotes('');
      const hours = Math.floor(overtimeRequest.requested_hours);
      const minutes = Math.round((overtimeRequest.requested_hours % 1) * 60);
      setApprovedHoursInput(hours.toString());
      setApprovedMinutesInput(minutes > 0 ? minutes.toString() : '0');
    }
  }, [visible, overtimeRequest]);

  const parsedHours = parseInt(approvedHoursInput, 10) || 0;
  const parsedMinutes = parseInt(approvedMinutesInput, 10) || 0;
  const totalApprovedHours = parsedHours + (parsedMinutes / 60);

  const handleHoursChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= 10)) {
      setApprovedHoursInput(num);
    }
  };

  const handleMinutesChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || (parseInt(num, 10) >= 0 && parseInt(num, 10) <= 59)) {
      setApprovedMinutesInput(num);
    }
  };

  const handleApprove = () => {
    if (totalApprovedHours <= 0) {
      error('Invalid', 'Please enter valid approved hours');
      return;
    }

    if (totalApprovedHours > 10) {
      error('Invalid', 'Maximum overtime is 10 hours');
      return;
    }

    approveOvertimeMutation.mutate({
      overtimeRequestId: overtimeRequest.id,
      approvedHours: Math.round(totalApprovedHours * 100) / 100,
      reviewerNotes: reviewerNotes.trim() || undefined,
    });
  };

  const handleReject = () => {
    confirmDestructive(
      'Reject Overtime Request',
      'Are you sure you want to reject this overtime request?',
      () => {
        rejectOvertimeMutation.mutate({
          overtimeRequestId: overtimeRequest.id,
          reviewerNotes: reviewerNotes.trim() || 'Request rejected',
        });
      },
      undefined,
      'Reject'
    );
  };

  const isPending = approveOvertimeMutation.isPending || rejectOvertimeMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="clock-check-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.modalTitle}>Review Overtime Request</Text>
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
            keyboardShouldPersistTaps="handled"
          >
            {/* Employee Info */}
            <View style={[styles.infoCard, { marginBottom: 20 }]}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="person" size={18} color="#8B5CF6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Employee</Text>
                  <Text style={styles.infoValue}>
                    {overtimeRequest.user?.full_name || 'Unknown'}
                  </Text>
                  <Text style={styles.infoSubtext}>
                    ID: {overtimeRequest.user?.employee_id || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(new Date(overtimeRequest.request_date))}
                  </Text>
                </View>
              </View>

              {overtimeRequest.attendance_record && (
                <>
                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="time-outline" size={18} color="#8B5CF6" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Work Hours</Text>
                      <Text style={styles.infoValue}>
                        {overtimeRequest.attendance_record.check_in_time
                          ? formatTime(new Date(overtimeRequest.attendance_record.check_in_time))
                          : '--:--'}{' '}
                        -{' '}
                        {overtimeRequest.attendance_record.check_out_time
                          ? formatTime(new Date(overtimeRequest.attendance_record.check_out_time))
                          : '--:--'}
                      </Text>
                      <Text style={styles.infoSubtext}>
                        Regular: {formatHours(overtimeRequest.attendance_record.total_hours || 0)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Requested Overtime */}
            <View style={styles.requestedCard}>
              <View style={styles.requestedHeader}>
                <MaterialCommunityIcons name="clock-plus-outline" size={20} color="#8B5CF6" />
                <Text style={styles.requestedTitle}>Requested Overtime</Text>
              </View>
              <Text style={styles.requestedHours}>
                {formatHours(overtimeRequest.requested_hours)}
              </Text>
              {overtimeRequest.reason && (
                <View style={styles.reasonContainer}>
                  <Text style={styles.reasonLabel}>Reason:</Text>
                  <Text style={styles.reasonText}>{overtimeRequest.reason}</Text>
                </View>
              )}
            </View>

            {/* Approved Hours Input */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>
                Approved Hours <Text style={styles.hint}>(You can adjust)</Text>
              </Text>
              <View style={styles.timeInputRow}>
                <View style={styles.timeInputContainer}>
                  <View style={styles.timeInputWrapper}>
                    <TextInput
                      style={styles.timeInput}
                      placeholder="0"
                      value={approvedHoursInput}
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
                      value={approvedMinutesInput}
                      onChangeText={handleMinutesChange}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <Text style={styles.timeInputLabel}>Minutes</Text>
                </View>
              </View>

              {totalApprovedHours !== overtimeRequest.requested_hours && totalApprovedHours > 0 && (
                <View style={styles.adjustedNote}>
                  <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                  <Text style={styles.adjustedNoteText}>
                    Adjusted from {formatHours(overtimeRequest.requested_hours)} to {formatHours(totalApprovedHours)}
                  </Text>
                </View>
              )}
            </View>

            {/* Reviewer Notes */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>
                Notes <Text style={styles.hint}>(Optional)</Text>
              </Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Add notes for the employee..."
                  value={reviewerNotes}
                  onChangeText={setReviewerNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {rejectOvertimeMutation.isPending ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.approveButton,
                (isPending || totalApprovedHours <= 0) && styles.buttonDisabled,
              ]}
              onPress={handleApprove}
              disabled={isPending || totalApprovedHours <= 0}
              activeOpacity={0.8}
            >
              {approveOvertimeMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve</Text>
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
    maxHeight: '90%',
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
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  requestedCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 20,
  },
  requestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requestedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B21A8',
  },
  requestedHours: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  reasonContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
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
    borderColor: '#8B5CF6',
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
  adjustedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  adjustedNoteText: {
    fontSize: 13,
    color: '#92400E',
  },
  textAreaWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  textArea: {
    fontSize: 14,
    color: '#0F172A',
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
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
