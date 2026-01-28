import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import BankAccountForm from '@/components/employee/BankAccountForm';
import { useUpdateProfile } from '@/hooks/mutations/useUserMutations';
import { useAlert } from '@/hooks/useAlert';
import { User } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface EditBankInfoModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
}

export default function EditBankInfoModal({
  visible,
  onClose,
  user,
  onSuccess,
}: EditBankInfoModalProps) {
  const { success, error } = useAlert();
  const updateProfileMutation = useUpdateProfile(user?.id || '');

  // Form state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [branchName, setBranchName] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{
    ifsc?: string;
    accountNumber?: string;
  }>({});

  // Initialize form with user data when modal opens
  useEffect(() => {
    if (visible && user) {
      setBankName(user.bank_name || '');
      setAccountNumber(user.account_number || '');
      setIfscCode(user.ifsc_code || '');
      setAccountHolderName(user.account_holder_name || '');
      setBranchName(user.branch_name || '');
      setErrors({});
    }
  }, [visible, user]);

  // IFSC Code format: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)
  const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // IFSC validation
    if (ifscCode.trim()) {
      const trimmedIfsc = ifscCode.trim();
      if (trimmedIfsc.length !== 11) {
        newErrors.ifsc = 'IFSC code must be exactly 11 characters';
      } else if (!IFSC_REGEX.test(trimmedIfsc)) {
        // Provide specific error message
        if (!/^[A-Z]{4}/.test(trimmedIfsc)) {
          newErrors.ifsc = 'IFSC must start with 4 letters (bank code)';
        } else if (trimmedIfsc[4] !== '0') {
          newErrors.ifsc = 'IFSC 5th character must be 0';
        } else {
          newErrors.ifsc = 'IFSC last 6 characters must be alphanumeric';
        }
      }
    }

    // Account number validation (numeric only, 9-18 digits if provided)
    if (accountNumber.trim()) {
      const trimmedAccNum = accountNumber.trim();
      if (!/^\d+$/.test(trimmedAccNum)) {
        newErrors.accountNumber = 'Account number must contain only digits';
      } else if (trimmedAccNum.length < 9) {
        newErrors.accountNumber = 'Account number must be at least 9 digits';
      } else if (trimmedAccNum.length > 18) {
        newErrors.accountNumber = 'Account number must not exceed 18 digits';
      }
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
    if (bankName.trim() !== (user?.bank_name || '')) {
      updates.bank_name = bankName.trim() || undefined;
    }
    if (accountNumber.trim() !== (user?.account_number || '')) {
      updates.account_number = accountNumber.trim() || undefined;
    }
    if (ifscCode.trim() !== (user?.ifsc_code || '')) {
      updates.ifsc_code = ifscCode.trim() || undefined;
    }
    if (accountHolderName.trim() !== (user?.account_holder_name || '')) {
      updates.account_holder_name = accountHolderName.trim() || undefined;
    }
    if (branchName.trim() !== (user?.branch_name || '')) {
      updates.branch_name = branchName.trim() || undefined;
    }

    // Check if there are any changes
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    updateProfileMutation.mutate(updates, {
      onSuccess: () => {
        success('Success', 'Bank details updated successfully');
        onSuccess?.();
        onClose();
      },
      onError: (err) => {
        error('Error', err.message || 'Failed to update bank details');
      },
    });
  };

  const handleClose = () => {
    if (!updateProfileMutation.isPending) {
      onClose();
    }
  };

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
            <Text style={styles.modalTitle}>Edit Bank Details</Text>
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
            <BankAccountForm
              bankName={bankName}
              onBankNameChange={setBankName}
              accountNumber={accountNumber}
              onAccountNumberChange={setAccountNumber}
              ifscCode={ifscCode}
              onIfscCodeChange={setIfscCode}
              accountHolderName={accountHolderName}
              onAccountHolderNameChange={setAccountHolderName}
              branchName={branchName}
              onBranchNameChange={setBranchName}
            />

            {/* Validation Errors */}
            {(errors.ifsc || errors.accountNumber) && (
              <View style={styles.errorsContainer}>
                {errors.ifsc && (
                  <Text style={styles.errorText}>{errors.ifsc}</Text>
                )}
                {errors.accountNumber && (
                  <Text style={styles.errorText}>{errors.accountNumber}</Text>
                )}
              </View>
            )}

            {/* Helper text */}
            <View style={styles.helperContainer}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
              <Text style={styles.helperText}>
                Your bank details are securely stored and used only for salary disbursement
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
    maxHeight: '90%',
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
  errorsContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.lg,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.lg,
  },
  helperText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
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
