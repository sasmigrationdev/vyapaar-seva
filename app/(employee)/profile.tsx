import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAlert } from '@/hooks/useAlert';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/auth/useAuth';
import { useSignOut } from '@/hooks/mutations/useAuthMutations';
import { useResetPassword } from '@/hooks/mutations/useUserMutations';
import { useIsCurrentlyEmployed } from '@/hooks/queries/useEmployerRequests';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAutoCheckinSetting } from '@/hooks/queries/useUserSettings';
import { useUpdateAutoCheckinSetting } from '@/hooks/mutations/useUserSettingsMutations';
import { formatDate } from '@/lib/utils/date.utils';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients, CardStyles } from '@/constants/theme';
import { LocalAuthSettings } from '@/components/localAuth/LocalAuthSettings';
import { EditPersonalInfoModal, EditBankInfoModal } from '@/components/profile';

// Utility: Mask sensitive data
const maskValue = (value: string | null | undefined, visibleChars: number = 4, separator?: string): string => {
  if (!value) return 'Not provided';
  if (value.length <= visibleChars) return value;

  const masked = 'X'.repeat(value.length - visibleChars) + value.slice(-visibleChars);

  // Add separator for Aadhaar (XXXX XXXX 1234)
  if (separator && masked.length === 12) {
    return `${masked.slice(0, 4)} ${masked.slice(4, 8)} ${masked.slice(8)}`;
  }
  return masked;
};

