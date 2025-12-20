import { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { BreakRequest } from '@/lib/types';
import {
  useApproveBreakStart,
  useRejectBreakRequest,
} from '@/hooks/mutations/useBreakRequestMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { formatTime, formatDate } from '@/lib/utils/date.utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BreakApprovalModalProps {
  visible: boolean;
  onClose: () => void;
  breakRequest: BreakRequest & {
    user?: { full_name: string; employee_id: string };
    attendance_record?: {
      date: string;
      check_in_time: string;
      check_out_time: string | null;
    };
  };
}

export default function BreakApprovalModal({
  visible,
  onClose,
  breakRequest,
}: BreakApprovalModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error, confirmDestructive } = useAlert();
  const [reviewerNotes, setReviewerNotes] = useState('');

  const approveBreakStartMutation = useApproveBreakStart(user?.id || '', {
    onSuccess: () => {
      success('Success', 'Break approved and started successfully');
      onClose();
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to approve break request');
    },
  });

  const rejectBreakRequestMutation = useRejectBreakRequest(user?.id || '', {
    onSuccess: () => {
      success('Success', 'Break request rejected');
      onClose();
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to reject break request');
    },
  });

  useEffect(() => {
    if (visible && breakRequest) {
      setReviewerNotes('');
    }
  }, [visible, breakRequest]);

  const handleApprove = () => {
    approveBreakStartMutation.mutate({
      breakRequestId: breakRequest.id,
      reviewerNotes: reviewerNotes.trim() || undefined,
    });
  };

  const handleReject = () => {
    confirmDestructive(
      'Reject Break Request',
      'Are you sure you want to reject this break request?',
      () => {
        rejectBreakRequestMutation.mutate({
          breakRequestId: breakRequest.id,
          reviewerNotes: reviewerNotes.trim() || 'Request rejected',
        });
      },
      undefined,
      'Reject'
    );
  };

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
                <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#6366F1" />
              </View>
              <Text style={styles.modalTitle}>Review Break Request</Text>
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
            {/* Employee Info */}
            <View style={[styles.infoCard, { marginBottom: 20 }]}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="person" size={18} color="#6366F1" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Employee</Text>
                  <Text style={styles.infoValue}>
                    {breakRequest.user?.full_name || 'Unknown'}
                  </Text>
                  <Text style={styles.infoSubtext}>
                    ID: {breakRequest.user?.employee_id || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="calendar-outline" size={18} color="#6366F1" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(new Date(breakRequest.request_date))}
                  </Text>
                </View>
              </View>

              {breakRequest.attendance_record && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="time-outline" size={18} color="#6366F1" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Work Hours</Text>
                      <Text style={styles.infoValue}>
                        {formatTime(new Date(breakRequest.attendance_record.check_in_time))} -{' '}
                        {breakRequest.attendance_record.check_out_time
                          ? formatTime(new Date(breakRequest.attendance_record.check_out_time))
                          : 'Not checked out'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Request Details */}
            <View style={[styles.section, { marginBottom: 20 }]}>
              <Text style={styles.sectionTitle}>Request Details</Text>

              {breakRequest.reason && (
                <View style={styles.reasonCard}>
                  <View style={styles.reasonHeader}>
                    <MaterialCommunityIcons name="text" size={16} color="#64748B" />
                    <Text style={styles.reasonLabel}>Reason</Text>
                  </View>
                  <Text style={styles.reasonText}>{breakRequest.reason}</Text>
                </View>
              )}

              {breakRequest.requested_start_time && (
                <View style={styles.suggestedTimesCard}>
                  <View style={styles.suggestedHeader}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#6366F1" />
                    <Text style={styles.suggestedLabel}>Requested Start Time</Text>
                  </View>
                  <Text style={styles.suggestedTime}>
                    {formatTime(new Date(breakRequest.requested_start_time))}
                  </Text>
                </View>
              )}
            </View>

            {/* Approval Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Approve
              </Text>

              {/* Info about the break flow */}
              <View style={[styles.infoCard, { marginBottom: 12, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <Ionicons name="information-circle" size={18} color="#6366F1" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggestedLabel, { color: '#4338CA', marginBottom: 4 }]}>
                    How Breaks Work
                  </Text>
                  <Text style={[styles.reasonText, { color: '#4F46E5', fontSize: 13 }]}>
                    When you approve, the employee's break will start immediately. They will end their break with WiFi verification when they return, and the duration will be calculated automatically.
                  </Text>
                </View>
              </View>

              {/* Reviewer Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <MaterialCommunityIcons
                    name="note-text-outline"
                    size={18}
                    color="#64748B"
                    style={styles.textAreaIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add notes about this break approval..."
                    value={reviewerNotes}
                    onChangeText={setReviewerNotes}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={rejectBreakRequestMutation.isPending}
              activeOpacity={0.8}
            >
              {rejectBreakRequestMutation.isPending ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.approveButton,
                approveBreakStartMutation.isPending &&
                  styles.approveButtonDisabled,
              ]}
              onPress={handleApprove}
              disabled={approveBreakStartMutation.isPending}
              activeOpacity={0.8}
            >
              {approveBreakStartMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
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
    height: '90%',
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
    backgroundColor: '#EEF2FF',
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
    paddingBottom: 20,
    flexGrow: 1,
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#94A3B8',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  required: {
    color: '#EF4444',
  },
  reasonCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  suggestedTimesCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  suggestedTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F46E5',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
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
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
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
  approveButtonDisabled: {
    opacity: 0.5,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
