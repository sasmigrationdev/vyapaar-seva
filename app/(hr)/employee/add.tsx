/**
 * Add Employee - Step-Based Wizard
 *
 * Progressive form with 3 steps:
 * 1. Essentials (Name, Email, Phone)
 * 2. Role & Work (Role, Department, Designation, Joining Date)
 * 3. Salary & Details (Salary config, optional extras)
 *
 * Same functionality, better UX.
 */
import BankAccountForm from '@/components/employee/BankAccountForm';
import WorkingDaysSelector from '@/components/employee/WorkingDaysSelector';
import DatePicker from '@/components/ui/DatePicker';
import { Text } from '@/components/ui/Text';
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/theme';
import { useCreateEmployee } from '@/hooks/mutations/useOrganizationMutations';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useAlert } from '@/hooks/useAlert';
import { UserRole, WeekDay } from '@/lib/types';
import {
  DEFAULT_WORKING_DAYS,
  calculateHourlyRate,
  calculateMonthlyTotalHours,
} from '@/lib/utils/workingDays.utils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL_STEPS = 3;

export default function AddEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const { data: organization } = useCurrentOrganization();
  const { success, error } = useAlert();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

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
      setFormData(initialFormState);
      setCurrentStep(1);
      success('Success', 'Employee added successfully', () => {
        router.replace('/(hr)/employees');
      });
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to add employee');
    },
  });

  // Step validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.fullName.trim()) {
          error('Required', 'Please enter employee name');
          return false;
        }
        if (!formData.email.trim()) {
          error('Required', 'Please enter email address');
          return false;
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          error('Invalid', 'Please enter a valid email address');
          return false;
        }
        return true;
      case 2:
        // Role is pre-selected, so always valid
        return true;
      case 3:
        // All optional, always valid
        if (formData.password.trim() && formData.password.length < 6) {
          error('Invalid', 'Password must be at least 6 characters');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (validateStep(currentStep)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      router.replace('/(hr)/employees');
    }
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;
    if (!organization?.id) {
      error('Error', 'Organization not found');
      return;
    }

    createEmployeeMutation.mutate({
      email: formData.email.trim().toLowerCase(),
      password: formData.password.trim() ? formData.password.trim() : undefined,
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

  // Progress indicator
  const ProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.progressStep}>
          <View
            style={[
              styles.progressDot,
              step === currentStep && styles.progressDotActive,
              step < currentStep && styles.progressDotComplete,
            ]}
          >
            {step < currentStep ? (
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.progressDotText,
                (step === currentStep || step < currentStep) && styles.progressDotTextActive
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 3 && (
            <View style={[
              styles.progressLine,
              step < currentStep && styles.progressLineComplete
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  // Step titles
  const stepTitles = [
    { title: 'Basic Info', subtitle: 'Name and contact details' },
    { title: 'Role & Work', subtitle: 'Position in your team' },
    { title: 'Salary Setup', subtitle: 'Compensation details' },
  ];

  // Render Step 1: Essentials
  const renderStep1 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholderTextColor={Colors.textTertiary}
            autoFocus
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="next"
          />
        </View>
        <Text style={styles.helperText}>This will be used for login</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="done"
          />
        </View>
      </View>
    </Animated.View>
  );

  // Render Step 2: Role & Work
  const renderStep2 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleContainer}>
          <Pressable
            style={[
              styles.roleCard,
              formData.role === 'employee' && styles.roleCardActive,
            ]}
            onPress={() => setFormData({ ...formData, role: 'employee' })}
          >
            <View style={[
              styles.roleIconContainer,
              formData.role === 'employee' && styles.roleIconContainerActive
            ]}>
              <MaterialCommunityIcons
                name="account"
                size={28}
                color={formData.role === 'employee' ? Colors.primary : Colors.gray400}
              />
            </View>
            <Text style={[
              styles.roleCardTitle,
              formData.role === 'employee' && styles.roleCardTitleActive
            ]}>
              Employee
            </Text>
            <Text style={styles.roleCardSubtitle}>Regular team member</Text>
            {formData.role === 'employee' && (
              <View style={styles.roleCheckmark}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
              </View>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.roleCard,
              formData.role === 'hr' && styles.roleCardActive,
            ]}
            onPress={() => setFormData({ ...formData, role: 'hr' })}
          >
            <View style={[
              styles.roleIconContainer,
              formData.role === 'hr' && styles.roleIconContainerActive
            ]}>
              <MaterialCommunityIcons
                name="shield-account"
                size={28}
                color={formData.role === 'hr' ? Colors.primary : Colors.gray400}
              />
            </View>
            <Text style={[
              styles.roleCardTitle,
              formData.role === 'hr' && styles.roleCardTitleActive
            ]}>
              HR / Admin
            </Text>
            <Text style={styles.roleCardSubtitle}>Can manage team</Text>
            {formData.role === 'hr' && (
              <View style={styles.roleCheckmark}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Department</Text>
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="office-building-outline" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="e.g., Sales, Engineering"
            value={formData.department}
            onChangeText={(text) => setFormData({ ...formData, department: text })}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Designation</Text>
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="account-tie-outline" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="e.g., Manager, Executive"
            value={formData.designation}
            onChangeText={(text) => setFormData({ ...formData, designation: text })}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="done"
          />
        </View>
      </View>

      <DatePicker
        value={formData.dateOfJoining}
        onChange={(date) => setFormData({ ...formData, dateOfJoining: date })}
        label="Date of Joining"
        maximumDate={new Date()}
      />
    </Animated.View>
  );

  // Render Step 3: Salary & Details
  const renderStep3 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
      {/* Salary Section */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="cash" size={20} color={Colors.primary} />
        <Text style={styles.sectionHeaderText}>Salary Configuration</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Monthly Base Salary</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={styles.input}
            placeholder="25,000"
            value={formData.baseSalary}
            onChangeText={(text) => setFormData({ ...formData, baseSalary: text.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholderTextColor={Colors.textTertiary}
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
          <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="8"
            value={formData.dailyWorkingHours}
            onChangeText={(text) => setFormData({ ...formData, dailyWorkingHours: text })}
            keyboardType="numeric"
            placeholderTextColor={Colors.textTertiary}
          />
          <Text style={styles.inputSuffix}>hours</Text>
        </View>
      </View>

      {baseSalaryNum > 0 && monthlyHours > 0 && (
        <View style={styles.calculationCard}>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Monthly Hours</Text>
            <Text style={styles.calculationValue}>{monthlyHours.toFixed(0)}h</Text>
          </View>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Hourly Rate</Text>
            <Text style={styles.calculationValue}>₹{hourlyRate.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Optional Fields Toggle */}
      <TouchableOpacity
        style={styles.optionalToggle}
        onPress={() => setShowOptionalFields(!showOptionalFields)}
        activeOpacity={0.7}
      >
        <View style={styles.optionalToggleLeft}>
          <MaterialCommunityIcons
            name={showOptionalFields ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.textSecondary}
          />
          <Text style={styles.optionalToggleText}>
            {showOptionalFields ? 'Hide' : 'Show'} additional fields
          </Text>
        </View>
        <Text style={styles.optionalBadge}>Optional</Text>
      </TouchableOpacity>

      {showOptionalFields && (
        <Animated.View entering={FadeIn.duration(200)}>
          {/* Password */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.sectionHeaderText}>Login Password</Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />
              <TextInput
                style={styles.input}
                placeholder="Leave empty to use email as password"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          {/* Identity */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.sectionHeaderText}>Identity Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Aadhaar Number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="12-digit Aadhaar number"
                value={formData.aadhaarNumber}
                onChangeText={(text) => {
                  const digitsOnly = text.replace(/\D/g, '');
                  if (digitsOnly.length <= 12) {
                    setFormData({ ...formData, aadhaarNumber: digitsOnly });
                  }
                }}
                keyboardType="numeric"
                maxLength={12}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <DatePicker
            value={formData.dateOfBirth}
            onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
            label="Date of Birth"
            maximumDate={new Date()}
          />

          {/* Bank Details */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bank-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.sectionHeaderText}>Bank Account</Text>
          </View>

          <BankAccountForm
            bankName={formData.bankName}
            onBankNameChange={(text) => setFormData({ ...formData, bankName: text })}
            accountNumber={formData.accountNumber}
            onAccountNumberChange={(text) => setFormData({ ...formData, accountNumber: text })}
            ifscCode={formData.ifscCode}
            onIfscCodeChange={(text) => setFormData({ ...formData, ifscCode: text })}
            accountHolderName={formData.accountHolderName}
            onAccountHolderNameChange={(text) => setFormData({ ...formData, accountHolderName: text })}
            branchName={formData.branchName}
            onBranchNameChange={(text) => setFormData({ ...formData, branchName: text })}
          />
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{stepTitles[currentStep - 1].title}</Text>
          <Text style={styles.headerSubtitle}>{stepTitles[currentStep - 1].subtitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <ProgressIndicator />

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { paddingBottom: 12 }]}>
        {currentStep < TOTAL_STEPS ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, createEmployeeMutation.isPending && styles.buttonDisabled]}
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
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressDotComplete: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  progressDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressDotTextActive: {
    color: '#FFFFFF',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.gray200,
    marginHorizontal: 4,
  },
  progressLineComplete: {
    backgroundColor: Colors.success,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: 120,
  },

  // Inputs
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
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
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  inputSuffix: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    marginLeft: 2,
  },

  // Role Cards
  roleContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray100,
    position: 'relative',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  roleIconContainerActive: {
    backgroundColor: Colors.primary + '15',
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  roleCardTitleActive: {
    color: Colors.primary,
  },
  roleCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  roleCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Calculation Card
  calculationCard: {
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.success + '20',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calculationLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.success,
  },
  calculationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },

  // Optional Toggle
  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  optionalToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionalToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    ...Shadows.primary,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