// Calculate tenure from join date
const calculateTenure = (joinDate: string | null | undefined): string => {
  if (!joinDate) return 'N/A';

  const start = new Date(joinDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  if (months < 1) return 'Just joined';
  if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${remainingMonths}m`;
};

// Info Row Component with icon
interface InfoRowProps {
  icon: string;
  iconFamily?: 'ionicons' | 'material' | 'feather';
  label: string;
  value: string | null | undefined;
  masked?: boolean;
  showToggle?: boolean;
  isVisible?: boolean;
  onToggle?: () => void;
  editable?: boolean;
  onEdit?: () => void;
}

const InfoRow = ({
  icon,
  iconFamily = 'ionicons',
  label,
  value,
  masked = false,
  showToggle = false,
  isVisible = false,
  onToggle,
  editable = false,
  onEdit
}: InfoRowProps) => {
  const IconComponent = iconFamily === 'material' ? MaterialCommunityIcons :
                        iconFamily === 'feather' ? Feather : Ionicons;

  const displayValue = masked && !isVisible
    ? maskValue(value, 4, label === 'Aadhaar Number' ? ' ' : undefined)
    : value || 'Not provided';

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <View style={styles.infoIconWrapper}>
          <IconComponent name={icon as any} size={18} color={Colors.primary} />
        </View>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{displayValue}</Text>
        </View>
      </View>
      <View style={styles.infoRowRight}>
        {showToggle && value && (
          <TouchableOpacity
            onPress={onToggle}
            style={styles.toggleButton}
            accessibilityLabel={isVisible ? `Hide ${label}` : `Show ${label}`}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isVisible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {editable && (
          <TouchableOpacity
            onPress={onEdit}
            style={styles.editButton}
            accessibilityLabel={`Edit ${label}`}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Section Header Component with optional edit action
interface SectionHeaderProps {
  icon: string;
  title: string;
  onEdit?: () => void;
  editLabel?: string;
}

const SectionHeader = ({ icon, title, onEdit, editLabel = 'Edit' }: SectionHeaderProps) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <MaterialCommunityIcons name={icon as any} size={20} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {onEdit && (
      <TouchableOpacity
        onPress={onEdit}
        style={styles.sectionEditButton}
        activeOpacity={0.7}
        accessibilityLabel={`${editLabel} ${title}`}
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={16} color={Colors.primary} />
        <Text style={styles.sectionEditText}>{editLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refetchProfile } = useAuth();
  const { success, error, confirmDestructive } = useAlert();
  const signOutMutation = useSignOut();
  const resetPasswordMutation = useResetPassword();

  const { data: isCurrentlyEmployed } = useIsCurrentlyEmployed(user?.id || '');

  // Push notifications
  const {
    expoPushToken,
    error: pushError,
    isRegistering,
    isExpoGo,
    retryRegistration,
  } = usePushNotifications();

  // Auto check-in setting
  const { data: autoCheckinEnabled = false } = useAutoCheckinSetting(user?.id || '');
  const updateAutoCheckinMutation = useUpdateAutoCheckinSetting(user?.id || '');

  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile edit modals
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);

  // Visibility toggles for sensitive data
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSignOut = () => {
    confirmDestructive(
      'Sign Out',
      'Are you sure you want to sign out?',
      () => signOutMutation.mutate(),
      undefined,
      'Sign Out'
    );
  };

  const handleResetPassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      error('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      error('Error', 'New password must be at least 6 characters long');
      return;
    }

    if (!user?.email) {
      error('Error', 'User information not found');
      return;
    }

    resetPasswordMutation.mutate(
      {
        email: user.email,
        oldPassword,
        newPassword,
      },
      {
        onSuccess: () => {
          success('Success', 'Password reset successfully');
          setShowPasswordModal(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => {
          error('Error', err.message || 'Failed to reset password');
        },
      }
    );
  };

  const handleChangeEmployer = () => {
    router.push('/(employee)/change-employer');
  };

  const handleEnablePushNotifications = async () => {
    const result = await retryRegistration();
    if (result) {
      success('Success', 'Push notifications enabled successfully');
    } else if (isExpoGo) {
      error('Not Supported', 'Push notifications require the installed app (APK), not Expo Go.');
    } else if (pushError) {
      error('Error', pushError);
    } else {
      error('Error', 'Failed to enable push notifications. Please check your device settings.');
    }
  };

  const handleToggleAutoCheckin = () => {
    updateAutoCheckinMutation.mutate(!autoCheckinEnabled, {
      onSuccess: (enabled) => {
        success(
          enabled ? 'Auto Check-In Enabled' : 'Auto Check-In Disabled',
          enabled
            ? 'You will be automatically checked in/out based on office WiFi.'
            : 'Automatic WiFi-based check-in/out has been disabled.'
        );
      },
      onError: (err) => {
        error('Error', err.message || 'Failed to update auto check-in setting');
      },
    });
  };

  const hasBankDetails = user?.bank_name || user?.account_number || user?.ifsc_code;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Hero Section - Centered Avatar Design */}
        <LinearGradient
          colors={Gradients.saffronHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <SafeAreaView edges={['top']} style={styles.heroContent}>
            {/* Centered Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Name & Email */}
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroName}>{user?.full_name || 'User'}</Text>
              <Text style={styles.heroEmail}>{user?.email}</Text>
            </View>

            {/* Employment Status Badge */}
            <View style={styles.statusBadgeContainer}>
              <View style={[
                styles.statusBadge,
                isCurrentlyEmployed ? styles.statusBadgeActive : styles.statusBadgeInactive
              ]}>
                <Ionicons
                  name={isCurrentlyEmployed ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={isCurrentlyEmployed ? Colors.success : Colors.warning}
                />
                <Text style={[
                  styles.statusBadgeText,
                  { color: isCurrentlyEmployed ? Colors.success : Colors.warning }
                ]}>
                  {isCurrentlyEmployed ? 'Active Employee' : 'Not Employed'}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Quick Stats Row */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <MaterialCommunityIcons name="office-building" size={20} color={Colors.primary} />
            <Text style={styles.quickStatLabel}>Department</Text>
            <Text style={styles.quickStatValue} numberOfLines={1}>
              {user?.department || 'Not assigned'}
            </Text>
          </View>

          <View style={styles.quickStatCard}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color={Colors.secondary} />
            <Text style={styles.quickStatLabel}>Tenure</Text>
            <Text style={styles.quickStatValue}>
              {calculateTenure(user?.created_at)}
            </Text>
          </View>
        </Animated.View>

        {/* Personal Information Card */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.card}>
          <SectionHeader
            icon="account-circle"
            title="Personal Information"
            onEdit={() => setShowPersonalInfoModal(true)}
          />

          <View style={styles.cardContent}>
            <InfoRow
              icon="call-outline"
              label="Phone Number"
              value={user?.phone}
            />
            <View style={styles.rowDivider} />

            <InfoRow
              icon="calendar-outline"
              label="Date of Birth"
              value={user?.date_of_birth ? formatDate(new Date(user.date_of_birth)) : null}
            />
            <View style={styles.rowDivider} />

            <InfoRow
              icon="card-outline"
              label="Aadhaar Number"
              value={user?.aadhaar_number}
              masked
              showToggle
              isVisible={showAadhaar}
              onToggle={() => setShowAadhaar(!showAadhaar)}
            />
          </View>
        </Animated.View>

        {/* Work Information Card */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
          <SectionHeader icon="briefcase" title="Work Information" />

          <View style={styles.cardContent}>
            <InfoRow
              icon="office-building"
              iconFamily="material"
              label="Department"
              value={user?.department}
            />
            <View style={styles.rowDivider} />

            <InfoRow
              icon="badge-account-horizontal"
              iconFamily="material"
              label="Designation"
              value={user?.designation}
            />
            <View style={styles.rowDivider} />

            <InfoRow
              icon="calendar-check"
              iconFamily="material"
              label="Joined Date"
              value={user?.created_at ? formatDate(new Date(user.created_at)) : null}
            />
          </View>
        </Animated.View>

        {/* Banking Information Card */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
          <SectionHeader
            icon="bank"
            title="Banking Information"
            onEdit={() => setShowBankInfoModal(true)}
            editLabel={hasBankDetails ? 'Edit' : 'Add'}
          />

          {hasBankDetails ? (
            <View style={styles.cardContent}>
              {user?.bank_name && (
                <>
                  <InfoRow
                    icon="bank"
                    iconFamily="material"
                    label="Bank Name"
                    value={user.bank_name}
                  />
                  <View style={styles.rowDivider} />
                </>
              )}

              {user?.account_holder_name && (
                <>
                  <InfoRow
                    icon="account"
                    iconFamily="material"
                    label="Account Holder"
                    value={user.account_holder_name}
                  />
                  <View style={styles.rowDivider} />
                </>
              )}

              {user?.account_number && (
                <>
                  <InfoRow
                    icon="credit-card"
                    iconFamily="material"
                    label="Account Number"
                    value={user.account_number}
                    masked
                    showToggle
                    isVisible={showAccountNumber}
                    onToggle={() => setShowAccountNumber(!showAccountNumber)}
                  />
                  <View style={styles.rowDivider} />
                </>
              )}

              {user?.ifsc_code && (
                <>
                  <InfoRow
                    icon="pound"
                    iconFamily="material"
                    label="IFSC Code"
                    value={user.ifsc_code}
                  />
                  {user?.branch_name && <View style={styles.rowDivider} />}
                </>
              )}

              {user?.branch_name && (
                <InfoRow
                  icon="map-marker"
                  iconFamily="material"
                  label="Branch"
                  value={user.branch_name}
                />
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bank-off" size={40} color={Colors.gray300} />
              <Text style={styles.emptyStateTitle}>No bank details</Text>
              <Text style={styles.emptyStateSubtitle}>Your bank account details will appear here once added</Text>
              <TouchableOpacity
                style={styles.addBankButton}
                onPress={() => setShowBankInfoModal(true)}
                activeOpacity={0.7}
                accessibilityLabel="Add Bank Details"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addBankButtonText}>Add Bank Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Employment Actions Card */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.card}>
          <SectionHeader icon="briefcase-account" title="Employment" />

          <View style={styles.cardContent}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(employee)/employment-history')}
              activeOpacity={0.6}
              accessibilityLabel="Employment History: View your past and current employment"
              accessibilityRole="button"
            >
              <View style={styles.actionIconWrapper}>
                <MaterialCommunityIcons name="history" size={20} color={Colors.primary} />
              </View>
              <View style={styles.actionTextWrapper}>
                <Text style={styles.actionLabel}>Employment History</Text>
                <Text style={styles.actionDescription}>View your past and current employment</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(employee)/search-employer')}
              activeOpacity={0.6}
              accessibilityLabel={`Search Employer: ${isCurrentlyEmployed ? 'Find and request to join new employer' : 'Find employer to join'}`}
              accessibilityRole="button"
            >
              <View style={styles.actionIconWrapper}>
                <MaterialCommunityIcons name="account-search" size={20} color={Colors.primary} />
              </View>
              <View style={styles.actionTextWrapper}>
                <Text style={styles.actionLabel}>Search Employer</Text>
                <Text style={styles.actionDescription}>
                  {isCurrentlyEmployed ? 'Find and request to join new employer' : 'Find employer to join'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
            </TouchableOpacity>

            {isCurrentlyEmployed && (
              <>
                <View style={styles.rowDivider} />
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={handleChangeEmployer}
                  activeOpacity={0.6}
                  accessibilityLabel="Change Employer: Leave current employer and join another"
                  accessibilityRole="button"
                >
                  <View style={[styles.actionIconWrapper, styles.actionIconDanger]}>
                    <MaterialCommunityIcons name="briefcase-remove" size={20} color={Colors.error} />
                  </View>
                  <View style={styles.actionTextWrapper}>
                    <Text style={[styles.actionLabel, { color: Colors.error }]}>Change Employer</Text>
                    <Text style={styles.actionDescription}>Leave current employer and join another</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>

        {/* Security Card */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.card}>
          <SectionHeader icon="shield-lock" title="Security" />

          <View style={styles.cardContent}>
            <InfoRow
              icon="mail-outline"
              label="Email Address"
              value={user?.email}
            />
            <View style={styles.rowDivider} />

            <InfoRow
              icon="time-outline"
              label="Last Updated"
              value={user?.updated_at ? formatDate(new Date(user.updated_at)) : null}
            />
            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.6}
              accessibilityLabel="Change Password: Update your account password"
              accessibilityRole="button"
            >
              <View style={styles.actionIconWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.actionTextWrapper}>
                <Text style={styles.actionLabel}>Change Password</Text>
                <Text style={styles.actionDescription}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <LocalAuthSettings />

            <View style={styles.rowDivider} />

            {/* Auto Check-In Setting */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleToggleAutoCheckin}
              disabled={updateAutoCheckinMutation.isPending}
              activeOpacity={0.6}
              accessibilityLabel={`Auto Check-In: ${autoCheckinEnabled ? 'Enabled, auto check-in/out via WiFi' : 'Disabled, tap to enable'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: autoCheckinEnabled, disabled: updateAutoCheckinMutation.isPending }}
            >
              <View style={[
                styles.actionIconWrapper,
                autoCheckinEnabled ? styles.actionIconSuccess : undefined
              ]}>
                <MaterialCommunityIcons
                  name="wifi"
                  size={20}
                  color={autoCheckinEnabled ? Colors.success : Colors.primary}
                />
              </View>
              <View style={styles.actionTextWrapper}>
                <Text style={styles.actionLabel}>Auto Check-In</Text>
                <Text style={[
                  styles.actionDescription,
                  autoCheckinEnabled && styles.successText,
                ]}>
                  {autoCheckinEnabled
                    ? 'Auto check-in/out via WiFi enabled'
                    : 'Check in/out based on office WiFi'}
                </Text>
              </View>
              {updateAutoCheckinMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <View style={[
                  styles.toggleSwitch,
                  autoCheckinEnabled && styles.toggleSwitchActive
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    autoCheckinEnabled && styles.toggleKnobActive
                  ]} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <View style={styles.actionRow}>
              <View style={[
                styles.actionIconWrapper,
                expoPushToken ? styles.actionIconSuccess : styles.actionIconWarning
              ]}>
                <Ionicons
                  name={expoPushToken ? 'notifications' : 'notifications-off-outline'}
                  size={20}
                  color={expoPushToken ? Colors.success : Colors.warning}
                />
              </View>
              <View style={styles.actionTextWrapper}>
                <Text style={styles.actionLabel}>Push Notifications</Text>
                <Text style={[
                  styles.actionDescription,
                  expoPushToken && styles.successText,
                  !expoPushToken && !isExpoGo && styles.warningText,
                ]}>
                  {isExpoGo
                    ? 'Not available in Expo Go'
                    : expoPushToken
                    ? 'Enabled'
                    : pushError || 'Not enabled'}
                </Text>
              </View>
              {!expoPushToken && !isExpoGo && (
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={handleEnablePushNotifications}
                  disabled={isRegistering}
                  activeOpacity={0.7}
                  accessibilityLabel="Enable push notifications"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isRegistering }}
                >
                  {isRegistering ? (
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.enableButtonText}>Enable</Text>
                  )}
                </TouchableOpacity>
              )}
              {expoPushToken && (
                <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              )}
            </View>
          </View>
        </Animated.View>

        {/* Sign Out Button */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={signOutMutation.isPending}
            activeOpacity={0.7}
            accessibilityLabel="Sign Out"
            accessibilityRole="button"
            accessibilityState={{ disabled: signOutMutation.isPending }}
            accessibilityHint="Sign out of your account"
          >
            {signOutMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={20} color={Colors.textInverse} />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerSubtext}>Salary Book & Attendance App</Text>
        </Animated.View>
      </ScrollView>

      {/* Password Reset Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalCloseButton}
                accessibilityLabel="Close password modal"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    secureTextEntry={!showOldPassword}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                    accessibilityLabel="Current password input"
                    accessibilityHint="Enter your current password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowOldPassword(!showOldPassword)}
                    style={styles.eyeIcon}
                    accessibilityLabel={showOldPassword ? 'Hide current password' : 'Show current password'}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showOldPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                    accessibilityLabel="New password input"
                    accessibilityHint="Enter your new password, minimum 6 characters"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeIcon}
                    accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                    accessibilityLabel="Confirm new password input"
                    accessibilityHint="Re-enter your new password to confirm"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                    accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPasswordModal(false)}
                  disabled={resetPasswordMutation.isPending}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: resetPasswordMutation.isPending }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                  accessibilityLabel={resetPasswordMutation.isPending ? 'Updating password' : 'Update Password'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: resetPasswordMutation.isPending }}
                >
                  {resetPasswordMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.confirmButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Personal Info Modal */}
      <EditPersonalInfoModal
        visible={showPersonalInfoModal}
        onClose={() => setShowPersonalInfoModal(false)}
        user={user}
        onSuccess={refetchProfile}
      />

      {/* Edit Bank Info Modal */}
      <EditBankInfoModal
        visible={showBankInfoModal}
        onClose={() => setShowBankInfoModal(false)}
        user={user}
        onSuccess={refetchProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero Section
  heroSection: {
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
  },
  heroContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: {
    marginBottom: Spacing.sm,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  heroTextContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  heroEmail: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textInverse,
    opacity: 0.85,
  },
  statusBadgeContainer: {
    marginTop: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    gap: Spacing.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadows.md,
  },
  quickStatLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickStatValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },

  // Cards
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardContent: {
    paddingBottom: Spacing.xs,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  sectionEditText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextWrapper: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },
  infoRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleButton: {
    padding: Spacing.sm,
  },
  editButton: {
    padding: Spacing.sm,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginLeft: Spacing.lg + 36 + Spacing.md,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 64,
  },
  actionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconDanger: {
    backgroundColor: Colors.error + '12',
  },
  actionTextWrapper: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing['2xl'],
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  addBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
  },
  addBankButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Sign Out Button
  signOutButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing['2xl'],
    backgroundColor: Colors.error,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  signOutButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },

  // Footer
  footer: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },

  // Modals
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
    maxHeight: '80%',
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
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  eyeIcon: {
    padding: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
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
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  successText: {
    color: Colors.success,
  },
  warningText: {
    color: Colors.warning,
  },
  actionIconSuccess: {
    backgroundColor: Colors.success + '12',
  },
  actionIconWarning: {
    backgroundColor: Colors.warning + '12',
  },
  enableButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  // Toggle Switch Styles
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray200,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: Colors.success,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
});
