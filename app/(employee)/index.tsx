import AddOvertimeModal from "@/components/attendance/AddOvertimeModal";
import BreakRequestModal from "@/components/attendance/BreakRequestModal";
import WiFiVerificationModal from "@/components/attendance/WiFiVerificationModal";
import AttendanceStreakBadge from "@/components/ui/AttendanceStreakBadge";
import MiniCalendarHeatmap from "@/components/ui/MiniCalendarHeatmap";
import { NeumorphicCheckInButton } from "@/components/ui/NeumorphicCheckInButton";
import { Text } from "@/components/ui/Text";
import {
  BorderRadius,
  Colors,
  PressOpacity,
  Shadows,
  Spacing,
  StatusColors
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
import { useEmployeeJoinRequests } from "@/hooks/queries/useEmployerRequests";
import { useCurrentEmployment } from "@/hooks/queries/useEmploymentHistory";
import { useUnreadNotificationsCount } from "@/hooks/queries/useNotification";
import { useOvertimeRequestByAttendance } from "@/hooks/queries/useOvertimeRequests";
import { useLatestSalary } from "@/hooks/queries/useSalary";
import { useAlert } from "@/hooks/useAlert";
import { useAutoAttendance } from "@/hooks/useAutoAttendance";
import { useAutoRejectExpiredBreaks } from "@/hooks/useAutoRejectExpiredBreaks";
import { WeekDay } from "@/lib/types";
import {
  calculateAttendanceStreak,
  calculateBreakDuration,
  formatHours,
} from "@/lib/utils/attendance.utils";
import { formatTime } from "@/lib/utils/date.utils";
import { formatCurrency } from "@/lib/utils/salary.utils";
import {
  performWiFiVerification,
  WiFiVerificationResult,
} from "@/lib/utils/wifiVerification.utils";
import {
  formatWorkingDays,
  isTodayWorkingDay,
} from "@/lib/utils/workingDays.utils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Animated pulse component for live indicator
function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.featureCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.featureIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
    </TouchableOpacity>
  );
}

// Tip Card Component
function TipCard({
  icon,
  title,
  tip,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  tip: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.tipCard, { backgroundColor: bgColor }]}>
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipText}>{tip}</Text>
      </View>
    </View>
  );
}

