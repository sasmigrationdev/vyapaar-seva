import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateEmployee } from '@/hooks/mutations/useOrganizationMutations';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { UserRole, WeekDay } from '@/lib/types';
import DatePicker from '@/components/ui/DatePicker';
import WorkingDaysSelector from '@/components/employee/WorkingDaysSelector';
import BankAccountForm from '@/components/employee/BankAccountForm';
import {
  DEFAULT_WORKING_DAYS,
  calculateMonthlyTotalHours,
  calculateHourlyRate,
} from '@/lib/utils/workingDays.utils';

export default function AddEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const { data: organization } = useCurrentOrganization();
  const { success, error } = useAlert();

  const initialFormState = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    aadhaarNumber: '',
    dateOfBirth: '',
    role: 'employee' as UserRole,
    department: '',
    designation: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    baseSalary: '',
    workingDays: DEFAULT_WORKING_DAYS as WeekDay[],
    dailyWorkingHours: '8',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    branchName: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Reset form to initial state
  const resetForm = () => {
    setFormData(initialFormState);
  };

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

  const createEmployeeMutation = useCreateEmployee(organization?.id || '', {
    onSuccess: () => {
      // Reset the form first
      resetForm();

      // Show success alert
      success('Success', 'Employee added successfully', () => {
        router.replace('/(hr)/employees');
      });
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to add employee');
    },
  });

  const handleSubmit = () => {
    // Validation
    if (!formData.fullName.trim()) {
      error('Error', 'Please enter employee name');
      return;
    }
    if (!formData.email.trim()) {
      error('Error', 'Please enter email');
      return;
    }
    // Password is optional - will default to email if not provided
    if (formData.password.trim() && formData.password.length < 6) {
      error('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!organization?.id) {
      error('Error', 'Organization not found');
      return;
    }

    createEmployeeMutation.mutate({
      email: formData.email.trim().toLowerCase(),
      password: formData.password.trim() ? formData.password.trim() : undefined, // Optional, will default to email in Edge Function
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim() ? formData.phone.trim() : undefined,
      aadhaarNumber: formData.aadhaarNumber.trim() || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      department: formData.department.trim() ? formData.department.trim() : undefined,
      designation: formData.designation.trim() ? formData.designation.trim() : undefined,
      role: formData.role,
      dateOfJoining: formData.dateOfJoining,
      baseSalary: baseSalaryNum || undefined,
      workingDays: formData.workingDays.length > 0 ? formData.workingDays : undefined,
      dailyWorkingHours: dailyHoursNum || undefined,
      bankName: formData.bankName.trim() || undefined,
      accountNumber: formData.accountNumber.trim() || undefined,
      ifscCode: formData.ifscCode.trim() || undefined,
      accountHolderName: formData.accountHolderName.trim() || undefined,
      branchName: formData.branchName.trim() || undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.push('/(hr)/employees')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Employee</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={styles.label}>Password (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Enter password (optional)"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                placeholderTextColor="#94A3B8"
              />
            </View>
            <Text style={styles.helperText}>
              If left empty, email will be used as the default password
            </Text>
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
        </View>

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

        <TouchableOpacity
          style={[styles.submitButton, createEmployeeMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createEmployeeMutation.isPending}
          activeOpacity={0.8}
        >
          {createEmployeeMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Add Employee</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 140,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
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
  disabledInput: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    marginLeft: 4,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
});
