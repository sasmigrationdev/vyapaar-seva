import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useSignOut } from "@/hooks/mutations/useAuthMutations";
import {
  useRevokeSession,
  useSignOutAllDevices,
} from "@/hooks/mutations/useSessionMutations";
import { useResetPassword } from "@/hooks/mutations/useUserMutations";
import { useAllSessions, useSessionCount } from "@/hooks/queries/useSessions";
import { useCurrentOrganization, useOrganizationStats } from "@/hooks/queries/useOrganization";
import { usePendingJoinRequests } from "@/hooks/queries/useEmployerRequests";
import { usePendingBreakRequests } from "@/hooks/queries/useBreakRequests";
import { usePendingOvertimeCount } from "@/hooks/queries/useOvertimeRequests";
import { useHRPendingLeaveRequests } from "@/hooks/queries/useLeave";
import { formatDate } from "@/lib/utils/date.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAlert } from "@/hooks/useAlert";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { LocalAuthSettings } from "@/components/localAuth/LocalAuthSettings";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileActionBar from "@/components/profile/ProfileActionBar";

export default function HRProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, confirmDestructive } = useAlert();
  const signOutMutation = useSignOut();
  const resetPasswordMutation = useResetPassword();
  const signOutAllDevicesMutation = useSignOutAllDevices();
  const revokeSessionMutation = useRevokeSession();

  // Push notifications
  const {
    expoPushToken,
    error: pushError,
    isRegistering,
    isExpoGo,
    retryRegistration,
  } = usePushNotifications();

  // Session/Device management
  const { data: sessionCount = 0, refetch: refetchCount } = useSessionCount();
  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useAllSessions();

  // Organization data
  const { data: organization } = useCurrentOrganization();
  const organizationId = user?.organization_id || "";
  const { data: orgStats } = useOrganizationStats(organizationId);

  // Pending requests for badges
  const { data: pendingJoinRequests } = usePendingJoinRequests(organizationId);
  const { data: pendingBreakRequests } = usePendingBreakRequests(organizationId);
  const { data: pendingOvertimeCount } = usePendingOvertimeCount(organizationId);
  const { data: pendingLeaves } = useHRPendingLeaveRequests(organizationId);

  const pendingJoinCount = pendingJoinRequests?.length || 0;
  const pendingBreakCount = pendingBreakRequests?.length || 0;
  const pendingOvertimeRequestsCount = pendingOvertimeCount || 0;
  const pendingLeavesCount = pendingLeaves?.length || 0;

  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [expandedOsSession, setExpandedOsSession] = useState<string | null>(null);

  // Helper to format OS display with truncation
  const formatOsDisplay = (osName: string | null, osVersion: string | null): { short: string; full: string; needsTruncation: boolean } => {
    if (!osName || !osVersion) return { short: "", full: "", needsTruncation: false };

    const fullOs = `${osName} ${osVersion}`;

    if (fullOs.length > 12 || osVersion.includes("/") || osVersion.includes("_") || osVersion.includes("-")) {
      const beforeSlash = osVersion.split("/")[0].trim();
      const shortOs = `${osName} ${beforeSlash}`;
      return { short: shortOs, full: fullOs, needsTruncation: true };
    }

    return { short: fullOs, full: fullOs, needsTruncation: false };
  };

  // Refetch sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchSessions();
      refetchCount();
    }, [refetchSessions, refetchCount])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSessions(), refetchCount()]);
    setRefreshing(false);
  };

  const handleOpenDevicesModal = () => {
    setShowDevicesModal(true);
    refetchSessions();
  };

  const handleSignOut = () => {
    confirmDestructive(
      "Sign Out",
      "Are you sure you want to sign out?",
      () => signOutMutation.mutate(),
      undefined,
      "Sign Out"
    );
  };

  const handleResetPassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      error("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      error("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      error("Error", "New password must be at least 6 characters long");
      return;
    }

    if (!user?.email) {
      error("Error", "User information not found");
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
          success("Success", "Password reset successfully");
          setShowPasswordModal(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err) => {
          error("Error", err.message || "Failed to reset password");
        },
      }
    );
  };

  const handleSignOutAllDevices = () => {
    confirmDestructive(
      "Sign Out Everywhere",
      "This will sign you out from all devices including this one. You will need to sign in again. Are you sure?",
      () => {
        signOutAllDevicesMutation.mutate(undefined, {
          onSuccess: () => {
            success("Success", "Signed out from all devices");
            setShowDevicesModal(false);
          },
          onError: (err) => {
            error("Error", err.message || "Failed to sign out");
          },
        });
      },
      undefined,
      "Sign Out"
    );
  };

  const handleEnablePushNotifications = async () => {
    const result = await retryRegistration();
    if (result) {
      success("Success", "Push notifications enabled successfully");
    } else if (isExpoGo) {
      error("Not Supported", "Push notifications require the installed app (APK), not Expo Go.");
    } else if (pushError) {
      error("Error", pushError);
    } else {
      error("Error", "Failed to enable push notifications. Please check your device settings.");
    }
  };

  const handleCopyEmployerCode = () => {
    if (organization?.employer_code) {
      Clipboard.setString(organization.employer_code);
      success("Copied!", "Employer code copied to clipboard. Share this with employees to join your organization.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

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
        {/* Hero Section */}
        <ProfileHero user={user} />

        {/* Bento Stats Card - Floating over hero */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.bentoStatsContainer}
        >
          <View style={styles.bentoStatsCard}>
            {/* Organization or Role */}
            <View style={styles.bentoStatItem}>
              <View style={[styles.bentoStatIcon, { backgroundColor: organization ? Colors.success + "15" : Colors.primary + "15" }]}>
                {organization ? (
                  <MaterialCommunityIcons name="domain" size={18} color={Colors.success} />
                ) : (
                  <MaterialCommunityIcons name="shield-account" size={18} color={Colors.primary} />
                )}
              </View>
              <Text
                style={[
                  styles.bentoStatValue,
                  organization && styles.bentoStatValueSmall,
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {organization?.name || user?.role?.toUpperCase() || "HR"}
              </Text>
              <Text style={styles.bentoStatLabel}>
                {organization ? "Organization" : "Role"}
              </Text>
            </View>

            <View style={styles.bentoStatDivider} />

            {/* Role (if org shown) or Joined */}
            <View style={styles.bentoStatItem}>
              <View style={[styles.bentoStatIcon, { backgroundColor: organization ? Colors.primary + "15" : Colors.info + "15" }]}>
                {organization ? (
                  <MaterialCommunityIcons name="shield-account" size={18} color={Colors.primary} />
                ) : (
                  <Feather name="calendar" size={18} color={Colors.info} />
                )}
              </View>
              <Text style={styles.bentoStatValue} numberOfLines={1}>
                {organization
                  ? (user?.role?.toUpperCase() || "HR")
                  : (user?.created_at ? formatDate(new Date(user.created_at)) : "N/A")}
              </Text>
              <Text style={styles.bentoStatLabel}>
                {organization ? "Role" : "Joined"}
              </Text>
            </View>

            <View style={styles.bentoStatDivider} />

            {/* Devices - Tappable */}
            <TouchableOpacity
              style={styles.bentoStatItem}
              onPress={handleOpenDevicesModal}
              activeOpacity={0.7}
              accessibilityLabel={`${sessionCount} active ${sessionCount === 1 ? 'device' : 'devices'}, tap to manage`}
              accessibilityRole="button"
            >
              <View style={[styles.bentoStatIcon, { backgroundColor: Colors.info + "15" }]}>
                <MaterialCommunityIcons name="devices" size={18} color={Colors.info} />
              </View>
              <Text style={styles.bentoStatValue}>{sessionCount}</Text>
              <Text style={styles.bentoStatLabel}>
                {sessionCount === 1 ? "Device" : "Devices"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Organization Information */}
        {organization && (
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Organization</Text>
            <View style={styles.settingsCard}>
              {/* Employer Code - Tappable to copy */}
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleCopyEmployerCode}
                activeOpacity={0.6}
                accessibilityLabel={`Employer Code: ${organization.employer_code}. Tap to copy.`}
                accessibilityRole="button"
              >
                <View style={[styles.settingsItemIcon, { backgroundColor: Colors.primary + "12" }]}>
                  <MaterialCommunityIcons name="qrcode" size={20} color={Colors.primary} />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemLabel}>Employer Code</Text>
                  <Text style={styles.employerCodeValue}>{organization.employer_code || "Not set"}</Text>
                </View>
                <View style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.settingsDivider} />

              {/* Team Size */}
              <View style={styles.settingsItem}>
                <View style={[styles.settingsItemIcon, { backgroundColor: Colors.secondary + "12" }]}>
                  <MaterialCommunityIcons name="account-group" size={20} color={Colors.secondary} />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemLabel}>Team Size</Text>
                  <Text style={styles.settingsItemDescription}>
                    {orgStats?.totalEmployees || 0} members ({orgStats?.activeEmployees || 0} active)
                  </Text>
                </View>
              </View>

              {organization.description && (
                <>
                  <View style={styles.settingsDivider} />
                  <View style={styles.settingsItem}>
                    <View style={[styles.settingsItemIcon, { backgroundColor: Colors.info + "12" }]}>
                      <MaterialCommunityIcons name="text-box-outline" size={20} color={Colors.info} />
                    </View>
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemLabel}>Description</Text>
                      <Text style={styles.settingsItemDescription} numberOfLines={2}>
                        {organization.description}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.settingsDivider} />

              {/* Created Date */}
              <View style={styles.settingsItem}>
                <View style={[styles.settingsItemIcon, { backgroundColor: Colors.gray200 }]}>
                  <Feather name="calendar" size={18} color={Colors.textSecondary} />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemLabel}>Created</Text>
                  <Text style={styles.settingsItemDescription}>
                    {organization.created_at ? formatDate(new Date(organization.created_at)) : "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Contact Info - Only show if phone is available */}
        {user?.phone && (
          <Animated.View
            entering={FadeInDown.delay(organization ? 200 : 150).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingsItem}>
                <View style={[styles.settingsItemIcon, { backgroundColor: Colors.success + "12" }]}>
                  <Ionicons name="call-outline" size={20} color={Colors.success} />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemLabel}>Phone</Text>
                  <Text style={styles.settingsItemDescription}>{user.phone}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Organization Settings */}
        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Organization Settings</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/(hr)/wifi-networks")}
              activeOpacity={0.6}
              accessibilityLabel="WiFi Networks: Configure office WiFi for attendance"
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.info + "12" }]}>
                <MaterialCommunityIcons name="wifi-cog" size={20} color={Colors.info} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>WiFi Networks</Text>
                <Text style={styles.settingsItemDescription}>Configure office WiFi for attendance</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/(hr)/categories")}
              activeOpacity={0.6}
              accessibilityLabel="Categories: Manage cashbook categories"
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.warning + "12" }]}>
                <MaterialCommunityIcons name="shape-outline" size={20} color={Colors.warning} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Categories</Text>
                <Text style={styles.settingsItemDescription}>Manage cashbook categories</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Management Quick Links */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/(hr)/join-requests")}
              activeOpacity={0.6}
              accessibilityLabel={`Join Requests: ${pendingJoinCount > 0 ? `${pendingJoinCount} pending` : 'All clear'}`}
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.primary + "12" }]}>
                <MaterialCommunityIcons name="account-multiple-plus" size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Join Requests</Text>
                <Text style={styles.settingsItemDescription}>
                  {pendingJoinCount > 0 ? `${pendingJoinCount} pending` : 'All clear'}
                </Text>
              </View>
              {pendingJoinCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingJoinCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/(hr)/leave")}
              activeOpacity={0.6}
              accessibilityLabel={`Leave Requests: ${pendingLeavesCount > 0 ? `${pendingLeavesCount} pending` : 'All clear'}`}
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.error + "12" }]}>
                <MaterialCommunityIcons name="palm-tree" size={20} color={Colors.error} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Leave Requests</Text>
                <Text style={styles.settingsItemDescription}>
                  {pendingLeavesCount > 0 ? `${pendingLeavesCount} pending` : 'All clear'}
                </Text>
              </View>
              {pendingLeavesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingLeavesCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/(hr)/break-requests")}
              activeOpacity={0.6}
              accessibilityLabel={`Break Requests: ${pendingBreakCount > 0 ? `${pendingBreakCount} pending` : 'All clear'}`}
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.cyan + "12" }]}>
                <MaterialCommunityIcons name="coffee" size={20} color={Colors.cyan} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Break Requests</Text>
                <Text style={styles.settingsItemDescription}>
                  {pendingBreakCount > 0 ? `${pendingBreakCount} pending` : 'All clear'}
                </Text>
              </View>
              {pendingBreakCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingBreakCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/(hr)/overtime-requests")}
              activeOpacity={0.6}
              accessibilityLabel={`Overtime Requests: ${pendingOvertimeRequestsCount > 0 ? `${pendingOvertimeRequestsCount} pending` : 'All clear'}`}
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.purple + "12" }]}>
                <MaterialCommunityIcons name="clock-plus-outline" size={20} color={Colors.purple} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Overtime Requests</Text>
                <Text style={styles.settingsItemDescription}>
                  {pendingOvertimeRequestsCount > 0 ? `${pendingOvertimeRequestsCount} pending` : 'All clear'}
                </Text>
              </View>
              {pendingOvertimeRequestsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingOvertimeRequestsCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Security Settings */}
        <Animated.View
          entering={FadeInDown.delay(350).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.6}
              accessibilityLabel="Change Password"
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.primary + "12" }]}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Change Password</Text>
                <Text style={styles.settingsItemDescription}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={handleOpenDevicesModal}
              activeOpacity={0.6}
              accessibilityLabel={`Manage Devices: ${sessionCount} active ${sessionCount === 1 ? "device" : "devices"}`}
              accessibilityRole="button"
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: Colors.info + "12" }]}>
                <MaterialCommunityIcons name="devices" size={20} color={Colors.info} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Manage Devices</Text>
                <Text style={styles.settingsItemDescription}>
                  {sessionCount} active {sessionCount === 1 ? "device" : "devices"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <LocalAuthSettings />
          </View>
        </Animated.View>

        {/* Notifications Settings */}
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingsItem}>
              <View style={[
                styles.settingsItemIcon,
                { backgroundColor: expoPushToken ? Colors.success + "12" : Colors.warning + "12" }
              ]}>
                <Ionicons
                  name={expoPushToken ? "notifications" : "notifications-off-outline"}
                  size={20}
                  color={expoPushToken ? Colors.success : Colors.warning}
                />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemLabel}>Push Notifications</Text>
                <Text style={[
                  styles.settingsItemDescription,
                  expoPushToken && styles.successText,
                  !expoPushToken && !isExpoGo && styles.warningText,
                ]}>
                  {isExpoGo
                    ? "Not available in Expo Go"
                    : expoPushToken
                    ? "Enabled"
                    : pushError || "Not enabled"}
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

        {/* Footer */}
        <Animated.View
          entering={FadeInDown.delay(450).springify()}
          style={styles.footer}
        >
          <Text style={styles.footerText}>Vyapaar Sewa v1.0.0</Text>
        </Animated.View>
      </ScrollView>

      {/* Floating Action Bar */}
      <ProfileActionBar
        onSignOut={handleSignOut}
        isSigningOut={signOutMutation.isPending}
      />

      {/* Password Reset Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
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
                    accessibilityLabel={showOldPassword ? "Hide current password" : "Show current password"}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showOldPassword ? "eye-off-outline" : "eye-outline"}
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
                    accessibilityLabel={showNewPassword ? "Hide new password" : "Show new password"}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
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
                    accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
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
                  style={styles.resetButton}
                  onPress={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                  accessibilityLabel={resetPasswordMutation.isPending ? "Resetting password" : "Reset Password"}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: resetPasswordMutation.isPending }}
                >
                  {resetPasswordMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.resetButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Devices Management Modal */}
      <Modal
        visible={showDevicesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDevicesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Active Devices</Text>
              <TouchableOpacity
                onPress={() => setShowDevicesModal(false)}
                style={styles.modalCloseButton}
                accessibilityLabel="Close devices modal"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {sessionsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading sessions...</Text>
                </View>
              ) : allSessions.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons
                    name="monitor-off"
                    size={48}
                    color={Colors.gray300}
                  />
                  <Text style={styles.emptyStateText}>No active sessions</Text>
                </View>
              ) : (
                <>
                  <View style={styles.deviceInfoCard}>
                    <View style={styles.deviceInfoHeader}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={Colors.success}
                      />
                      <Text style={styles.deviceInfoText}>
                        Showing all {allSessions.length} active{" "}
                        {allSessions.length === 1 ? "session" : "sessions"}.
                      </Text>
                    </View>
                  </View>

                  {allSessions.map((session) => (
                    <View key={session.id} style={styles.deviceCard}>
                      <View style={styles.deviceCardHeader}>
                        <View style={styles.deviceIconContainer}>
                          <MaterialCommunityIcons
                            name={
                              session.platform === "ios"
                                ? "apple"
                                : session.platform === "android"
                                ? "android"
                                : "monitor"
                            }
                            size={28}
                            color={session.isCurrent ? Colors.success : Colors.primary}
                          />
                        </View>
                        <View style={styles.deviceCardContent}>
                          <View style={styles.deviceCardTitleRow}>
                            <Text style={styles.deviceName}>
                              {session.deviceModel || session.deviceName}
                            </Text>
                            {session.isCurrent && (
                              <View style={styles.currentDeviceBadge}>
                                <Text style={styles.currentDeviceText}>Current</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.deviceType}>
                            {session.deviceManufacturer && session.deviceModel && !session.deviceModel.includes(session.deviceManufacturer)
                              ? `${session.deviceManufacturer} • ${session.deviceType}`
                              : session.deviceType}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.deviceCardDetails}>
                        <View style={styles.deviceDetailRow}>
                          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                          <Text style={styles.deviceDetailLabel}>Last Active:</Text>
                          <Text style={styles.deviceDetailValue}>
                            {session.isCurrent
                              ? "Just now"
                              : formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                          </Text>
                        </View>
                        {session.osName && session.osVersion && (() => {
                          const osDisplay = formatOsDisplay(session.osName, session.osVersion);
                          const isExpanded = expandedOsSession === session.id;

                          return (
                            <View style={styles.deviceDetailRow}>
                              <Ionicons name="phone-portrait-outline" size={16} color={Colors.textSecondary} />
                              <Text style={styles.deviceDetailLabel}>OS:</Text>
                              <View style={styles.osValueContainer}>
                                <Text style={styles.deviceDetailValue} numberOfLines={isExpanded ? undefined : 1}>
                                  {isExpanded ? osDisplay.full : osDisplay.short}
                                </Text>
                                {osDisplay.needsTruncation && (
                                  <TouchableOpacity
                                    onPress={() => setExpandedOsSession(isExpanded ? null : session.id)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.seeMoreText}>{isExpanded ? "less" : "more"}</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        })()}
                        {session.appVersion && (
                          <View style={styles.deviceDetailRow}>
                            <Ionicons name="apps-outline" size={16} color={Colors.textSecondary} />
                            <Text style={styles.deviceDetailLabel}>App:</Text>
                            <Text style={styles.deviceDetailValue}>v{session.appVersion}</Text>
                          </View>
                        )}
                        {session.ipAddress && (
                          <View style={styles.deviceDetailRow}>
                            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                            <Text style={styles.deviceDetailLabel}>IP Address:</Text>
                            <Text style={styles.deviceDetailValue}>{session.ipAddress}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                  {allSessions.length > 1 && (
                    <TouchableOpacity
                      style={styles.signOutAllButton}
                      onPress={handleSignOutAllDevices}
                      disabled={signOutAllDevicesMutation.isPending}
                      activeOpacity={0.7}
                      accessibilityLabel="Sign out from all devices"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: signOutAllDevicesMutation.isPending }}
                      accessibilityHint="This will sign you out from all devices including this one"
                    >
                      {signOutAllDevicesMutation.isPending ? (
                        <ActivityIndicator size="small" color={Colors.textInverse} />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="logout-variant" size={18} color={Colors.textInverse} />
                          <Text style={styles.signOutAllButtonText}>Sign Out All</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 160,
  },

  // Bento Stats - Float over hero
  bentoStatsContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing["2xl"],
  },
  bentoStatsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.md,
  },
  bentoStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  bentoStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bentoStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  bentoStatValueSmall: {
    fontSize: 12,
    lineHeight: 16,
  },
  bentoStatLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  bentoStatDivider: {
    width: 1,
    backgroundColor: Colors.gray100,
    marginVertical: 4,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },

  // Settings Cards
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 64,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsItemContent: {
    flex: 1,
    gap: 2,
  },
  settingsItemLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.text,
  },
  settingsItemDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 40 + Spacing.md,
  },

  // Footer
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    fontWeight: "500",
  },

  // Status text colors
  successText: {
    color: Colors.success,
  },
  warningText: {
    color: Colors.warning,
  },

  // Enable button
  enableButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  enableButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["3xl"],
    borderTopRightRadius: BorderRadius["3xl"],
    paddingBottom: Spacing["3xl"],
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    paddingHorizontal: Spacing.xl,
  },
  modalScrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.gray200,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  resetButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.textInverse,
  },

  // Device Modal styles
  deviceInfoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  deviceInfoHeader: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  deviceInfoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.info,
    lineHeight: 20,
  },
  deviceCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deviceCardHeader: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceCardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  deviceCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  deviceType: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  currentDeviceBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  currentDeviceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "700",
    color: Colors.textInverse,
    textTransform: "uppercase",
  },
  deviceCardDetails: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deviceDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  deviceDetailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  deviceDetailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: "auto",
  },
  osValueContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  seeMoreText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: "500",
  },
  signOutAllButton: {
    backgroundColor: Colors.error,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  signOutAllButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.md,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // Badge styles
  badge: {
    backgroundColor: Colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    marginRight: Spacing.xs,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "700",
    color: Colors.textInverse,
  },

  // Employer code styles
  employerCodeValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  copyButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
  },
});
