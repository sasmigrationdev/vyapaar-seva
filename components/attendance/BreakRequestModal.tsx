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
import { AttendanceRecord } from '@/lib/types';
import { useCreateBreakRequest } from '@/hooks/mutations/useBreakRequestMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import TimePicker from '@/components/ui/TimePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  BorderRadius,
  Spacing,
  Shadows,
  StatusColors,
  Typography,
  FontFamily,
} from '@/constants/theme';

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
  const [reasonTouched, setReasonTouched] = useState(false);

  const MAX_REASON_LENGTH = 500;
  const reasonError = reasonTouched && !reason.trim() ? 'Reason is required' : '';

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
      setReasonTouched(false);
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
                <MaterialCommunityIcons name="coffee-outline" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.modalTitle}>Request Break</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close break request modal"
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
          >
            {!canRequestBreak ? (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={20} color={Colors.warning} />
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
                <View style={[styles.infoCard, { marginBottom: Spacing.lg }]}>
                  <Ionicons name="information-circle" size={20} color={Colors.indigo} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>How it works</Text>
                    <Text style={styles.infoText}>
                      Request a break starting now or at a future time. After HR approval, end your break with WiFi verification.
                    </Text>
                  </View>
                </View>

                {/* Reason Field */}
                <View style={[styles.inputGroup, { marginBottom: Spacing.lg }]}>
                  <Text style={styles.label}>
                    Reason <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[
                    styles.inputWrapper,
                    styles.textAreaWrapper,
                    reasonError && styles.inputWrapperError
                  ]}>
                    <MaterialCommunityIcons
                      name="text"
                      size={18}
                      color={reasonError ? Colors.error : Colors.gray500}
                      style={styles.textAreaIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Why do you need a break? (e.g., Lunch, Doctor appointment)"
                      value={reason}
                      onChangeText={(text) => setReason(text.slice(0, MAX_REASON_LENGTH))}
                      onBlur={() => setReasonTouched(true)}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      placeholderTextColor={Colors.textTertiary}
                      accessibilityLabel="Break reason, required"
                      accessibilityHint="Enter why you need a break"
                    />
                  </View>
                  {/* Inline validation and character counter */}
                  <View style={styles.fieldFooter}>
                    {reasonError ? (
                      <Text style={styles.errorText}>{reasonError}</Text>
                    ) : (
                      <View />
                    )}
                    <Text style={[
                      styles.charCount,
                      reason.length >= MAX_REASON_LENGTH * 0.9 && styles.charCountWarning
                    ]}>
                      {reason.length}/{MAX_REASON_LENGTH}
                    </Text>
                  </View>
                </View>

                {/* Break Start Time */}
                <View style={{ marginBottom: Spacing.lg }}>
                  <TimePicker
                    value={requestedStartTime}
                    onChange={setRequestedStartTime}
                    label="Break Start Time"
                    required
                    iconName="play-circle-outline"
                    iconColor={Colors.success}
                  />
                </View>

                {/* Info about ending break */}
                <View style={[styles.infoCard, { marginBottom: Spacing.lg, backgroundColor: StatusColors.approved.background, borderColor: StatusColors.approved.border }]}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoTitle, { color: StatusColors.approved.text }]}>Ending Your Break</Text>
                    <Text style={[styles.infoText, { color: StatusColors.approved.text }]}>
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
                accessibilityLabel="Cancel"
                accessibilityRole="button"
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
                accessibilityLabel={createBreakRequestMutation.isPending ? "Submitting request" : "Submit break request"}
                accessibilityRole="button"
                accessibilityState={{ disabled: !reason.trim() || !requestedStartTime || createBreakRequestMutation.isPending }}
              >
                {createBreakRequestMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color={Colors.textInverse} />
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
    backgroundColor: StatusColors.pending.background,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.indigoLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#4338CA',
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: Colors.indigo,
    lineHeight: 18,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: StatusColors.pending.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
  },
  warningTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: StatusColors.pending.text,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray700,
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  inputWrapperError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  fieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
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
    fontSize: Typography.fontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.text,
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
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  toggleTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray500,
  },
  toggleTitleActive: {
    color: Colors.indigo,
  },
  toggleSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIndicatorActive: {
    backgroundColor: Colors.indigo,
    borderColor: Colors.indigo,
  },
  durationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.indigoLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray500,
  },
  durationValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.indigo,
    flex: 1,
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
    backgroundColor: Colors.indigo,
    ...Platform.select({
      ios: {
        shadowColor: Colors.indigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
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
