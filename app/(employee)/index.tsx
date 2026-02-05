import AddOvertimeModal from "@/components/attendance/AddOvertimeModal";
import BreakRequestModal from "@/components/attendance/BreakRequestModal";
import WiFiVerificationModal from "@/components/attendance/WiFiVerificationModal";
import AttendanceStreakBadge from "@/components/ui/AttendanceStreakBadge";
import CircularHoursProgress from "@/components/ui/CircularHoursProgress";
import { DepthButton } from "@/components/ui/DepthButton";
import { DynamicGreetingInline } from "@/components/ui/DynamicGreeting";
import MarketingBanner, { PlaceholderBanner } from "@/components/ui/MarketingBanner";
import MiniCalendarHeatmap from "@/components/ui/MiniCalendarHeatmap";
import { NeumorphicCheckInButton } from "@/components/ui/NeumorphicCheckInButton";
import { Text } from "@/components/ui/Text";
import {
  BorderRadius,
  Colors,
  Gradients,
  PressOpacity,
  Shadows,
  Spacing,
  StatusColors,
  Typography,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useCheckIn,
  useCheckOut,
} from "@/hooks/mutations/useAttendanceMutations";
import { useEndBreak } from "@/hooks/mutations/useBreakRequestMutations";
import {
  useMonthlyAttendanceSummary,
  useTodayAttendance,
} from "@/hooks/queries/useAttendance";
import { useUserAttendanceSummary } from "@/hooks/queries/useAttendanceSummary";
import { useMyBreakRequests } from "@/hooks/queries/useBreakRequests";
import { useCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useOvertimeRequestByAttendance } from "@/hooks/queries/useOvertimeRequests";
import { useEmployeeJoinRequests } from "@/hooks/queries/useEmployerRequests";
import { useCurrentEmployment } from "@/hooks/queries/useEmploymentHistory";
import { useLatestSalary } from "@/hooks/queries/useSalary";
import { useAutoRejectExpiredBreaks } from "@/hooks/useAutoRejectExpiredBreaks";
import { useAutoAttendance } from "@/hooks/useAutoAttendance";
import { WeekDay } from "@/lib/types";
import {
  calculateAttendanceStreak,
  calculateBreakDuration,
  formatHours,
} from "@/lib/utils/attendance.utils";
import { formatDate, formatTime } from "@/lib/utils/date.utils";
import { formatCurrency } from "@/lib/utils/salary.utils";
import {
  performWiFiVerification,
  WiFiVerificationResult,
} from "@/lib/utils/wifiVerification.utils";
import {
  formatWorkingDays,
  isTodayWorkingDay,
} from "@/lib/utils/workingDays.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAlert } from "@/hooks/useAlert";

