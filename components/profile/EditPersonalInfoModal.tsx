import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import DatePicker from '@/components/ui/DatePicker';
import { useUpdateProfile } from '@/hooks/mutations/useUserMutations';
import { useAlert } from '@/hooks/useAlert';
import { User } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '@/constants/theme';

interface EditPersonalInfoModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
}

export default function EditPersonalInfoModal({
  visible,
  onClose,
  user,
  onSuccess,
}: EditPersonalInfoModalProps) {
  const { success, error } = useAlert();
  const updateProfileMutation = useUpdateProfile(user?.id || '');

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{
    fullName?: string;
    phone?: string;
    aadhaar?: string;
  }>({});

  // Initialize form with user data when modal opens
  useEffect(() => {
    if (visible && user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setDateOfBirth(user.date_of_birth || '');
      setAadhaarNumber(user.aadhaar_number || '');
      setErrors({});
    }
  }, [visible, user]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Full name validation (required, min 2 chars)
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    // Phone validation (optional, 10 digits if provided)
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    // Aadhaar validation (optional, exactly 12 digits if provided)
    if (aadhaarNumber.trim() && !/^\d{12}$/.test(aadhaarNumber.trim())) {
      newErrors.aadhaar = 'Aadhaar must be exactly 12 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const updates: Parameters<typeof updateProfileMutation.mutate>[0] = {};

    // Only include changed fields
    if (fullName.trim() !== (user?.full_name || '')) {
      updates.full_name = fullName.trim();
    }
    if (phone.trim() !== (user?.phone || '')) {
      updates.phone = phone.trim() || undefined;
    }
    if (dateOfBirth !== (user?.date_of_birth || '')) {
      updates.date_of_birth = dateOfBirth || undefined;
    }
    if (aadhaarNumber.trim() !== (user?.aadhaar_number || '')) {
      updates.aadhaar_number = aadhaarNumber.trim() || undefined;
    }

    // Check if there are any changes
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    updateProfileMutation.mutate(updates, {
      onSuccess: () => {
        success('Success', 'Personal information updated successfully');
        onSuccess?.();
        onClose();
      },
      onError: (err) => {
        error('Error', err.message || 'Failed to update personal information');
      },
    });
  };

  const handleClose = () => {
    if (!updateProfileMutation.isPending) {
      onClose();
    }
  };

  const today = new Date();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Personal Info</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.modalCloseButton}
              disabled={updateProfileMutation.isPending}
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
              {errors.fullName && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              )}
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10-digit phone number"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Date of Birth */}
            <DatePicker
              label="Date of Birth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              maximumDate={today}
            />

            {/* Aadhaar Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Aadhaar Number</Text>
              <View style={[styles.inputWrapper, errors.aadhaar && styles.inputError]}>
                <Ionicons name="card-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                  placeholder="Enter 12-digit Aadhaar number"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>
              {errors.aadhaar && (
                <Text style={styles.errorText}>{errors.aadhaar}</Text>
              )}
              <Text style={styles.helperText}>
                Your Aadhaar number will be securely stored
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={updateProfileMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    paddingBottom: Spacing['3xl'],
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    padding: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textInverse,
  },
});
