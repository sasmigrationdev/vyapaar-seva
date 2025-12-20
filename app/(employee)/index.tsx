import AddOvertimeModal from "@/components/attendance/AddOvertimeModal";
import BreakRequestModal from "@/components/attendance/BreakRequestModal";
import WiFiVerificationModal from "@/components/attendance/WiFiVerificationModal";
import SalaryProgressCard from "@/components/salary/SalaryProgressCard";
import { Text } from "@/components/ui/Text";
import {
  BorderRadius,
  Colors,
  Gradients,
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
import { useMyBreakRequests } from "@/hooks/queries/useBreakRequests";
import { useCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useOvertimeRequestByAttendance } from "@/hooks/queries/useOvertimeRequests";
import { useEmployeeJoinRequests } from "@/hooks/queries/useEmployerRequests";
import { useCurrentEmployment } from "@/hooks/queries/useEmploymentHistory";
import { useLatestSalary } from "@/hooks/queries/useSalary";
import { useAutoRejectExpiredBreaks } from "@/hooks/useAutoRejectExpiredBreaks";
import { WeekDay } from "@/lib/types";
import {
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
    refetch: refetchToday,
  } = useTodayAttendance(userId);
  const {
    data: monthlySummary,
    isLoading: loadingMonthly,
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
      console.log("WiFi verification failed. Check-in blocked.");
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
      console.log("WiFi verification failed. Cannot end break.");
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
      console.log("WiFi verification failed. Check-out blocked.");
    }
  };

  const isCheckedIn = todayAttendance && !todayAttendance.check_out_time;
  const workingDays = (user?.working_days || []) as WeekDay[];
  const isTodayWorking = isTodayWorkingDay(workingDays);
  const canCheckIn = !todayAttendance && isTodayWorking;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchToday(),
        refetchMonthly(),
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
              <Text style={styles.heroGreetingSmall}>{getGreeting()}</Text>
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
            >
              <Text style={styles.avatarLetter}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Attendance Status Metrics */}
          <View style={styles.heroMetricsRow}>
            <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <Ionicons
                  name="log-in-outline"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>check in</Text>
                <Text style={styles.heroMetricValue} numberOfLines={1}>
                  {todayAttendance?.check_in_time
                    ? formatTime(new Date(todayAttendance.check_in_time))
                    : "--:--"}
                </Text>
              </View>
            </View>

            <View style={[styles.heroMetricCard, styles.heroMetricSecondary]}>
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>check out</Text>
                <Text style={styles.heroMetricValue} numberOfLines={1}>
                  {todayAttendance?.check_out_time
                    ? formatTime(new Date(todayAttendance.check_out_time))
                    : "--:--"}
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

        <View style={styles.content}>
          {/* Attendance Card */}
          <View style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Today's Attendance</Text>
              {todayAttendance && !todayAttendance.check_out_time && (
                <View style={styles.liveBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveText}>Active</Text>
                </View>
              )}
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
                        <View style={styles.timeCard}>
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
                        </View>

                        <View style={styles.timeCard}>
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
                        </View>

                        <View style={styles.timeCard}>
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
                        </View>
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
                                  color="#F59E0B"
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
                                  color="#92400E"
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
                                  color="#EF4444"
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
                                  color="#8B5CF6"
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
                            >
                              <MaterialCommunityIcons
                                name="clock-plus-outline"
                                size={14}
                                color="#8B5CF6"
                              />
                              <Text style={styles.addOvertimeButtonText}>
                                Add Overtime
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <Feather name="calendar" size={40} color={Colors.gray400} />
                      <Text style={styles.emptyStateText}>
                        No attendance recorded today
                      </Text>
                    </View>
                  )}

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

                  {canCheckIn && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleCheckIn}
                      disabled={checkInMutation.isPending}
                      style={styles.primaryButton}
                    >
                      {checkInMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.primaryButtonText}>
                            Check In Now
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {isCheckedIn && (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleCheckOut}
                        disabled={
                          checkOutMutation.isPending ||
                          !!activeBreak ||
                          !!upcomingBreak
                        }
                        style={[
                          styles.checkOutButton,
                          (activeBreak || upcomingBreak) &&
                            styles.checkOutButtonDisabled,
                        ]}
                      >
                        {checkOutMutation.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons
                              name="exit-outline"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.checkOutButtonText}>
                              {activeBreak
                                ? "On Break - Cannot Check Out"
                                : upcomingBreak
                                ? "Break Approved - Cannot Check Out"
                                : "Check Out"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

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
                                    { color: "#1E40AF" },
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
                                  color="#1E40AF"
                                />
                                <Text
                                  style={[
                                    styles.breakReasonLabel,
                                    { color: "#1E40AF" },
                                  ]}
                                >
                                  Reason
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.breakReasonText,
                                  { color: "#1E3A8A" },
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
                                backgroundColor: "#DBEAFE",
                                borderColor: "#93C5FD",
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="information-outline"
                              size={16}
                              color="#1E40AF"
                            />
                            <Text
                              style={[
                                styles.breakPendingFooterText,
                                { color: "#1E40AF" },
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
                                    { color: "#065F46" },
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
                                  color="#78350F"
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
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={handleEndBreak}
                              disabled={endBreakMutation.isPending}
                              style={styles.endBreakButton}
                            >
                              {endBreakMutation.isPending ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#FFFFFF"
                                />
                              ) : (
                                <>
                                  <MaterialCommunityIcons
                                    name="coffee-to-go"
                                    size={20}
                                    color="#FFFFFF"
                                  />
                                  <Text style={styles.endBreakButtonText}>
                                    End Break Now
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>

                          {/* Footer Message */}
                          <View
                            style={[
                              styles.breakPendingFooter,
                              {
                                backgroundColor: "#D1FAE5",
                                borderColor: "#A7F3D0",
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="information-outline"
                              size={16}
                              color="#047857"
                            />
                            <Text
                              style={[
                                styles.breakPendingFooterText,
                                { color: "#047857" },
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
                                  color="#78350F"
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
                              color="#92400E"
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
          </View>

          {/* Quick Links Section */}
          <View style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Quick Links</Text>
            </View>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => router.push("/(employee)/salary")}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#fef3c7" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="wallet"
                    size={22}
                    color="#f59e0b"
                  />
                </View>
                <Text style={styles.quickActionLabel}>Salary</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => router.push("/(employee)/leave")}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#fce7f3" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="beach"
                    size={22}
                    color="#ec4899"
                  />
                </View>
                <Text style={styles.quickActionLabel}>Leave</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => router.push("/(employee)/breaks")}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#cffafe" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="coffee"
                    size={22}
                    color="#0891b2"
                  />
                </View>
                <Text style={styles.quickActionLabel}>Breaks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() =>
                  router.push("/(employee)/change-employer" as Href)
                }
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#dbeafe" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={22}
                    color="#2563eb"
                  />
                </View>
                <Text style={styles.quickActionLabel}>Change Employer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() =>
                  router.push("/(employee)/search-employer" as Href)
                }
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#e0e7ff" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color="#6366f1"
                  />
                </View>
                <Text style={styles.quickActionLabel}>Search Employer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() =>
                  router.push("/(employee)/employment-history" as Href)
                }
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#f3e8ff" },
                  ]}
                >
                  <Ionicons name="time" size={22} color="#a855f7" />
                </View>
                <Text style={styles.quickActionLabel}>History</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Monthly Summary */}
          <View style={styles.modernSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>
                This Month's Summary
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
          </View>

          {/* Monthly Earnings */}
          {user?.base_salary != null && user.base_salary > 0 && (
            <View style={styles.modernSection}>
              <View style={styles.modernSectionHeader}>
                <Text style={styles.modernSectionTitle}>
                  This Month's Earnings
                </Text>
              </View>

              <View style={styles.card}>
                {loadingEarnings ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : (
                  <SalaryProgressCard
                    earnedSalary={earnings?.earned_salary || 0}
                    baseSalary={user.base_salary || 0}
                    hoursWorked={earnings?.total_hours_worked || 0}
                    expectedHours={earnings?.expected_hours || 0}
                    compact={false}
                  />
                )}
              </View>
            </View>
          )}

          {/* Latest Salary */}
          <View style={styles.modernSection}>
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
          </View>
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
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    backgroundColor: "#FFFFFF",
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
  modernSection: {
    gap: Spacing["md"],
  },
  modernSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing["sm"],
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: "#FFFFFF",
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
    color: Colors.success,
  },
  loadingContainer: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  attendanceInfo: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  timeCard: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    padding: 10,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
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
    color: "#8B5CF6",
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
  // Info Row Styles (for compact stats)
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
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
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
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
    padding: 16,
    gap: 12,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: Spacing["sm"],
    alignItems: "center",
    gap: 8,
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
    backgroundColor: "#FAF5FF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  addOvertimeButtonText: {
    color: "#8B5CF6",
    fontSize: 13,
    fontWeight: "600",
  },
  overtimeDisplayCard: {
    backgroundColor: "#FAF5FF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    marginTop: 8,
  },
  overtimeDisplayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overtimeDisplayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  overtimeDisplayValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B21A8",
    marginLeft: "auto",
  },
  overtimeDisplayReason: {
    fontSize: 12,
    color: "#7C3AED",
    marginTop: 4,
  },
  editOvertimeButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#EDE9FE",
    borderRadius: 8,
  },
  editOvertimeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  // Overtime Pending Styles
  overtimePendingCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    overflow: "hidden",
  },
  overtimePendingHeader: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  overtimePendingLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
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
    color: "#92400E",
  },
  overtimePendingReason: {
    fontSize: 13,
    color: "#B45309",
    marginTop: 4,
  },
  overtimePendingFooter: {
    backgroundColor: "#FDE68A",
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
    color: "#92400E",
  },
  // Overtime Rejected Styles
  overtimeRejectedCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    overflow: "hidden",
  },
  overtimeRejectedHeader: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  overtimeRejectedLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overtimeRejectedContent: {
    padding: 12,
  },
  overtimeRejectedHours: {
    fontSize: 14,
    fontWeight: "600",
    color: "#991B1B",
  },
  overtimeRejectedReason: {
    fontSize: 13,
    color: "#B91C1C",
    marginTop: 6,
    fontStyle: "italic",
  },
});