export default function EmployeeDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [showBreakRequestModal, setShowBreakRequestModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);

  // WiFi Verification Modal State
  const [showWiFiModal, setShowWiFiModal] = useState(false);
  const [wifiVerificationResult, setWifiVerificationResult] =
    useState<WiFiVerificationResult | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "check-in" | "check-out" | null
  >(null);

  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useAlert();
  const userId = user?.id || "";

  const {
    data: todayAttendance,
    isLoading: loadingToday,
    error: todayError,
    refetch: refetchToday,
  } = useTodayAttendance(userId);
  const {
    data: monthlySummary,
    isLoading: loadingMonthly,
    error: monthlyError,
    refetch: refetchMonthly,
  } = useMonthlyAttendanceSummary(
    userId,
    new Date().getMonth(),
    new Date().getFullYear()
  );
  const {
    data: latestSalary,
    isLoading: loadingSalary,
    refetch: refetchSalary,
  } = useLatestSalary(userId);
  const {
    data: earnings,
    isLoading: loadingEarnings,
    refetch: refetchEarnings,
  } = useCurrentMonthEarnings(userId);
  const {
    data: monthlyStats,
    isLoading: monthlyStatsLoading,
    error: monthlyStatsError,
    refetch: refetchMonthlyStats,
  } = useUserAttendanceSummary(
    userId,
    new Date().getFullYear(),
    new Date().getMonth()
  );
  const { data: myBreakRequests, refetch: refetchBreakRequests } =
    useMyBreakRequests(userId);

  // Overtime request for today's attendance
  const { data: todayOvertimeRequest, refetch: refetchOvertimeRequest } =
    useOvertimeRequestByAttendance(todayAttendance?.id || "");

  // Employment data
  const { data: currentEmployment, refetch: refetchEmployment } =
    useCurrentEmployment(userId);
  const { data: myJoinRequests, refetch: refetchJoinRequests } =
    useEmployeeJoinRequests(userId);

  // Auto-reject expired pending break requests
  useAutoRejectExpiredBreaks(userId);

  // Find pending break request for today's attendance (awaiting HR approval)
  const pendingBreakRequest = myBreakRequests?.find(
    (req: any) =>
      req.attendance_record_id === todayAttendance?.id &&
      req.status === "pending_start"
  );

  // Find approved break that is scheduled for future (upcoming break)
  const upcomingBreak = myBreakRequests?.find((req: any) => {
    if (
      req.attendance_record_id === todayAttendance?.id &&
      req.status === "active" &&
      req.actual_start_time
    ) {
      const now = new Date();
      const startTime = new Date(req.actual_start_time);
      return now < startTime; // Break is scheduled but not started yet
    }
    return false;
  });

  // Find active break for today (currently on break)
  // Only consider it active if the actual_start_time has been reached
  const activeBreak = myBreakRequests?.find((req: any) => {
    if (
      req.attendance_record_id === todayAttendance?.id &&
      req.status === "active" &&
      req.actual_start_time
    ) {
      const now = new Date();
      const startTime = new Date(req.actual_start_time);
      return now >= startTime;
    }
    return false;
  });

  // Find completed break requests for today
  const completedBreaks =
    myBreakRequests?.filter(
      (req: any) =>
        req.attendance_record_id === todayAttendance?.id &&
        req.status === "completed"
    ) || [];

  // Calculate total break duration for today (only from completed breaks)
  const totalBreakDuration = completedBreaks.reduce(
    (total: number, req: any) => {
      if (req.actual_start_time && req.actual_end_time) {
        return (
          total +
          calculateBreakDuration(req.actual_start_time, req.actual_end_time)
        );
      }
      return total;
    },
    0
  );

  const checkInMutation = useCheckIn(userId, {
    onSuccess: () => {
      success("Success", "Checked in successfully!");
    },
    onError: (err) => {
      error(
        "Error",
        err.message || "Failed to check in. Please try again."
      );
    },
  });

  const checkOutMutation = useCheckOut(userId, {
    onSuccess: () => {
      success("Success", "Checked out successfully!");
    },
    onError: (err) => {
      error(
        "Error",
        err.message || "Failed to check out. Please try again."
      );
    },
  });

  const endBreakMutation = useEndBreak(userId, user?.organization_id, {
    onSuccess: () => {
      success("Success", "Break ended successfully!");
    },
    onError: (err: any) => {
      error(
        "Error",
        err.message || "Failed to end break. Please try again."
      );
    },
  });

  const handleCheckIn = async () => {
    if (!user?.organization_id) {
      error("Error", "Organization not found. Please contact support.");
      return;
    }

    // Perform WiFi verification
    const wifiResult = await performWiFiVerification(
      userId,
      user.organization_id
    );

    // Show modal with verification result
    setWifiVerificationResult(wifiResult);
    setPendingAction("check-in");
    setShowWiFiModal(true);

    // Only proceed if verification passed OR not required
    if (!wifiResult.isRequired || wifiResult.isVerified) {
      // Proceed with check-in after modal is shown
      setTimeout(() => {
        checkInMutation.mutate({
          notes: "Self check-in",
          wifiInfo: wifiResult.isVerified
            ? {
                ssid: wifiResult.currentSsid,
                verified: true,
              }
            : undefined,
        });
      }, 2000); // Give user 2 seconds to see the modal
    } else {
      // Verification required but failed - don't proceed
      error(
        "WiFi Verification Required",
        "Your organization requires WiFi verification. Please connect to the office WiFi network and try again."
      );
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak) {
      error("Error", "No active break found.");
      return;
    }

    if (!user?.organization_id) {
      error("Error", "Organization not found. Please contact support.");
      return;
    }

    // Perform WiFi verification
    const wifiResult = await performWiFiVerification(
      userId,
      user.organization_id
    );

    // Show modal with verification result
    setWifiVerificationResult(wifiResult);
    setPendingAction("check-in"); // Reuse check-in for display
    setShowWiFiModal(true);

    // Only proceed if verification passed OR not required
    if (!wifiResult.isRequired || wifiResult.isVerified) {
      // Proceed with ending break after modal is shown
      setTimeout(() => {
        endBreakMutation.mutate({
          breakRequestId: activeBreak.id,
          wifiSsid: wifiResult.isVerified
            ? wifiResult.currentSsid || ""
            : undefined,
          wifiVerified: wifiResult.isVerified,
        });
      }, 2000); // Give user 2 seconds to see the modal
    } else {
      // Verification required but failed - don't proceed
      error(
        "WiFi Verification Required",
        "Your organization requires WiFi verification. Please connect to the office WiFi network and try again."
      );
    }
  };

  const handleCheckOut = async () => {
    // Prevent checkout if break is active
    if (activeBreak) {
      error(
        "Break in Progress",
        "You cannot check out while on a break. Please end your break first before checking out."
      );
      return;
    }

    if (!todayAttendance?.id) {
      error(
        "Error",
        "No attendance record found. Please check in first."
      );
      return;
    }

    if (!user?.organization_id) {
      error("Error", "Organization not found. Please contact support.");
      return;
    }

    // Perform WiFi verification
    const wifiResult = await performWiFiVerification(
      userId,
      user.organization_id
    );

    // Show modal with verification result
    setWifiVerificationResult(wifiResult);
    setPendingAction("check-out");
    setShowWiFiModal(true);

    // Only proceed if verification passed OR not required
    if (!wifiResult.isRequired || wifiResult.isVerified) {
      // Proceed with check-out after modal is shown
      setTimeout(() => {
        checkOutMutation.mutate({
          recordId: todayAttendance.id,
          notes: "Self check-out",
          wifiInfo: wifiResult.isVerified
            ? {
                ssid: wifiResult.currentSsid,
                verified: true,
              }
            : undefined,
        });
      }, 2000); // Give user 2 seconds to see the modal
    } else {
      // Verification required but failed - don't proceed
      error(
        "WiFi Verification Required",
        "Your organization requires WiFi verification. Please connect to the office WiFi network and try again."
      );
    }
  };

  const isCheckedIn = todayAttendance && !todayAttendance.check_out_time;
  const workingDays = (user?.working_days || []) as WeekDay[];
  const isTodayWorking = isTodayWorkingDay(workingDays);
  const canCheckIn = !todayAttendance && isTodayWorking;

  // Auto attendance based on WiFi connectivity
  useAutoAttendance({
    userId,
    organizationId: user?.organization_id ?? undefined,
    workingDays,
    onAutoCheckin: () => {
      success("Auto Check-In", "You've been automatically checked in via WiFi.");
      refetchToday();
    },
    onAutoCheckout: () => {
      success("Auto Check-Out", "You've been automatically checked out.");
      refetchToday();
    },
    onBlocked: (reason) => {
      // Silently log blocked auto-checkout (e.g., during break)
      console.log("Auto check-out blocked:", reason);
    },
  });

  // Calculate attendance streak
  const attendanceStreak = calculateAttendanceStreak(monthlySummary?.records || []);

  // Get attendance color based on percentage
  const getAttendanceColor = (percentage?: number) => {
    if (!percentage) return Colors.gray400;
    if (percentage >= 90) return Colors.success;
    if (percentage >= 70) return Colors.warning;
    return Colors.error;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchToday(),
        refetchMonthly(),
        refetchMonthlyStats(),
        refetchSalary(),
        refetchEarnings(),
        refetchBreakRequests(),
        refetchOvertimeRequest(),
        refetchEmployment(),
        refetchJoinRequests(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Check for any loading errors
  const hasError = todayError || monthlyError || monthlyStatsError;

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
          colors={Gradients.saffronHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <DynamicGreetingInline userName={user?.full_name || ""} />
              <Text style={styles.heroGreeting}>
                {user?.full_name?.split(" ")[0]}
              </Text>
              <View style={styles.heroDatePill}>
                <Feather name="calendar" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroDateText}>
                  {formatDate(new Date())}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push("/profile")}
              accessibilityLabel="Open profile settings"
              accessibilityRole="button"
            >
              <Text style={styles.avatarLetter}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Monthly Attendance Summary */}
          <View style={styles.heroMetricsRow}>
            <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>this month</Text>
                <Text style={styles.heroMetricValue} numberOfLines={1}>
                  {monthlyStatsLoading
                    ? "--"
                    : formatHours(monthlyStats?.totalWorkingHours || 0)}
                </Text>
              </View>
            </View>

            <View style={[styles.heroMetricCard, styles.heroMetricSecondary]}>
              <View
                style={[
                  styles.heroMetricIcon,
                  {
                    backgroundColor:
                      getAttendanceColor(monthlyStats?.attendancePercentage) +
                      "20",
                  },
                ]}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={22}
                  color={getAttendanceColor(monthlyStats?.attendancePercentage)}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>attendance</Text>
                <Text style={styles.heroMetricValue} numberOfLines={1}>
                  {monthlyStatsLoading
                    ? "--"
                    : `${monthlyStats?.daysAttended || 0}d (${monthlyStats?.attendancePercentage || 0}%)`}
                </Text>
              </View>
            </View>
          </View>

          {/* Employment Status Metrics */}
          {currentEmployment && (
            <View style={styles.heroMetricsRow}>
              <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
                <View
                  style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
                >
                  <MaterialCommunityIcons
                    name="office-building"
                    size={22}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.heroMetricContent}>
                  <Text style={styles.heroMetricLabel}>employer</Text>
                  <Text
                    style={styles.heroMetricValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {currentEmployment.organization?.name || "Organization"}
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
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.heroMetricContent}>
                  <Text style={styles.heroMetricLabel}>duration</Text>
                  <Text style={styles.heroMetricValue} numberOfLines={1}>
                    {(() => {
                      const months = Math.floor(
                        (new Date().getTime() -
                          new Date(currentEmployment.joined_at).getTime()) /
                          (1000 * 60 * 60 * 24 * 30)
                      );
                      if (months < 1) return "New";
                      const years = Math.floor(months / 12);
                      const remainingMonths = months % 12;
                      if (years === 0) return `${months}mo`;
                      if (remainingMonths === 0) return `${years}yr`;
                      return `${years}y ${remainingMonths}m`;
                    })()}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Error Banner */}
        {hasError && (
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>Failed to load some data</Text>
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={PressOpacity.primary}
              accessibilityLabel="Retry loading data"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Promotional Banner Slot */}
        <Animated.View entering={FadeInDown.delay(75).springify()} style={styles.bannerSlot}>
          <MarketingBanner
            variant="gradient"
            title="Track Your Progress"
            subtitle="View detailed attendance insights and earn rewards for consistency"
            ctaText="Learn More"
            gradientColors={[Colors.primary, Colors.primaryDark]}
            badge="NEW"
            aspectRatio={3}
          />
        </Animated.View>

        <View style={styles.content}>
          {/* Attendance Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Today&apos;s Attendance</Text>
              <View style={styles.headerBadgesRow}>
                {attendanceStreak.currentStreak > 0 && (
                  <AttendanceStreakBadge
                    currentStreak={attendanceStreak.currentStreak}
                    size="sm"
                  />
                )}
                {todayAttendance && !todayAttendance.check_out_time && (
                  <View style={styles.liveBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>Active</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.card}>
              {loadingToday ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : (
                <>
                  {todayAttendance ? (
                    <>
                      <View style={styles.attendanceInfo}>
                        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.timeCard}>
                          <Ionicons
                            name="log-in-outline"
                            size={16}
                            color={Colors.success}
                          />
                          <View style={styles.timeCardContent}>
                            <Text style={styles.timeCardLabel}>In</Text>
                            <Text style={styles.timeCardValue}>
                              {formatTime(
                                new Date(todayAttendance.check_in_time || "")
                              )}
                            </Text>
                          </View>
                        </Animated.View>

                        <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.timeCard}>
                          <Ionicons
                            name="log-out-outline"
                            size={16}
                            color={Colors.error}
                          />
                          <View style={styles.timeCardContent}>
                            <Text style={styles.timeCardLabel}>Out</Text>
                            <Text style={styles.timeCardValue}>
                              {todayAttendance.check_out_time
                                ? formatTime(
                                    new Date(todayAttendance.check_out_time)
                                  )
                                : "--:--"}
                            </Text>
                          </View>
                        </Animated.View>

                        <Animated.View entering={FadeInUp.delay(260).springify()} style={styles.timeCard}>
                          <Ionicons
                            name="timer-outline"
                            size={16}
                            color={Colors.primary}
                          />
                          <View style={styles.timeCardContent}>
                            <Text style={styles.timeCardLabel}>Hours</Text>
                            <Text
                              style={[styles.timeCardValue, styles.hoursValue]}
                            >
                              {formatHours(
                                (todayAttendance.total_hours || 0) -
                                  (todayAttendance.overtime_hours || 0)
                              )}
                            </Text>
                            {(todayAttendance.overtime_hours || 0) > 0 && (
                              <Text style={styles.overtimeIndicator}>
                                +{formatHours(todayAttendance.overtime_hours || 0)} OT
                              </Text>
                            )}
                          </View>
                        </Animated.View>
                      </View>

                      {totalBreakDuration > 0 && (
                        <Text style={styles.breakDeductionText}>
                          Break: -{Math.floor(totalBreakDuration / 60)}h{" "}
                          {totalBreakDuration % 60}m deducted from total hours
                        </Text>
                      )}

                      {/* Overtime Display/Button - Only when day is completed */}
                      {todayAttendance.check_out_time && (
                        <>
                          {todayOvertimeRequest?.status === "pending" ? (
                            <View style={styles.overtimePendingCard}>
                              <View style={styles.overtimePendingHeader}>
                                <View style={styles.pulseDotOrange} />
                                <Text style={styles.overtimePendingLabel}>
                                  Waiting for Approval
                                </Text>
                              </View>
                              <View style={styles.overtimePendingContent}>
                                <MaterialCommunityIcons
                                  name="clock-plus-outline"
                                  size={24}
                                  color={Colors.warning}
                                />
                                <View style={styles.overtimePendingInfo}>
                                  <Text style={styles.overtimePendingHours}>
                                    {formatHours(todayOvertimeRequest.requested_hours)} requested
                                  </Text>
                                  {todayOvertimeRequest.reason && (
                                    <Text style={styles.overtimePendingReason}>
                                      {todayOvertimeRequest.reason}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.overtimePendingFooter}>
                                <MaterialCommunityIcons
                                  name="shield-check-outline"
                                  size={14}
                                  color={StatusColors.pending.text}
                                />
                                <Text style={styles.overtimePendingFooterText}>
                                  Awaiting HR review and approval
                                </Text>
                              </View>
                            </View>
                          ) : todayOvertimeRequest?.status === "rejected" ? (
                            <View style={styles.overtimeRejectedCard}>
                              <View style={styles.overtimeRejectedHeader}>
                                <Ionicons
                                  name="close-circle"
                                  size={16}
                                  color={Colors.error}
                                />
                                <Text style={styles.overtimeRejectedLabel}>
                                  Request Rejected
                                </Text>
                              </View>
                              <View style={styles.overtimeRejectedContent}>
                                <Text style={styles.overtimeRejectedHours}>
                                  {formatHours(todayOvertimeRequest.requested_hours)} was requested
                                </Text>
                                {todayOvertimeRequest.reviewer_notes && (
                                  <Text style={styles.overtimeRejectedReason}>
                                    Note: {todayOvertimeRequest.reviewer_notes}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ) : (todayAttendance.overtime_hours || 0) > 0 ? (
                            <View style={styles.overtimeDisplayCard}>
                              <View style={styles.overtimeDisplayHeader}>
                                <MaterialCommunityIcons
                                  name="clock-plus-outline"
                                  size={16}
                                  color={Colors.purple}
                                />
                                <Text style={styles.overtimeDisplayLabel}>
                                  Overtime
                                </Text>
                                <Text style={styles.overtimeDisplayValue}>
                                  +{formatHours(todayAttendance.overtime_hours || 0)}
                                </Text>
                              </View>
                              {todayAttendance.overtime_reason && (
                                <Text style={styles.overtimeDisplayReason}>
                                  {todayAttendance.overtime_reason}
                                </Text>
                              )}
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.addOvertimeButton}
                              onPress={() => setShowOvertimeModal(true)}
                              activeOpacity={0.7}
                              accessibilityLabel="Add overtime hours"
                              accessibilityRole="button"
                              accessibilityHint="Opens modal to request overtime hours"
                            >
                              <MaterialCommunityIcons
                                name="clock-plus-outline"
                                size={14}
                                color={Colors.purple}
                              />
                              <Text style={styles.addOvertimeButtonText}>
                                Add Overtime
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </>
                  ) : null}

                  {!todayAttendance && !isTodayWorking && (
                    <View style={styles.nonWorkingDayContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={24}
                        color={Colors.warning}
                      />
                      <Text style={styles.nonWorkingDayTitle}>
                        Not a Working Day
                      </Text>
                      <Text style={styles.nonWorkingDayText}>
                        Today is not a configured working day
                      </Text>
                      {workingDays.length > 0 && (
                        <Text style={styles.workingDaysText}>
                          Working days: {formatWorkingDays(workingDays)}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Neumorphic Check-In/Check-Out Button */}
                  {(canCheckIn || isCheckedIn) && !activeBreak && !upcomingBreak && (
                    <View style={styles.neumorphicButtonContainer}>
                      <NeumorphicCheckInButton
                        onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
                        disabled={
                          checkInMutation.isPending ||
                          checkOutMutation.isPending
                        }
                        loading={
                          checkInMutation.isPending ||
                          checkOutMutation.isPending
                        }
                        isCheckedIn={!!isCheckedIn}
                        checkInTime={todayAttendance?.check_in_time}
                        size={140}
                      />
                    </View>
                  )}

                  {/* Show disabled checkout when on break */}
                  {isCheckedIn && (activeBreak || upcomingBreak) && (
                    <View style={styles.breakBlockedContainer}>
                      <View style={styles.breakBlockedIcon}>
                        <Ionicons
                          name="lock-closed"
                          size={24}
                          color={Colors.gray400}
                        />
                      </View>
                      <Text style={styles.breakBlockedText}>
                        {activeBreak
                          ? "Check-out blocked during break"
                          : "Check-out blocked - break scheduled"}
                      </Text>
                    </View>
                  )}

                  {isCheckedIn && (
                    <>

                      {upcomingBreak ? (
                        <View style={styles.upcomingBreakCard}>
                          {/* Status Badge */}
                          <View style={styles.upcomingStatusBadge}>
                            <View style={styles.pulseDotBlue} />
                            <Text style={styles.upcomingStatusText}>
                              Break Approved - Scheduled
                            </Text>
                          </View>

                          {/* Time Display */}
                          <View style={styles.breakTimeDisplay}>
                            <View style={styles.breakTimeMain}>
                              <MaterialCommunityIcons
                                name="clock-outline"
                                size={32}
                                color={Colors.info}
                              />
                              <View style={styles.breakTimeInfo}>
                                <Text style={styles.breakTimeLabel}>
                                  Break Starts At
                                </Text>
                                <Text
                                  style={[
                                    styles.breakTimeValue,
                                    { color: StatusColors.info.text },
                                  ]}
                                >
                                  {formatTime(
                                    new Date(
                                      upcomingBreak.actual_start_time || ""
                                    )
                                  )}
                                </Text>
                                <Text
                                  style={[
                                    styles.breakTimeLabel,
                                    { marginTop: 4, fontSize: 11 },
                                  ]}
                                >
                                  Break will start automatically at this time
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Reason */}
                          {upcomingBreak.reason && (
                            <View style={styles.breakReasonContainer}>
                              <View style={styles.breakReasonHeader}>
                                <Feather
                                  name="message-circle"
                                  size={14}
                                  color={StatusColors.info.text}
                                />
                                <Text
                                  style={[
                                    styles.breakReasonLabel,
                                    { color: StatusColors.info.text },
                                  ]}
                                >
                                  Reason
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.breakReasonText,
                                  { color: StatusColors.info.text },
                                ]}
                              >
                                {upcomingBreak.reason}
                              </Text>
                            </View>
                          )}

                          {/* Footer Message */}
                          <View
                            style={[
                              styles.breakPendingFooter,
                              {
                                backgroundColor: StatusColors.info.background,
                                borderColor: StatusColors.info.border,
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="information-outline"
                              size={16}
                              color={StatusColors.info.text}
                            />
                            <Text
                              style={[
                                styles.breakPendingFooterText,
                                { color: StatusColors.info.text },
                              ]}
                            >
                              You can end the break once it starts
                            </Text>
                          </View>
                        </View>
                      ) : activeBreak ? (
                        <View style={styles.ongoingBreakCard}>
                          {/* Status Badge */}
                          <View style={styles.ongoingStatusBadge}>
                            <View style={styles.pulseDotGreen} />
                            <Text style={styles.ongoingStatusText}>
                              Break in Progress
                            </Text>
                          </View>

                          {/* Time Display */}
                          <View style={styles.breakTimeDisplay}>
                            <View style={styles.breakTimeMain}>
                              <MaterialCommunityIcons
                                name="coffee"
                                size={32}
                                color={Colors.success}
                              />
                              <View style={styles.breakTimeInfo}>
                                <Text style={styles.breakTimeLabel}>
                                  Break Started
                                </Text>
                                <Text
                                  style={[
                                    styles.breakTimeValue,
                                    { color: StatusColors.approved.text },
                                  ]}
                                >
                                  {formatTime(
                                    new Date(
                                      activeBreak.actual_start_time || ""
                                    )
                                  )}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Reason */}
                          {activeBreak.reason && (
                            <View style={styles.breakReasonContainer}>
                              <View style={styles.breakReasonHeader}>
                                <Feather
                                  name="message-circle"
                                  size={14}
                                  color={StatusColors.pending.text}
                                />
                                <Text style={styles.breakReasonLabel}>
                                  Reason
                                </Text>
                              </View>
                              <Text style={styles.breakReasonText}>
                                {activeBreak.reason}
                              </Text>
                            </View>
                          )}

                          {/* End Break Button */}
                          <View style={styles.breakActionContainer}>
                            <DepthButton
                              onPress={handleEndBreak}
                              disabled={endBreakMutation.isPending}
                              loading={endBreakMutation.isPending}
                              variant="success"
                              size="md"
                              icon={
                                <MaterialCommunityIcons
                                  name="coffee-to-go"
                                  size={20}
                                  color={Colors.textInverse}
                                />
                              }
                            >
                              End Break Now
                            </DepthButton>
                          </View>

                          {/* Footer Message */}
                          <View
                            style={[
                              styles.breakPendingFooter,
                              {
                                backgroundColor: StatusColors.approved.background,
                                borderColor: StatusColors.approved.border,
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="information-outline"
                              size={16}
                              color={StatusColors.approved.text}
                            />
                            <Text
                              style={[
                                styles.breakPendingFooterText,
                                { color: StatusColors.approved.text },
                              ]}
                            >
                              End time will be recorded with WiFi verification
                            </Text>
                          </View>
                        </View>
                      ) : pendingBreakRequest ? (
                        <View style={styles.pendingBreakCard}>
                          {/* Status Badge */}
                          <View style={styles.pendingStatusBadge}>
                            <View style={styles.pulseDotOrange} />
                            <Text style={styles.pendingStatusText}>
                              Pending Approval
                            </Text>
                          </View>

                          {/* Time Display */}
                          {pendingBreakRequest.requested_start_time && (
                            <View style={styles.breakTimeDisplay}>
                              <View style={styles.breakTimeMain}>
                                <MaterialCommunityIcons
                                  name="coffee"
                                  size={32}
                                  color={Colors.warning}
                                />
                                <View style={styles.breakTimeInfo}>
                                  <Text style={styles.breakTimeLabel}>
                                    Break Start Time
                                  </Text>
                                  <Text style={styles.breakTimeValue}>
                                    {formatTime(
                                      new Date(
                                        pendingBreakRequest.requested_start_time
                                      )
                                    )}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.breakTimeLabel,
                                      { marginTop: 4, fontSize: 11 },
                                    ]}
                                  >
                                    End time will be recorded with WiFi
                                    verification
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}

                          {/* Reason */}
                          {pendingBreakRequest.reason && (
                            <View style={styles.breakReasonContainer}>
                              <View style={styles.breakReasonHeader}>
                                <Feather
                                  name="message-circle"
                                  size={14}
                                  color={StatusColors.pending.text}
                                />
                                <Text style={styles.breakReasonLabel}>
                                  Reason
                                </Text>
                              </View>
                              <Text style={styles.breakReasonText}>
                                {pendingBreakRequest.reason}
                              </Text>
                            </View>
                          )}

                          {/* Footer Message */}
                          <View style={styles.breakPendingFooter}>
                            <MaterialCommunityIcons
                              name="shield-check-outline"
                              size={16}
                              color={StatusColors.pending.text}
                            />
                            <Text style={styles.breakPendingFooterText}>
                              Awaiting HR review and approval
                            </Text>
                          </View>
                        </View>
                      ) : !pendingBreakRequest &&
                        !activeBreak &&
                        !upcomingBreak ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setShowBreakRequestModal(true)}
                          style={styles.breakRequestButton}
                          accessibilityLabel="Request a break"
                          accessibilityRole="button"
                          accessibilityHint="Opens modal to request a break from work"
                        >
                          <MaterialCommunityIcons
                            name="coffee-outline"
                            size={16}
                            color={Colors.warning}
                          />
                          <Text style={styles.breakRequestButtonText}>
                            Request Break
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </View>
          </Animated.View>

          {/* Quick Links Section */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Quick Links</Text>
            </View>

            <View style={styles.quickActionsGrid}>
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() => router.push("/(employee)/salary")}
                  activeOpacity={PressOpacity.subtle}
                  accessibilityLabel="View salary information"
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: StatusColors.pending.background },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="wallet"
                      size={22}
                      color={Colors.warning}
                    />
                  </View>
                  <Text style={styles.quickActionLabel}>Salary</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(250).springify()}>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() => router.push("/(employee)/leave")}
                  activeOpacity={PressOpacity.subtle}
                  accessibilityLabel="Manage leave requests"
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: Colors.pinkLight },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="beach"
                      size={22}
                      color={Colors.pink}
                    />
                  </View>
                  <Text style={styles.quickActionLabel}>Leave</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() => router.push("/(employee)/breaks")}
                  activeOpacity={PressOpacity.subtle}
                  accessibilityLabel="View break history"
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: Colors.cyanLight },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="coffee"
                      size={22}
                      color={Colors.cyan}
                    />
                  </View>
                  <Text style={styles.quickActionLabel}>Breaks</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(350).springify()}>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() =>
                    router.push("/(employee)/change-employer" as Href)
                  }
                  activeOpacity={PressOpacity.subtle}
                  accessibilityLabel="Change employer"
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: StatusColors.info.background },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={22}
                      color={Colors.infoDark}
                    />
                  </View>
                  <Text style={styles.quickActionLabel}>Change Employer</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(400).springify()}>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() =>
                    router.push("/(employee)/search-employer" as Href)
                  }
                  activeOpacity={PressOpacity.subtle}
                  accessibilityLabel="Search for employer"
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: Colors.indigoLight },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="magnify"
                      size={22}
                      color={Colors.indigo}
                    />
                  </View>
                  <Text style={styles.quickActionLabel}>Search Employer</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(450).springify()}>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={() =>
                    router.push("/(employee)/employment-history" as Href)
                  }
                  activeOpacity={PressOpacity.subtle}
                  accessibilityLabel="View employment history"
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: Colors.purpleLight },
                    ]}
                  >
                    <Ionicons name="time" size={22} color={Colors.purple} />
                  </View>
                  <Text style={styles.quickActionLabel}>History</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Feature Banner - Glass Variant */}
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.bannerSlot}>
            <MarketingBanner
              variant="glass"
              title="Salary Insights"
              subtitle="Track your earnings and view payment history"
              ctaText="View Details"
              onPress={() => router.push("/(employee)/salary")}
            />
          </Animated.View>

          {/* Monthly Summary */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>
                This Month&apos;s Summary
              </Text>
            </View>

            {loadingMonthly ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons
                    name="calendar-check"
                    size={16}
                    color={Colors.success}
                  />
                  <Text style={styles.infoValue}>
                    {monthlySummary?.totalDays || 0}
                  </Text>
                  <Text style={styles.infoLabel}>Present</Text>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={16}
                    color={Colors.info}
                  />
                  <Text style={styles.infoValue}>
                    {monthlySummary?.validDays || 0}
                  </Text>
                  <Text style={styles.infoLabel}>Valid</Text>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoValue}>
                    {Math.round(monthlySummary?.totalHours || 0)}h
                  </Text>
                  <Text style={styles.infoLabel}>Hours</Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Calendar Heatmap */}
          {monthlySummary?.records && monthlySummary.records.length > 0 && (
            <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.modernSection}>
              <View style={styles.modernSectionHeader}>
                <Text style={styles.modernSectionTitle}>
                  Attendance Calendar
                </Text>
              </View>

              <MiniCalendarHeatmap
                records={monthlySummary.records}
                month={new Date().getMonth()}
                year={new Date().getFullYear()}
              />
            </Animated.View>
          )}

          {/* Monthly Earnings */}
          {user?.base_salary != null && user.base_salary > 0 && (
            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.modernSection}>
              <View style={styles.modernSectionHeader}>
                <Text style={styles.modernSectionTitle}>
                  This Month&apos;s Earnings
                </Text>
              </View>

              {loadingEarnings ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : (
                <CircularHoursProgress
                  hoursWorked={earnings?.total_hours_worked || 0}
                  expectedHours={earnings?.expected_hours || 0}
                />
              )}
            </Animated.View>
          )}

          {/* Placeholder Banner - Coming Soon */}
          <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.bannerSlot}>
            <PlaceholderBanner
              title="Documents Hub"
              subtitle="Upload and manage your documents securely"
              icon="document-text-outline"
              gradientColors={[Colors.indigo, Colors.purple]}
            />
          </Animated.View>

          {/* Latest Salary */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Latest Salary</Text>
            </View>

            {loadingSalary ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : latestSalary ? (
              <View style={styles.card}>
                <View style={styles.salaryHeaderSection}>
                  <Text style={styles.salaryHeaderLabel}>Total Amount</Text>
                  <Text
                    style={styles.salaryHeaderValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatCurrency(latestSalary.total_salary || 0)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.listItem}>
                  <View style={styles.listItemWithIcon}>
                    <MaterialCommunityIcons
                      name="calendar-month"
                      size={18}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.listLabel}>Month</Text>
                  </View>
                  <Text style={styles.listValue}>
                    {latestSalary.month_year}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.listItem}>
                  <View style={styles.listItemWithIcon}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={18}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.listLabel}>Status</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadgeInline,
                      latestSalary.status === "paid"
                        ? styles.statusPaid
                        : latestSalary.status === "approved"
                        ? styles.statusApproved
                        : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusText}>{latestSalary.status}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.salaryEmptyState}>
                <MaterialCommunityIcons
                  name="receipt-text-outline"
                  size={48}
                  color={Colors.gray300}
                />
                <Text style={styles.salaryEmptyStateTitle}>
                  No Salary Records
                </Text>
                <Text style={styles.salaryEmptyStateText}>
                  Your salary information will appear here once processed by HR
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Break Request Modal */}
      {todayAttendance && (
        <BreakRequestModal
          visible={showBreakRequestModal}
          onClose={() => setShowBreakRequestModal(false)}
          attendanceRecord={todayAttendance}
        />
      )}

      {/* Overtime Modal */}
      {todayAttendance?.check_out_time && (
        <AddOvertimeModal
          visible={showOvertimeModal}
          onClose={() => setShowOvertimeModal(false)}
          attendanceRecord={todayAttendance}
        />
      )}

      {/* WiFi Verification Modal */}
      {wifiVerificationResult && (
        <WiFiVerificationModal
          visible={showWiFiModal}
          onClose={() => setShowWiFiModal(false)}
          verificationResult={wifiVerificationResult}
          action={pendingAction || "check-in"}
        />
      )}
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
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing["lg"],
  },
  heroSection: {
    marginHorizontal: -Spacing["2xl"],
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["6xl"],
    paddingBottom: Spacing["3xl"],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: Spacing["xl"],
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
  heroGreetingSmall: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
  },
  heroGreeting: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.textInverse,
    letterSpacing: -1,
  },
  heroDatePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  heroDateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.3)",
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
    marginTop: Spacing["sm"],
    rowGap: 8,
    columnGap: Spacing["md"],
  },
  heroMetricCard: {
    flex: 1,
    minWidth: 160,
    flexBasis: "48%",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 84,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: Colors.background,
    ...Shadows.sm,
  },
  heroMetricPrimary: {
    // Optional: slight tint for primary cards
  },
  heroMetricSecondary: {
    // Optional: slight tint for secondary cards
  },
  heroMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  heroMetricIconOverlay: {
    backgroundColor: Colors.primary + "20",
  },
  heroMetricContent: {
    flex: 1,
    flexShrink: 1,
    gap: Spacing["xs"],
    minWidth: 0,
  },
  heroMetricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroMetricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  content: {
    gap: Spacing["lg"],
  },
  bannerSlot: {
    marginHorizontal: -Spacing["2xl"],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.errorDark,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error,
  },
  modernSection: {
    gap: Spacing["md"],
  },
  modernSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing["sm"],
  },
  headerBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: Spacing["md"],
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Shadows.sm,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing["md"],
    paddingVertical: Spacing["xs"],
    borderRadius: BorderRadius.full,
    gap: Spacing["xs"],
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: StatusColors.approved.text,
  },
  loadingContainer: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  attendanceInfo: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  timeCard: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Shadows.xs,
  },
  timeCardContent: {
    alignItems: "center",
  },
  timeCardLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
    textAlign: "center",
  },
  timeCardValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  hoursValue: {
    color: Colors.primary,
  },
  overtimeIndicator: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.purple,
    marginTop: 1,
  },
  emptyStateContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: Spacing["lg"],
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing["xs"],
    ...Shadows.primary,
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  checkOutButton: {
    backgroundColor: Colors.error,
    paddingVertical: 12,
    paddingHorizontal: Spacing["lg"],
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing["xs"],
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkOutButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  checkOutButtonDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.gray400,
  },
  breakDeductionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontStyle: "italic",
    textAlign: "center",
  },
  // Neumorphic Button Styles
  neumorphicButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing["xl"],
    marginVertical: Spacing["sm"],
  },
  breakBlockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["sm"],
    paddingVertical: Spacing["lg"],
    paddingHorizontal: Spacing["xl"],
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius["xl"],
    marginVertical: Spacing["sm"],
  },
  breakBlockedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  breakBlockedText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.gray500,
  },
  // Info Row Styles (for compact stats)
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Shadows.sm,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  infoValue: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  // Salary Styles
  salaryHeaderSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
  },
  salaryHeaderLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  salaryHeaderValue: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  listItemWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadgeInline: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  statusPaid: {
    backgroundColor: Colors.successLight,
  },
  statusApproved: {
    backgroundColor: Colors.infoLight,
  },
  statusPending: {
    backgroundColor: Colors.warningLight,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
    color: Colors.text,
  },
  nonWorkingDayContainer: {
    backgroundColor: StatusColors.pending.background,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
    ...Shadows.sm,
  },
  nonWorkingDayTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: StatusColors.pending.text,
    marginTop: 8,
  },
  nonWorkingDayText: {
    fontSize: 14,
    color: StatusColors.pending.text,
    textAlign: "center",
  },
  workingDaysText: {
    fontSize: 13,
    color: StatusColors.pending.text,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  breakRequestButton: {
    backgroundColor: StatusColors.pending.background,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
    ...Shadows.xs,
  },
  breakRequestButtonDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.border,
    opacity: 0.7,
  },
  breakRequestButtonText: {
    color: StatusColors.pending.text,
    fontSize: 13,
    fontWeight: "600",
  },
  breakRequestButtonTextDisabled: {
    color: Colors.gray400,
    fontSize: 14,
    fontWeight: "600",
  },
  upcomingBreakCard: {
    backgroundColor: Colors.infoLight,
    borderRadius: 16,
    padding: 0,
    marginTop: 12,
    borderWidth: 2,
    borderColor: Colors.info,
    overflow: "hidden",
    shadowColor: Colors.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  ongoingBreakCard: {
    backgroundColor: StatusColors.active.background,
    borderRadius: 16,
    padding: 0,
    marginTop: 12,
    borderWidth: 2,
    borderColor: StatusColors.active.border,
    overflow: "hidden",
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  pendingBreakCard: {
    backgroundColor: StatusColors.pending.background,
    borderRadius: 16,
    padding: 0,
    marginTop: 12,
    borderWidth: 2,
    borderColor: StatusColors.pending.border,
    overflow: "hidden",
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  upcomingStatusBadge: {
    backgroundColor: Colors.infoLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.info,
  },
  pulseDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.info,
  },
  upcomingStatusText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.infoDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ongoingStatusBadge: {
    backgroundColor: StatusColors.active.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: StatusColors.active.border,
  },
  pulseDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  ongoingStatusText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.successDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pendingStatusBadge: {
    backgroundColor: StatusColors.pending.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: StatusColors.pending.border,
  },
  pulseDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  pendingStatusText: {
    fontSize: 14,
    fontWeight: "700",
    color: StatusColors.pending.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakTimeDisplay: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  breakTimeMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  breakTimeInfo: {
    flex: 1,
  },
  breakTimeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: StatusColors.pending.text,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakTimeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: StatusColors.pending.text,
    letterSpacing: -0.5,
  },
  breakDurationBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: StatusColors.pending.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
  },
  breakDurationText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.warning,
  },
  breakReasonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  breakReasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  breakReasonLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: StatusColors.pending.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakReasonText: {
    fontSize: 14,
    color: StatusColors.pending.text,
    lineHeight: 20,
    fontWeight: "500",
  },
  breakPendingFooter: {
    backgroundColor: StatusColors.pending.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  breakPendingFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: StatusColors.pending.text,
  },
  breakActionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  endBreakButton: {
    backgroundColor: Colors.success,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  endBreakButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "700",
  },
  // Salary Empty State
  salaryEmptyState: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing["xl"],
    alignItems: "center",
    gap: Spacing["sm"],
  },
  salaryEmptyStateTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing["xs"],
  },
  salaryEmptyStateText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // Quick Actions Section
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing["sm"],
  },
  quickActionItem: {
    width: "31%",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Shadows.xs,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 15,
    letterSpacing: -0.1,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  listLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  listValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  // Overtime styles
  addOvertimeButton: {
    backgroundColor: StatusColors.overtime.background,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: StatusColors.overtime.border,
    ...Shadows.xs,
  },
  addOvertimeButtonText: {
    color: Colors.purple,
    fontSize: 13,
    fontWeight: "600",
  },
  overtimeDisplayCard: {
    backgroundColor: StatusColors.overtime.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: StatusColors.overtime.border,
    marginTop: Spacing.sm,
    ...Shadows.xs,
  },
  overtimeDisplayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overtimeDisplayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.purple,
  },
  overtimeDisplayValue: {
    fontSize: 14,
    fontWeight: "700",
    color: StatusColors.overtime.text,
    marginLeft: "auto",
  },
  overtimeDisplayReason: {
    fontSize: 12,
    color: Colors.purple,
    marginTop: 4,
  },
  editOvertimeButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.indigoLight,
    borderRadius: 8,
  },
  editOvertimeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.purple,
  },
  // Overtime Pending Styles
  overtimePendingCard: {
    backgroundColor: StatusColors.pending.background,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
    overflow: "hidden",
  },
  overtimePendingHeader: {
    backgroundColor: StatusColors.pending.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: StatusColors.pending.border,
  },
  overtimePendingLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: StatusColors.pending.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overtimePendingContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  overtimePendingInfo: {
    flex: 1,
  },
  overtimePendingHours: {
    fontSize: 16,
    fontWeight: "700",
    color: StatusColors.pending.text,
  },
  overtimePendingReason: {
    fontSize: 13,
    color: StatusColors.pending.text,
    marginTop: 4,
  },
  overtimePendingFooter: {
    backgroundColor: StatusColors.pending.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  overtimePendingFooterText: {
    fontSize: 11,
    fontWeight: "600",
    color: StatusColors.pending.text,
  },
  // Overtime Rejected Styles
  overtimeRejectedCard: {
    backgroundColor: StatusColors.rejected.background,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: StatusColors.rejected.border,
    overflow: "hidden",
  },
  overtimeRejectedHeader: {
    backgroundColor: StatusColors.rejected.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: StatusColors.rejected.border,
  },
  overtimeRejectedLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: StatusColors.rejected.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overtimeRejectedContent: {
    padding: 12,
  },
  overtimeRejectedHours: {
    fontSize: 14,
    fontWeight: "600",
    color: StatusColors.rejected.text,
  },
  overtimeRejectedReason: {
    fontSize: 13,
    color: Colors.errorDark,
    marginTop: 6,
    fontStyle: "italic",
  },
});
