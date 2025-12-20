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
import { AttendanceRecord } from '@/lib/types';
import { useCreateBreakRequest } from '@/hooks/mutations/useBreakRequestMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import TimePicker from '@/components/ui/TimePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BreakRequestModalProps {
  visible: boolean;
  onClose: () => void;
  attendanceRecord: AttendanceRecord;
}

export default function BreakRequestModal({
  visible,
  onClose,
  attendanceRecord,
}: BreakRequestModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error } = useAlert();
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [reason, setReason] = useState('');
  
  // Set default start time to current time when modal opens
  useEffect(() => {
    if (visible && !requestedStartTime) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setRequestedStartTime(`${hours}:${minutes}`);
    }
  }, [visible]);

  const createBreakRequestMutation = useCreateBreakRequest(
    user?.id || '',
    user?.organization_id,
    {
      onSuccess: () => {
        success(
          'Request Submitted',
          'Your break request has been submitted successfully. HR will review and approve it.'
        );
        onClose();
      },
      onError: (err) => {
        error('Error', err.message || 'Failed to submit break request');
      },
    }
  );

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setRequestedStartTime('');
      setReason('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!reason.trim()) {
      error('Required', 'Please provide a reason for your break request');
      return;
    }

    if (!requestedStartTime) {
      error('Required', 'Please enter break start time');
      return;
    }

    // Create ISO timestamp for start time
    const [startHour, startMinute] = requestedStartTime.split(':').map(Number);
    const startDate = new Date(attendanceRecord.date);
    startDate.setHours(startHour, startMinute, 0, 0);

    // Validate against check-in time
    if (attendanceRecord.check_in_time) {
      const checkInDate = new Date(attendanceRecord.check_in_time);

      if (startDate < checkInDate) {
        error('Invalid Time', 'Break cannot start before check-in time');
        return;
      }
    }

    // Allow immediate breaks - no minimum time ahead requirement
    // Employee can request a break starting now

    createBreakRequestMutation.mutate({
      attendanceRecordId: attendanceRecord.id,
      requestDate: attendanceRecord.date,
      requestedStartTime: startDate.toISOString(),
      reason: reason.trim(),
    });
  };

  const canRequestBreak = !!attendanceRecord.check_in_time;

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
                <MaterialCommunityIcons name="coffee-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Request Break</Text>
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
          >
            {!canRequestBreak ? (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Check-in Required</Text>
                  <Text style={styles.warningText}>
                    You must check in before requesting a break.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Info Card */}
                <View style={[styles.infoCard, { marginBottom: 16 }]}>
                  <Ionicons name="information-circle" size={20} color="#6366F1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>How it works</Text>
                    <Text style={styles.infoText}>
                      Request a break starting now or at a future time. After HR approval, end your break with WiFi verification.
                    </Text>
                  </View>
                </View>

                {/* Reason Field */}
                <View style={[styles.inputGroup, { marginBottom: 16 }]}>
                  <Text style={styles.label}>
                    Reason <Text style={styles.required}>*</Text>
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
                      placeholder="Why do you need a break? (e.g., Lunch, Doctor appointment)"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Break Start Time */}
                <View style={{ marginBottom: 16 }}>
                  <TimePicker
                    value={requestedStartTime}
                    onChange={setRequestedStartTime}
                    label="Break Start Time"
                    required
                    iconName="play-circle-outline"
                    iconColor="#10B981"
                  />
                </View>

                {/* Info about ending break */}
                <View style={[styles.infoCard, { marginBottom: 16, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoTitle, { color: '#047857' }]}>Ending Your Break</Text>
                    <Text style={[styles.infoText, { color: '#065F46' }]}>
                      End your break with WiFi verification. End time recorded automatically.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          {canRequestBreak && (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelFooterButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelFooterButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.submitFooterButton,
                  (!reason.trim() || !requestedStartTime || createBreakRequestMutation.isPending) &&
                    styles.submitFooterButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!reason.trim() || !requestedStartTime || createBreakRequestMutation.isPending}
                activeOpacity={0.8}
              >
                {createBreakRequestMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                    <Text style={styles.submitFooterButtonText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
    flexGrow: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EEF2FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#4F46E5',
    lineHeight: 18,
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
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  required: {
    color: '#EF4444',
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTitleActive: {
    color: '#6366F1',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIndicatorActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
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
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
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