export default function EmployeeDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [showBreakRequestModal, setShowBreakRequestModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);

  // WiFi Verification Modal State
  const [showWiFiModal, setShowWiFiModal] = useState(false);
  const [wifiVerificationResult, setWifiVerificationResult] =
    useState<WiFiVerificationResult | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "check-in" | "check-out" | "end-break" | null
  >(null);

  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useAlert();
  const userId = user?.id || "";

  const { data: unreadCount = 0 } = useUnreadNotificationsCount(userId, {
    enabled: !!userId,
  });

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
      return now < startTime;
    }
    return false;
  });

  // Find active break for today (currently on break)
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
      error("Error", err.message || "Failed to check in. Please try again.");
    },
  });

  const checkOutMutation = useCheckOut(userId, {
    onSuccess: () => {
      success("Success", "Checked out successfully!");
    },
    onError: (err) => {
      error("Error", err.message || "Failed to check out. Please try again.");
    },
  });

  const endBreakMutation = useEndBreak(userId, user?.organization_id ?? undefined, {
    onSuccess: () => {
      success("Success", "Break ended successfully!");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to end break. Please try again.");
    },
  });

  const handleCheckIn = async () => {
    if (!user?.organization_id) {
      error("Error", "Organization not found. Please contact support.");
      return;
    }

    const wifiResult = await performWiFiVerification(
      userId,
      user.organization_id
    );

    setWifiVerificationResult(wifiResult);
    setPendingAction("check-in");
    setShowWiFiModal(true);
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

    const wifiResult = await performWiFiVerification(
      userId,
      user.organization_id
    );

    setWifiVerificationResult(wifiResult);
    setPendingAction("end-break");
    setShowWiFiModal(true);
  };

  const handleCheckOut = async () => {
    if (activeBreak) {
      error(
        "Break in Progress",
        "You cannot check out while on a break. Please end your break first before checking out."
      );
      return;
    }

    if (!todayAttendance?.id) {
      error("Error", "No attendance record found. Please check in first.");
      return;
    }

    if (!user?.organization_id) {
      error("Error", "Organization not found. Please contact support.");
      return;
    }

    const wifiResult = await performWiFiVerification(
      userId,
      user.organization_id
    );

    setWifiVerificationResult(wifiResult);
    setPendingAction("check-out");
    setShowWiFiModal(true);
  };

  // Runs the pending attendance action only after the user confirms in the
  // WiFi verification modal. Gated so nothing happens unless verification
  // passes (or isn't required) AND the user explicitly presses Continue.
  const handleConfirmWiFiAction = () => {
    const wifiResult = wifiVerificationResult;
    const action = pendingAction;

    setShowWiFiModal(false);

    if (!wifiResult || !action) return;

    // Verification required but failed — do not perform the action.
    if (wifiResult.isRequired && !wifiResult.isVerified) {
      return;
    }

    const wifiInfo = wifiResult.isVerified
      ? { ssid: wifiResult.currentSsid, verified: true }
      : undefined;

    if (action === "check-in") {
      checkInMutation.mutate({ notes: "Self check-in", wifiInfo });
    } else if (action === "check-out") {
      if (!todayAttendance?.id) return;
      checkOutMutation.mutate({
        recordId: todayAttendance.id,
        notes: "Self check-out",
        wifiInfo,
      });
    } else if (action === "end-break") {
      if (!activeBreak) return;
      endBreakMutation.mutate({
        breakRequestId: activeBreak.id,
        wifiSsid: wifiResult.isVerified ? wifiResult.currentSsid || "" : undefined,
        wifiVerified: wifiResult.isVerified,
      });
    }
  };

  const isCheckedIn = todayAttendance && !todayAttendance.check_out_time;
  const isCheckedOut = todayAttendance && todayAttendance.check_out_time;
  const workingDays = (user?.working_days || []) as WeekDay[];
  const isTodayWorking = isTodayWorkingDay(workingDays);
  const canCheckIn = !todayAttendance && isTodayWorking;

  // Auto attendance based on WiFi connectivity
  useAutoAttendance({
    userId,
    organizationId: user?.organization_id ?? undefined,
    workingDays,
    onAutoCheckin: () => {
      success(
        "Auto Check-In",
        "You've been automatically checked in via WiFi."
      );
      refetchToday();
    },
    onAutoCheckout: () => {
      success("Auto Check-Out", "You've been automatically checked out.");
      refetchToday();
    },
    onBlocked: (reason) => {
      console.log("Auto check-out blocked:", reason);
    },
  });

  // Calculate attendance streak
  const attendanceStreak = calculateAttendanceStreak(
    monthlySummary?.records || []
  );

  // Calculate employment duration
  const employmentDuration = useMemo(() => {
    if (!currentEmployment?.joined_at) return undefined;
    const months = Math.floor(
      (new Date().getTime() - new Date(currentEmployment.joined_at).getTime()) /
      (1000 * 60 * 60 * 24 * 30)
    );
    if (months < 1) return "New";
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${months} months`;
    if (remainingMonths === 0) return `${years} year${years > 1 ? "s" : ""}`;
    return `${years}y ${remainingMonths}m`;
  }, [currentEmployment?.joined_at]);

  // Check if user is new (less than 7 days or no attendance)
  const isNewEmployee = useMemo(() => {
    if (!currentEmployment?.joined_at) return true;
    const joinedDays = Math.floor(
      (new Date().getTime() - new Date(currentEmployment.joined_at).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    return joinedDays < 7 || (monthlyStats?.daysAttended || 0) < 3;
  }, [currentEmployment?.joined_at, monthlyStats?.daysAttended]);

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

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get status message
  const getStatusMessage = () => {
    if (activeBreak) return "On Break";
    if (isCheckedIn) return "Working";
    if (isCheckedOut) return "Day Complete";
    if (!isTodayWorking) return "Day Off";
    return "Not Checked In";
  };

  const getStatusColor = () => {
    if (activeBreak) return Colors.warning;
    if (isCheckedIn) return Colors.success;
    if (isCheckedOut) return Colors.info;
    return Colors.gray400;
  };

  // Get current date formatted nicely
  const currentDateFormatted = useMemo(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    return date.toLocaleDateString("en-US", options);
  }, []);

  // Random tip for variety
  const dailyTip = useMemo(() => {
    const tips = [
      { icon: "bulb-outline" as const, title: "Pro Tip", tip: "Check in on time to maintain your attendance streak and earn bonus points!", bgColor: Colors.warning },
      { icon: "timer-outline" as const, title: "Did You Know?", tip: "Regular breaks improve productivity. Don't forget to take your scheduled breaks!", bgColor: Colors.info },
      { icon: "trending-up-outline" as const, title: "Keep Going!", tip: "Consistent attendance can lead to better performance reviews and opportunities.", bgColor: Colors.success },
      { icon: "star-outline" as const, title: "Achievement Unlocked", tip: "Build your streak! Employees with 20+ day streaks get recognized monthly.", bgColor: Colors.purple },
    ];
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return tips[dayOfYear % tips.length];
  }, []);

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
        {/* HERO SECTION - Check In/Out as Primary Action */}
        <LinearGradient
          colors={["#FF8C42", "#FF6B35", "#FF5722"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Top Bar - Profile & Settings */}
          <View style={styles.topBar}>
            <View style={styles.greetingSection}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.nameText}>
                {user?.full_name?.split(" ")[0]}
              </Text>
            </View>

            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={() => router.push("/(employee)/notifications")}
                activeOpacity={0.7}
                accessibilityLabel={`Notifications${
                  unreadCount > 0 ? `, ${unreadCount} unread` : ""
                }`}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color="#FFFFFF"
                />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={() => router.push("/profile")}
                activeOpacity={0.7}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Pill */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.statusPillContainer}
          >
            <View
              style={[
                styles.statusPill,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              {(isCheckedIn || activeBreak) && (
                <PulsingDot color={getStatusColor()} />
              )}
              {!isCheckedIn && !activeBreak && (
                <View
                  style={[
                    styles.statusDotStatic,
                    { backgroundColor: getStatusColor() },
                  ]}
                />
              )}
              <Text style={styles.statusPillText}>{getStatusMessage()}</Text>
              {attendanceStreak.currentStreak > 0 && (
                <View style={styles.streakBadgeSmall}>
                  <MaterialCommunityIcons
                    name="fire"
                    size={12}
                    color="#FF9500"
                  />
                  <Text style={styles.streakBadgeText}>
                    {attendanceStreak.currentStreak}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Main Check-In/Out Button */}
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={styles.checkInSection}
          >
            {loadingToday ? (
              <View style={styles.loadingCheckIn}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : (
              <>
                {!isTodayWorking && !todayAttendance ? (
                  <View style={styles.dayOffContainer}>
                    <View style={styles.dayOffIcon}>
                      <Ionicons name="sunny" size={48} color="#FFD93D" />
                    </View>
                    <Text style={styles.dayOffTitle}>It's Your Day Off!</Text>
                    <Text style={styles.dayOffSubtitle}>
                      Enjoy your time. See you on{" "}
                      {workingDays.length > 0
                        ? formatWorkingDays(workingDays)
                        : "your next working day"}
                    </Text>
                  </View>
                ) : isCheckedOut ? (
                  <View style={styles.completedDayContainer}>
                    <View style={styles.completedIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={64}
                        color="#4ADE80"
                      />
                    </View>
                    <Text style={styles.completedTitle}>Great Work Today!</Text>
                    <View style={styles.completedStats}>
                      <View style={styles.completedStatItem}>
                        <Text style={styles.completedStatValue}>
                          {formatHours(
                            (todayAttendance?.total_hours || 0) -
                            (todayAttendance?.overtime_hours || 0)
                          )}
                        </Text>
                        <Text style={styles.completedStatLabel}>Hours</Text>
                      </View>
                      {(todayAttendance?.overtime_hours || 0) > 0 && (
                        <View style={styles.completedStatItem}>
                          <Text
                            style={[
                              styles.completedStatValue,
                              { color: Colors.purple },
                            ]}
                          >
                            +{formatHours(todayAttendance?.overtime_hours || 0)}
                          </Text>
                          <Text style={styles.completedStatLabel}>Overtime</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : activeBreak || upcomingBreak ? (
                  <View style={styles.breakContainer}>
                    <View style={styles.breakIconWrapper}>
                      <MaterialCommunityIcons
                        name="coffee"
                        size={48}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.breakTitle}>
                      {activeBreak ? "On Break" : "Break Scheduled"}
                    </Text>
                    <Text style={styles.breakTime}>
                      {activeBreak
                        ? `Started at ${formatTime(new Date(activeBreak.actual_start_time || ""))}`
                        : `Starts at ${formatTime(new Date(upcomingBreak?.actual_start_time || ""))}`}
                    </Text>
                    {activeBreak && (
                      <TouchableOpacity
                        style={styles.endBreakButton}
                        onPress={handleEndBreak}
                        disabled={endBreakMutation.isPending}
                        activeOpacity={0.8}
                      >
                        {endBreakMutation.isPending ? (
                          <ActivityIndicator size="small" color="#FF6B35" />
                        ) : (
                          <>
                            <MaterialCommunityIcons
                              name="coffee-to-go"
                              size={20}
                              color="#FF6B35"
                            />
                            <Text style={styles.endBreakButtonText}>
                              End Break
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.checkInButtonWrapper}>
                    <NeumorphicCheckInButton
                      onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
                      disabled={
                        checkInMutation.isPending || checkOutMutation.isPending
                      }
                      loading={
                        checkInMutation.isPending || checkOutMutation.isPending
                      }
                      isCheckedIn={!!isCheckedIn}
                      checkInTime={todayAttendance?.check_in_time}
                      size={160}
                    />
                  </View>
                )}
              </>
            )}
          </Animated.View>

          {/* Today's Time Info (only if checked in) */}
          {todayAttendance && !activeBreak && !upcomingBreak && (
            <Animated.View
              entering={FadeInUp.delay(300).springify()}
              style={styles.todayTimeRow}
            >
              <View style={styles.timeInfoItem}>
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                <Text style={styles.timeInfoLabel}>In</Text>
                <Text style={styles.timeInfoValue}>
                  {formatTime(new Date(todayAttendance.check_in_time || ""))}
                </Text>
              </View>
              <View style={styles.timeInfoDivider} />
              <View style={styles.timeInfoItem}>
                <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                <Text style={styles.timeInfoLabel}>Out</Text>
                <Text style={styles.timeInfoValue}>
                  {todayAttendance.check_out_time
                    ? formatTime(new Date(todayAttendance.check_out_time))
                    : "--:--"}
                </Text>
              </View>
              <View style={styles.timeInfoDivider} />
              <View style={styles.timeInfoItem}>
                <Ionicons name="timer-outline" size={16} color="#FFFFFF" />
                <Text style={styles.timeInfoLabel}>Hours</Text>
                <Text style={styles.timeInfoValue}>
                  {formatHours(todayAttendance.total_hours || 0)}
                </Text>
              </View>
            </Animated.View>
          )}
        </LinearGradient>

        {/* Error Banner */}
        {hasError && (
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={styles.errorBanner}
          >
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>Failed to load some data</Text>
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={PressOpacity.primary}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Date Card */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.dateCard}
        >
          <View style={styles.dateIconWrapper}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.dateText}>{currentDateFormatted}</Text>
        </Animated.View>

        {/* Quick Actions - Horizontal Scroll */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={styles.quickActionsSection}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/(employee)/salary")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: Colors.warningLight },
                ]}
              >
                <MaterialCommunityIcons
                  name="wallet"
                  size={24}
                  color={Colors.warning}
                />
              </View>
              <Text style={styles.quickActionLabel}>Salary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/(employee)/leave")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: Colors.pinkLight },
                ]}
              >
                <MaterialCommunityIcons
                  name="palm-tree"
                  size={24}
                  color={Colors.pink}
                />
              </View>
              <Text style={styles.quickActionLabel}>Leave</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/(employee)/breaks")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: Colors.cyanLight },
                ]}
              >
                <MaterialCommunityIcons
                  name="coffee"
                  size={24}
                  color={Colors.cyan}
                />
              </View>
              <Text style={styles.quickActionLabel}>Breaks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/(employee)/attendance")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: Colors.primaryLight },
                ]}
              >
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.quickActionLabel}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() =>
                router.push("/(employee)/search-employer" as Href)
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: Colors.indigoLight },
                ]}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={24}
                  color={Colors.indigo}
                />
              </View>
              <Text style={styles.quickActionLabel}>Search</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* Break/Overtime Actions (context-aware) */}
        {isCheckedIn && !activeBreak && !upcomingBreak && !pendingBreakRequest && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.contextActionsRow}
          >
            <TouchableOpacity
              style={styles.contextActionButton}
              onPress={() => setShowBreakRequestModal(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="coffee-outline"
                size={20}
                color={Colors.warning}
              />
              <Text style={styles.contextActionText}>Request Break</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Pending Break Request Card */}
        {pendingBreakRequest && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.pendingBreakCard}
          >
            <View style={styles.pendingBreakHeader}>
              <View style={styles.pendingBreakBadge}>
                <PulsingDot color={Colors.warning} />
                <Text style={styles.pendingBreakBadgeText}>Pending Approval</Text>
              </View>
            </View>
            <View style={styles.pendingBreakContent}>
              <MaterialCommunityIcons
                name="coffee"
                size={32}
                color={Colors.warning}
              />
              <View style={styles.pendingBreakInfo}>
                <Text style={styles.pendingBreakTime}>
                  Break at{" "}
                  {formatTime(
                    new Date(pendingBreakRequest.requested_start_time || "")
                  )}
                </Text>
                {pendingBreakRequest.reason && (
                  <Text style={styles.pendingBreakReason}>
                    {pendingBreakRequest.reason}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Overtime Request/Display (after checkout) */}
        {todayAttendance?.check_out_time && (
          <Animated.View
            entering={FadeInDown.delay(250).springify()}
            style={styles.overtimeSection}
          >
            {todayOvertimeRequest?.status === "pending" ? (
              <View style={styles.overtimePendingCard}>
                <View style={styles.overtimePendingBadge}>
                  <PulsingDot color={Colors.warning} />
                  <Text style={styles.overtimePendingBadgeText}>
                    Overtime Pending
                  </Text>
                </View>
                <View style={styles.overtimePendingContent}>
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
            ) : todayOvertimeRequest?.status === "approved" ||
              (todayAttendance.overtime_hours || 0) > 0 ? (
              <View style={styles.overtimeApprovedCard}>
                <MaterialCommunityIcons
                  name="clock-plus-outline"
                  size={24}
                  color={Colors.purple}
                />
                <View style={styles.overtimeApprovedInfo}>
                  <Text style={styles.overtimeApprovedLabel}>Overtime</Text>
                  <Text style={styles.overtimeApprovedValue}>
                    +{formatHours(todayAttendance.overtime_hours || 0)}
                  </Text>
                </View>
              </View>
            ) : todayOvertimeRequest?.status === "rejected" ? (
              <View style={styles.overtimeRejectedCard}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
                <Text style={styles.overtimeRejectedText}>
                  Overtime request rejected
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addOvertimeButton}
                onPress={() => setShowOvertimeModal(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="clock-plus-outline"
                  size={20}
                  color={Colors.purple}
                />
                <Text style={styles.addOvertimeText}>Request Overtime</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.gray400}
                />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Monthly Progress Card */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.progressCard}
        >
          <View style={styles.progressCardHeader}>
            <Text style={styles.progressCardTitle}>This Month</Text>
            {attendanceStreak.currentStreak > 0 && (
              <AttendanceStreakBadge
                currentStreak={attendanceStreak.currentStreak}
                size="sm"
              />
            )}
          </View>

          {monthlyStatsLoading ? (
            <View style={styles.loadingSmall}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : (
            <>
              <View style={styles.progressStats}>
                <View style={styles.progressStatItem}>
                  <Text style={styles.progressStatValue}>
                    {monthlyStats?.daysAttended || 0}
                  </Text>
                  <Text style={styles.progressStatLabel}>Days</Text>
                </View>
                <View style={styles.progressStatDivider} />
                <View style={styles.progressStatItem}>
                  <Text style={styles.progressStatValue}>
                    {Math.round(monthlyStats?.totalWorkingHours || 0)}h
                  </Text>
                  <Text style={styles.progressStatLabel}>Hours</Text>
                </View>
                <View style={styles.progressStatDivider} />
                <View style={styles.progressStatItem}>
                  <Text
                    style={[styles.progressStatValue, { color: Colors.success }]}
                  >
                    {monthlyStats?.attendancePercentage || 0}%
                  </Text>
                  <Text style={styles.progressStatLabel}>Attendance</Text>
                </View>
              </View>

              {/* Mini Calendar Heatmap */}
              {monthlySummary?.records && monthlySummary.records.length > 0 && (
                <View style={styles.heatmapWrapper}>
                  <MiniCalendarHeatmap
                    records={monthlySummary.records}
                    month={new Date().getMonth()}
                    year={new Date().getFullYear()}
                  />
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* Employer Info Card */}
        {currentEmployment && (
          <Animated.View
            entering={FadeInDown.delay(350).springify()}
            style={styles.employerCard}
          >
            <View style={styles.employerCardLeft}>
              <View style={styles.employerIcon}>
                <MaterialCommunityIcons
                  name="office-building"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.employerInfo}>
                <Text style={styles.employerName} numberOfLines={1}>
                  {currentEmployment.organization?.name || "Organization"}
                </Text>
                <Text style={styles.employerDuration}>
                  {employmentDuration} with company
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.changeEmployerButton}
              onPress={() =>
                router.push("/(employee)/employment-history" as Href)
              }
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={18}
                color={Colors.info}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Earnings Preview (if has salary) */}
        {user?.base_salary != null && user.base_salary > 0 && (
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.earningsCard}
          >
            <TouchableOpacity
              style={styles.earningsCardContent}
              onPress={() => router.push("/(employee)/salary")}
              activeOpacity={0.7}
            >
              <View style={styles.earningsLeft}>
                <View style={styles.earningsIcon}>
                  <MaterialCommunityIcons
                    name="wallet"
                    size={24}
                    color={Colors.warning}
                  />
                </View>
                <View style={styles.earningsInfo}>
                  <Text style={styles.earningsLabel}>
                    {latestSalary?.month_year || "Earnings"}
                  </Text>
                  <Text style={styles.earningsValue}>
                    {loadingSalary
                      ? "..."
                      : latestSalary
                        ? formatCurrency(latestSalary.total_salary || 0)
                        : "View Salary"}
                  </Text>
                </View>
              </View>
              {latestSalary && (
                <View
                  style={[
                    styles.earningsStatus,
                    latestSalary.status === "paid"
                      ? styles.statusPaid
                      : latestSalary.status === "approved"
                        ? styles.statusApproved
                        : styles.statusPending,
                  ]}
                >
                  <Text style={styles.earningsStatusText}>
                    {latestSalary.status}
                  </Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.gray400}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Daily Tip Card */}
        <Animated.View
          entering={FadeInDown.delay(450).springify()}
          style={styles.tipSection}
        >
          <TipCard
            icon={dailyTip.icon}
            title={dailyTip.title}
            tip={dailyTip.tip}
            bgColor={dailyTip.bgColor}
          />
        </Animated.View>

        {/* Welcome Section for New Employees */}
        {isNewEmployee && (
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            style={styles.welcomeSection}
          >
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>Welcome to Vyapaar Sewa!</Text>
              <Text style={styles.welcomeSubtitle}>
                Here's what you can do with the app
              </Text>
            </View>

            <FeatureCard
              icon="clock-check-outline"
              iconColor={Colors.primary}
              iconBg={Colors.primaryLight}
              title="Track Attendance"
              description="Check in/out with one tap and track your work hours"
              onPress={() => router.push("/(employee)/attendance")}
            />

            <FeatureCard
              icon="palm-tree"
              iconColor={Colors.pink}
              iconBg={Colors.pinkLight}
              title="Request Leave"
              description="Apply for time off and track your leave balance"
              onPress={() => router.push("/(employee)/leave")}
            />

            <FeatureCard
              icon="wallet"
              iconColor={Colors.warning}
              iconBg={Colors.warningLight}
              title="View Salary"
              description="Check your earnings, deductions, and payment history"
              onPress={() => router.push("/(employee)/salary")}
            />

            <FeatureCard
              icon="coffee"
              iconColor={Colors.cyan}
              iconBg={Colors.cyanLight}
              title="Manage Breaks"
              description="Request breaks and view your break history"
              onPress={() => router.push("/(employee)/breaks")}
            />
          </Animated.View>
        )}

        {/* Explore More Section */}
        <Animated.View
          entering={FadeInDown.delay(550).springify()}
          style={styles.exploreSection}
        >
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.exploreGrid}>
            <TouchableOpacity
              style={styles.exploreCard}
              onPress={() => router.push("/(employee)/attendance")}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.exploreCardGradient}
              >
                <Ionicons name="stats-chart" size={28} color="#FFFFFF" />
                <Text style={styles.exploreCardTitle}>Attendance</Text>
                <Text style={styles.exploreCardSubtitle}>View history</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exploreCard}
              onPress={() => router.push("/(employee)/leave")}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#EC4899", "#F472B6"]}
                style={styles.exploreCardGradient}
              >
                <Ionicons name="airplane" size={28} color="#FFFFFF" />
                <Text style={styles.exploreCardTitle}>Leave</Text>
                <Text style={styles.exploreCardSubtitle}>Plan time off</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Help & Support */}
        <Animated.View
          entering={FadeInDown.delay(600).springify()}
          style={styles.helpSection}
        >
          <TouchableOpacity
            style={styles.helpCard}
            onPress={() => router.push("/profile")}
            activeOpacity={0.7}
          >
            <View style={styles.helpIconWrapper}>
              <Ionicons name="help-circle-outline" size={24} color={Colors.info} />
            </View>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpSubtitle}>
                View settings, update profile, or contact support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
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
          onConfirm={handleConfirmWiFiAction}
          verificationResult={wifiVerificationResult}
          action={pendingAction === "check-out" ? "check-out" : "check-in"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Section
  heroGradient: {
    paddingTop: Spacing["6xl"] + Spacing.md,
    paddingBottom: Spacing["2xl"],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  greetingSection: {
    gap: 2,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  nameText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  topBarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Status Pill
  statusPillContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusDotStatic: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  streakBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
    marginLeft: 4,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Check In Section
  checkInSection: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  loadingCheckIn: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  checkInButtonWrapper: {
    alignItems: "center",
  },

  // Day Off
  dayOffContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  dayOffIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  dayOffTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  dayOffSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },

  // Completed Day
  completedDayContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  completedIcon: {
    marginBottom: Spacing.sm,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: Spacing.md,
  },
  completedStats: {
    flexDirection: "row",
    gap: Spacing["2xl"],
  },
  completedStatItem: {
    alignItems: "center",
  },
  completedStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  completedStatLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  // Break Container
  breakContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  breakIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  breakTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  breakTime: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: Spacing.md,
  },
  endBreakButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  endBreakButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF6B35",
  },

  // Today Time Row
  todayTimeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  timeInfoItem: {
    alignItems: "center",
    gap: 4,
  },
  timeInfoLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  timeInfoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  timeInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
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
    color: "#991B1B",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error,
  },

  // Date Card
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: Spacing.xl,
    marginTop: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  dateIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Quick Actions
  quickActionsSection: {
    marginTop: Spacing.xl,
  },
  quickActionsScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  quickActionCard: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginRight: Spacing.sm,
    ...Shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },

  // Context Actions
  contextActionsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  contextActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: StatusColors.pending.background,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
  },
  contextActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: StatusColors.pending.text,
  },

  // Pending Break Card
  pendingBreakCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: StatusColors.pending.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
    overflow: "hidden",
  },
  pendingBreakHeader: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: StatusColors.pending.border,
  },
  pendingBreakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingBreakBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: StatusColors.pending.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pendingBreakContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  pendingBreakInfo: {
    flex: 1,
  },
  pendingBreakTime: {
    fontSize: 15,
    fontWeight: "600",
    color: StatusColors.pending.text,
  },
  pendingBreakReason: {
    fontSize: 13,
    color: StatusColors.pending.text,
    marginTop: 2,
    opacity: 0.8,
  },

  // Overtime Section
  overtimeSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  overtimePendingCard: {
    backgroundColor: StatusColors.pending.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
    overflow: "hidden",
  },
  overtimePendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: StatusColors.pending.border,
  },
  overtimePendingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: StatusColors.pending.text,
    textTransform: "uppercase",
  },
  overtimePendingContent: {
    padding: 12,
  },
  overtimePendingHours: {
    fontSize: 15,
    fontWeight: "600",
    color: StatusColors.pending.text,
  },
  overtimePendingReason: {
    fontSize: 13,
    color: StatusColors.pending.text,
    marginTop: 4,
    opacity: 0.8,
  },
  overtimeApprovedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.purpleLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  overtimeApprovedInfo: {
    flex: 1,
  },
  overtimeApprovedLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.purple,
  },
  overtimeApprovedValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.purple,
  },
  overtimeRejectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  overtimeRejectedText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.error,
  },
  addOvertimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    ...Shadows.sm,
  },
  addOvertimeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.purple,
  },

  // Progress Card
  progressCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  progressCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  loadingSmall: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  progressStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: Spacing.md,
  },
  progressStatItem: {
    flex: 1,
    alignItems: "center",
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  progressStatLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  heatmapWrapper: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // Employer Card
  employerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  employerCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  employerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  employerInfo: {
    flex: 1,
  },
  employerName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  employerDuration: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  changeEmployerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.infoLight,
    justifyContent: "center",
    alignItems: "center",
  },

  // Earnings Card
  earningsCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    ...Shadows.sm,
  },
  earningsCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  earningsLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.warningLight,
    justifyContent: "center",
    alignItems: "center",
  },
  earningsInfo: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  earningsStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earningsStatusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    color: Colors.text,
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

  // Tip Section
  tipSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 16,
    gap: Spacing.md,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 18,
  },

  // Welcome Section
  welcomeSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  welcomeHeader: {
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Feature Card
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: Spacing.md,
    borderRadius: 14,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Explore Section
  exploreSection: {
    marginTop: Spacing.xl,
  },
  exploreGrid: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  exploreCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    ...Shadows.sm,
  },
  exploreCardGradient: {
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    gap: 8,
  },
  exploreCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  exploreCardSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },

  // Help Section
  helpSection: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: Spacing.md,
    borderRadius: 14,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  helpIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.infoLight,
    justifyContent: "center",
    alignItems: "center",
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  helpSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
