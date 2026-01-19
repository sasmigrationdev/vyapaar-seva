import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useSignOut } from "@/hooks/mutations/useAuthMutations";
import {
  useRevokeSession,
  useSignOutAllDevices,
} from "@/hooks/mutations/useSessionMutations";
import { useResetPassword } from "@/hooks/mutations/useUserMutations";
import { useAllSessions, useSessionCount } from "@/hooks/queries/useSessions";
import { formatDate } from "@/lib/utils/date.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { formatDistanceToNow } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import { useAlert } from "@/hooks/useAlert";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HRProfileScreen() {
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
    permissionStatus,
    retryRegistration,
  } = usePushNotifications();

  // Session/Device management
  const { data: sessionCount = 0, refetch: refetchCount } = useSessionCount();
  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useAllSessions();

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

    // Check if it's a long technical name (contains / or _ or is too long)
    if (fullOs.length > 12 || osVersion.includes("/") || osVersion.includes("_") || osVersion.includes("-")) {
      // Extract part before first slash, or major version number
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

  // Refetch sessions when modal opens
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

  const handleRevokeSession = (
    sessionId: string,
    deviceName: string,
    isCurrent: boolean
  ) => {
    if (isCurrent) {
      confirmDestructive(
        "Sign Out This Device",
        "This will sign you out from this device. You will need to sign in again.",
        () => signOutMutation.mutate(),
        undefined,
        "Sign Out"
      );
      return;
    }

    confirmDestructive(
      "Remove Device",
      `Sign out from ${deviceName}?`,
      () => {
        revokeSessionMutation.mutate(sessionId, {
          onSuccess: () => {
            success("Success", `Signed out from ${deviceName}`);
            refetchSessions();
            refetchCount();
          },
          onError: (err) => {
            error("Error", err.message || "Failed to remove device");
          },
        });
      },
      undefined,
      "Remove"
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
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <SafeAreaView edges={["top"]} style={styles.heroContent}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroGreeting}>{user?.full_name}</Text>
                <Text style={styles.heroEmail}>{user?.email}</Text>
              </View>

              <View style={styles.avatarButton}>
                <Text style={styles.avatarLetter}>
                  {user?.full_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.heroMetricsRow}>
              <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
                <View
                  style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
                >
                  <MaterialCommunityIcons
                    name="shield-account"
                    size={22}
                    color={Colors.textInverse}
                  />
                </View>
                <View style={styles.heroMetricContent}>
                  <Text style={styles.heroMetricLabel}>role</Text>
                  <Text style={styles.heroMetricValue}>
                    {user?.role?.toUpperCase() || "HR"}
                  </Text>
                </View>
              </View>

              <View style={[styles.heroMetricCard, styles.heroMetricSecondary]}>
                <View
                  style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
                >
                  <Feather
                    name="calendar"
                    size={22}
                    color={Colors.textInverse}
                  />
                </View>
                <View style={styles.heroMetricContent}>
                  <Text style={styles.heroMetricLabel}>joined</Text>
                  <Text style={styles.heroMetricValue} numberOfLines={1}>
                    {user?.created_at
                      ? formatDate(new Date(user.created_at))
                      : "N/A"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.heroMetricCard, styles.heroMetricTertiary]}
                onPress={handleOpenDevicesModal}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
                >
                  <MaterialCommunityIcons
                    name="devices"
                    size={22}
                    color={Colors.textInverse}
                  />
                </View>
                <View style={styles.heroMetricContent}>
                  <Text style={styles.heroMetricLabel}>devices</Text>
                  <Text style={styles.heroMetricValue}>{sessionCount}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={[styles.sectionBlock, styles.sectionBlockFirst]}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.groupedList}>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Phone</Text>
              <Text style={styles.listValue} numberOfLines={1}>
                {user?.phone || "Not provided"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Department</Text>
              <Text style={styles.listValue} numberOfLines={1}>
                {user?.department || "Not assigned"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Designation</Text>
              <Text style={styles.listValue} numberOfLines={1}>
                {user?.designation || "Not assigned"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.groupedList}>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Joined</Text>
              <Text style={styles.listValue} numberOfLines={1}>
                {user?.created_at ? formatDate(new Date(user.created_at)) : "-"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Last Updated</Text>
              <Text style={styles.listValue} numberOfLines={1}>
                {user?.updated_at ? formatDate(new Date(user.updated_at)) : "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.groupedList}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(hr)/wifi-networks")}
              activeOpacity={0.6}
            >
              <Ionicons name="wifi" size={22} color={Colors.primary} />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>WiFi Networks</Text>
                <Text style={styles.actionDescription}>
                  Configure office WiFi
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(hr)/employees")}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name="account-group"
                size={22}
                color={Colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Manage Employees</Text>
                <Text style={styles.actionDescription}>
                  View employee details
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(hr)/join-requests")}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name="account-multiple-plus"
                size={22}
                color={Colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Join Requests</Text>
                <Text style={styles.actionDescription}>
                  Review pending approvals
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(hr)/attendance")}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name="clock-check"
                size={22}
                color={Colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Attendance</Text>
                <Text style={styles.actionDescription}>Track records</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(hr)/salary")}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name="wallet"
                size={22}
                color={Colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Salary Management</Text>
                <Text style={styles.actionDescription}>Manage salaries</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(hr)/breaks")}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name="coffee"
                size={22}
                color={Colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Break Management</Text>
                <Text style={styles.actionDescription}>
                  Add and manage employee breaks
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.groupedList}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.6}
            >
              <Ionicons
                name="lock-closed-outline"
                size={22}
                color={Colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Reset Password</Text>
                <Text style={styles.actionDescription}>
                  Change your account password
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleOpenDevicesModal}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name="devices"
                size={22}
                color={Colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Manage Devices</Text>
                <Text style={styles.actionDescription}>
                  {sessionCount} active{" "}
                  {sessionCount === 1 ? "device" : "devices"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray300}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.actionItem}>
              <Ionicons
                name={expoPushToken ? "notifications" : "notifications-off-outline"}
                size={22}
                color={expoPushToken ? Colors.success : Colors.warning}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Push Notifications</Text>
                <Text style={[
                  styles.actionDescription,
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
        </View>

        <View style={styles.sectionBlock}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={signOutMutation.isPending}
            activeOpacity={0.7}
          >
            {signOutMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="logout"
                  size={20}
                  color={Colors.textInverse}
                />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerSubtext}>Salary Book & Attendance App</Text>
        </View>
      </ScrollView>

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
                  />
                  <TouchableOpacity
                    onPress={() => setShowOldPassword(!showOldPassword)}
                    style={styles.eyeIcon}
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
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeIcon}
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
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
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
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.textInverse}
                    />
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
                            color={
                              session.isCurrent
                                ? Colors.success
                                : Colors.primary
                            }
                          />
                        </View>
                        <View style={styles.deviceCardContent}>
                          <View style={styles.deviceCardTitleRow}>
                            <Text style={styles.deviceName}>
                              {session.deviceModel || session.deviceName}
                            </Text>
                            {session.isCurrent && (
                              <View style={styles.currentDeviceBadge}>
                                <Text style={styles.currentDeviceText}>
                                  Current
                                </Text>
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
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={Colors.textSecondary}
                          />
                          <Text style={styles.deviceDetailLabel}>
                            Last Active:
                          </Text>
                          <Text style={styles.deviceDetailValue}>
                            {session.isCurrent
                              ? "Just now"
                              : formatDistanceToNow(
                                  new Date(session.lastActive),
                                  { addSuffix: true }
                                )}
                          </Text>
                        </View>
                        {session.osName && session.osVersion && (() => {
                          const osDisplay = formatOsDisplay(session.osName, session.osVersion);
                          const isExpanded = expandedOsSession === session.id;

                          return (
                            <View style={styles.deviceDetailRow}>
                              <Ionicons
                                name="phone-portrait-outline"
                                size={16}
                                color={Colors.textSecondary}
                              />
                              <Text style={styles.deviceDetailLabel}>
                                OS:
                              </Text>
                              <View style={styles.osValueContainer}>
                                <Text style={styles.deviceDetailValue} numberOfLines={isExpanded ? undefined : 1}>
                                  {isExpanded ? osDisplay.full : osDisplay.short}
                                </Text>
                                {osDisplay.needsTruncation && (
                                  <TouchableOpacity
                                    onPress={() => setExpandedOsSession(isExpanded ? null : session.id)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.seeMoreText}>
                                      {isExpanded ? "less" : "more"}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        })()}
                        {session.appVersion && (
                          <View style={styles.deviceDetailRow}>
                            <Ionicons
                              name="apps-outline"
                              size={16}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.deviceDetailLabel}>
                              App:
                            </Text>
                            <Text style={styles.deviceDetailValue}>
                              v{session.appVersion}
                            </Text>
                          </View>
                        )}
                        {session.ipAddress && (
                          <View style={styles.deviceDetailRow}>
                            <Ionicons
                              name="location-outline"
                              size={16}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.deviceDetailLabel}>
                              IP Address:
                            </Text>
                            <Text style={styles.deviceDetailValue}>
                              {session.ipAddress}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Remove device button - commented out for now
                      <TouchableOpacity
                        style={[
                          styles.removeDeviceButton,
                          revokeSessionMutation.isPending && styles.removeDeviceButtonDisabled
                        ]}
                        onPress={() => handleRevokeSession(session.id, session.deviceName, session.isCurrent)}
                        disabled={revokeSessionMutation.isPending}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons 
                          name={session.isCurrent ? 'logout' : 'close-circle-outline'} 
                          size={18} 
                          color={Colors.error} 
                        />
                        <Text style={styles.removeDeviceButtonText}>
                          {session.isCurrent ? 'Sign Out' : 'Remove Device'}
                        </Text>
                      </TouchableOpacity>
                      */}
                    </View>
                  ))}

                  {allSessions.length > 1 && (
                    <TouchableOpacity
                      style={styles.signOutAllButton}
                      onPress={handleSignOutAllDevices}
                      disabled={signOutAllDevicesMutation.isPending}
                      activeOpacity={0.7}
                    >
                      {signOutAllDevicesMutation.isPending ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.textInverse}
                        />
                      ) : (
                        <>
                          <MaterialCommunityIcons
                            name="logout-variant"
                            size={18}
                            color={Colors.textInverse}
                          />
                          <Text style={styles.signOutAllButtonText}>
                            Sign Out All
                          </Text>
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
    paddingTop: 0,
    paddingBottom: 120,
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing["lg"],
  },
  heroSection: {
    marginHorizontal: -Spacing["2xl"],
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },
  heroContent: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["xl"],
    paddingBottom: Spacing["2xl"],
    gap: Spacing["lg"],
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing["xl"],
  },
  heroTextBlock: {
    flex: 1,
    gap: Spacing["xs"],
  },
  heroGreeting: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  heroEmail: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.85,
  },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  heroMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing["md"],
    marginTop: Spacing["sm"],
  },
  heroMetricCard: {
    flex: 1,
    minWidth: 160,
    flexBasis: "48%",
    borderRadius: BorderRadius["2xl"],
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["md"],
    gap: Spacing["sm"],
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    overflow: "hidden",
  },
  heroMetricPrimary: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroMetricSecondary: {
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroMetricTertiary: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroMetricIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius["2xl"],
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  heroMetricIconOverlay: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroMetricContent: {
    flex: 1,
    gap: Spacing["xs"],
    overflow: "hidden",
  },
  heroMetricLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
    opacity: 0.72,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  heroMetricValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  roleBadgeContainer: {
    alignItems: "center",
    marginTop: Spacing["xs"],
  },
  sectionBlock: {
    gap: Spacing["md"],
  },
  sectionBlockFirst: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  groupedList: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    width: "100%",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["lg"],
    minHeight: 48,
    backgroundColor: Colors.backgroundSecondary,
    gap: Spacing["md"],
    width: "100%",
  },
  listLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flexShrink: 0,
  },
  listValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: "right",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: Spacing["lg"],
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["lg"],
    gap: Spacing["md"],
    minHeight: 56,
  },
  actionContent: {
    flex: 1,
    gap: Spacing["xs"],
  },
  actionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  signOutButton: {
    backgroundColor: Colors.error,
    flexDirection: "row",
    paddingVertical: Spacing["md"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["sm"],
  },
  signOutButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  footer: {
    paddingVertical: Spacing["xl"],
    alignItems: "center",
    gap: Spacing["xs"],
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  footerSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
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
    padding: Spacing["xl"],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    padding: Spacing["xs"],
  },
  modalBody: {
    paddingHorizontal: Spacing["xl"],
  },
  modalScrollContent: {
    paddingTop: Spacing["xl"],
    paddingBottom: Spacing["3xl"],
  },
  inputGroup: {
    marginBottom: Spacing["lg"],
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing["sm"],
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
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["lg"],
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  eyeIcon: {
    padding: Spacing["md"],
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing["md"],
    marginTop: Spacing["md"],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.gray200,
    paddingVertical: Spacing["md"],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  resetButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing["md"],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  deviceInfoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: BorderRadius.xl,
    padding: Spacing["md"],
    marginBottom: Spacing["lg"],
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  deviceInfoHeader: {
    flexDirection: "row",
    gap: Spacing["sm"],
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
    padding: Spacing["lg"],
    marginBottom: Spacing["md"],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deviceCardHeader: {
    flexDirection: "row",
    gap: Spacing["md"],
    marginBottom: Spacing["md"],
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
    gap: Spacing["xs"],
  },
  deviceCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  deviceType: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  currentDeviceBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing["sm"],
    paddingVertical: Spacing["xs"],
    borderRadius: BorderRadius.md,
  },
  currentDeviceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    textTransform: "uppercase",
  },
  deviceCardDetails: {
    gap: Spacing["sm"],
    paddingTop: Spacing["sm"],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deviceDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["xs"],
  },
  deviceDetailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing["xs"],
  },
  deviceDetailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginLeft: "auto",
  },
  osValueContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing["xs"],
    flexWrap: "wrap",
  },
  seeMoreText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  signOutAllButton: {
    backgroundColor: Colors.error,
    flexDirection: "row",
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["lg"],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["sm"],
    marginTop: Spacing["md"],
  },
  signOutAllButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing["md"],
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing["md"],
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  removeDeviceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["xs"],
    paddingVertical: Spacing["sm"],
    paddingHorizontal: Spacing["md"],
    marginTop: Spacing["md"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.background,
  },
  removeDeviceButtonDisabled: {
    opacity: 0.5,
  },
  removeDeviceButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.error,
  },
  successText: {
    color: Colors.success,
  },
  warningText: {
    color: Colors.warning,
  },
  enableButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing["md"],
    paddingVertical: Spacing["sm"],
    borderRadius: BorderRadius.lg,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  enableButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
