import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/hooks/useAlert';
import { useAuth } from '@/hooks/auth/useAuth';
import { useUpdateEmployee } from '@/hooks/mutations/useUserMutations';
import { useUpdateEmployeeSalary } from '@/hooks/mutations/useSalaryHistoryMutations';
import { User, UserRole, WeekDay } from '@/lib/types';
import DatePicker from '@/components/ui/DatePicker';
import WorkingDaysSelector from '@/components/employee/WorkingDaysSelector';
import BankAccountForm from '@/components/employee/BankAccountForm';
import {
  DEFAULT_WORKING_DAYS,
  calculateMonthlyTotalHours,
  calculateHourlyRate,
} from '@/lib/utils/workingDays.utils';
import { FontFamily } from '@/constants/theme';

interface EditEmployeeModalProps {
  visible: boolean;
  onClose: () => void;
  employee: User;
  onSuccess?: () => void;
}

export default function EditEmployeeModal({
  visible,
  onClose,
  employee,
  onSuccess,
}: EditEmployeeModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error } = useAlert();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    aadhaarNumber: '',
    dateOfBirth: '',
    role: 'employee' as UserRole,
    department: '',
    designation: '',
    dateOfJoining: '',
    baseSalary: '',
    workingDays: DEFAULT_WORKING_DAYS as WeekDay[],
    dailyWorkingHours: '8',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    branchName: '',
  });

  const [salaryChangeReason, setSalaryChangeReason] = useState('');
  const [salaryChangeNotes, setSalaryChangeNotes] = useState('');

  // Reset form when modal opens with employee data
  useEffect(() => {
    if (visible && employee) {
      setFormData({
        fullName: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        aadhaarNumber: employee.aadhaar_number || '',
        dateOfBirth: employee.date_of_birth || '',
        role: (employee.role || 'employee') as UserRole,
        department: employee.department || '',
        designation: employee.designation || '',
        dateOfJoining: employee.date_of_joining || new Date().toISOString().split('T')[0],
        baseSalary: employee.base_salary ? String(employee.base_salary) : '',
        workingDays: (employee.working_days || DEFAULT_WORKING_DAYS) as WeekDay[],
        dailyWorkingHours: employee.daily_working_hours ? String(employee.daily_working_hours) : '8',
        bankName: employee.bank_name || '',
        accountNumber: employee.account_number || '',
        ifscCode: employee.ifsc_code || '',
        accountHolderName: employee.account_holder_name || '',
        branchName: employee.branch_name || '',
      });
      setSalaryChangeReason('');
      setSalaryChangeNotes('');
    }
  }, [visible, employee]);

  // Calculate real-time salary metrics
  const baseSalaryNum = parseFloat(formData.baseSalary) || 0;
  const dailyHoursNum = parseFloat(formData.dailyWorkingHours) || 0;
  const monthlyHours = calculateMonthlyTotalHours(
    formData.workingDays,
    dailyHoursNum,
    new Date().getMonth(),
    new Date().getFullYear()
  );
  const hourlyRate = calculateHourlyRate(baseSalaryNum, monthlyHours);

  // Check if salary has changed
  const originalBaseSalary = employee.base_salary || 0;
  const originalWorkingDays = employee.working_days || [];
  const originalDailyHours = employee.daily_working_hours || 0;

  const hasSalaryChanged =
    baseSalaryNum !== originalBaseSalary ||
    JSON.stringify(formData.workingDays) !== JSON.stringify(originalWorkingDays) ||
    dailyHoursNum !== originalDailyHours;

  const updateEmployeeMutation = useUpdateEmployee({
    onSuccess: () => {
      // Don't close here if salary also changed - we need to update salary next
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to update employee');
    },
  });

  const updateSalaryMutation = useUpdateEmployeeSalary({
    onSuccess: () => {
      success('Success', 'Employee updated successfully. Salary changes have been applied immediately.', () => {
        onSuccess?.();
        onClose();
      });
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to update salary');
    },
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.fullName.trim()) {
      error('Error', 'Please enter employee name');
      return;
    }
    if (!formData.email.trim()) {
      error('Error', 'Please enter email');
      return;
    }

    // If salary changed, validate reason
    if (hasSalaryChanged && !salaryChangeReason.trim()) {
      error('Error', 'Please provide a reason for salary change');
      return;
    }

    try {
      // Step 1: Update basic employee info (including bank details)
      await updateEmployeeMutation.mutateAsync({
        userId: employee.id,
        updates: {
          full_name: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          department: formData.department.trim() || undefined,
          designation: formData.designation.trim() || undefined,
          date_of_joining: formData.dateOfJoining,
          bank_name: formData.bankName.trim() || undefined,
          account_number: formData.accountNumber.trim() || undefined,
          ifsc_code: formData.ifscCode.trim() || undefined,
          account_holder_name: formData.accountHolderName.trim() || undefined,
          branch_name: formData.branchName.trim() || undefined,
          aadhaar_number: formData.aadhaarNumber.trim() || undefined,
          date_of_birth: formData.dateOfBirth || undefined,
        },
      });

      // Step 2: If salary changed, update salary with history
      if (hasSalaryChanged) {
        if (!user?.id) {
          error('Error', 'User not found');
          return;
        }

        await updateSalaryMutation.mutateAsync({
          userId: employee.id,
          newBaseSalary: baseSalaryNum,
          newWorkingDays: formData.workingDays,
          newDailyHours: dailyHoursNum,
          changedBy: user.id,
          changeReason: salaryChangeReason.trim(),
          notes: salaryChangeNotes.trim() || undefined,
          effectiveFrom: new Date().toISOString().split('T')[0], // Apply immediately (today)
        });
      } else {
        // No salary change, just close the modal
        success('Success', 'Employee updated successfully', () => {
          onSuccess?.();
          onClose();
        });
      }
    } catch (error) {
      // Errors are handled by mutation onError callbacks
      console.error('Error updating employee:', error);
    }
  };

  const isLoading = updateEmployeeMutation.isPending || updateSalaryMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Employee</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Full Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter full name"
                    value={formData.fullName}
                    onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    keyboardType="phone-pad"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Aadhaar Number</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="card-account-details" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 12-digit Aadhaar number"
                    value={formData.aadhaarNumber}
                    onChangeText={(text) => {
                      // Only allow digits and limit to 12 characters
                      const digitsOnly = text.replace(/\D/g, '');
                      if (digitsOnly.length <= 12) {
                        setFormData({ ...formData, aadhaarNumber: digitsOnly });
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={12}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <DatePicker
                value={formData.dateOfBirth}
                onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
                label="Date of Birth"
                maximumDate={new Date()}
              />
            </View>

            {/* Role & Department Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Role & Department</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Role <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'employee' && styles.roleButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, role: 'employee' })}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={20}
                      color={formData.role === 'employee' ? '#FFFFFF' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'employee' && styles.roleButtonTextActive,
                      ]}
                    >
                      Employee
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'hr' && styles.roleButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, role: 'hr' })}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="shield-account"
                      size={20}
                      color={formData.role === 'hr' ? '#FFFFFF' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'hr' && styles.roleButtonTextActive,
                      ]}
                    >
                      HR
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="office-building-outline" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter department"
                    value={formData.department}
                    onChangeText={(text) => setFormData({ ...formData, department: text })}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Designation</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="account-tie-outline" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter designation"
                    value={formData.designation}
                    onChangeText={(text) => setFormData({ ...formData, designation: text })}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <DatePicker
                value={formData.dateOfJoining}
                onChange={(date) => setFormData({ ...formData, dateOfJoining: date })}
                label="Date of Joining"
                maximumDate={new Date()}
              />
            </View>

            {/* Salary Configuration Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Salary Configuration</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Base Salary (Monthly)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="cash" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter base salary"
                    value={formData.baseSalary}
                    onChangeText={(text) => setFormData({ ...formData, baseSalary: text })}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <WorkingDaysSelector
                selectedDays={formData.workingDays}
                onDaysChange={(days) => setFormData({ ...formData, workingDays: days })}
                label="Working Days"
              />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Daily Working Hours</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter daily working hours"
                    value={formData.dailyWorkingHours}
                    onChangeText={(text) => setFormData({ ...formData, dailyWorkingHours: text })}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {baseSalaryNum > 0 && monthlyHours > 0 && (
                <View style={styles.calculationCard}>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>Monthly Total Hours:</Text>
                    <Text style={styles.calculationValue}>{monthlyHours.toFixed(1)}h</Text>
                  </View>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>Hourly Rate:</Text>
                    <Text style={styles.calculationValue}>₹{hourlyRate.toFixed(2)}/h</Text>
                  </View>
                </View>
              )}

              {/* Salary Change Info */}
              {hasSalaryChanged && (
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>Salary Change Detected</Text>
                    <Text style={styles.infoText}>
                      Changes will be applied immediately upon saving
                    </Text>
                  </View>
                </View>
              )}

              {/* Salary Change Reason (only show if salary changed) */}
              {hasSalaryChanged && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Reason for Salary Change <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="text-box-outline" size={20} color="#64748B" />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Annual increment, Promotion"
                        value={salaryChangeReason}
                        onChangeText={setSalaryChangeReason}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Additional Notes (Optional)</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                      <MaterialCommunityIcons
                        name="note-text-outline"
                        size={20}
                        color="#64748B"
                        style={styles.textAreaIcon}
                      />
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add any additional notes..."
                        value={salaryChangeNotes}
                        onChangeText={setSalaryChangeNotes}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Bank Account Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bank Account Details</Text>
              <BankAccountForm
                bankName={formData.bankName}
                onBankNameChange={(text) => setFormData({ ...formData, bankName: text })}
                accountNumber={formData.accountNumber}
                onAccountNumberChange={(text) => setFormData({ ...formData, accountNumber: text })}
                ifscCode={formData.ifscCode}
                onIfscCodeChange={(text) => setFormData({ ...formData, ifscCode: text })}
                accountHolderName={formData.accountHolderName}
                onAccountHolderNameChange={(text) =>
                  setFormData({ ...formData, accountHolderName: text })
                }
                branchName={formData.branchName}
                onBranchNameChange={(text) => setFormData({ ...formData, branchName: text })}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Update Employee</Text>
                </>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
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
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.regular,
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
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  calculationCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
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
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#78350F',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#1E3A8A',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
