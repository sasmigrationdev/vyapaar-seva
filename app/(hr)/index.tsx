import CollapsibleSection from "@/components/ui/CollapsibleSection";
import ComingSoonCarousel from "@/components/ui/ComingSoonCarousel";
import { MarketingBannerCarousel } from "@/components/ui/MarketingBanner";
import QuickActionsGrid from "@/components/ui/QuickActionsGrid";
import TeamAttendanceDonut from "@/components/ui/TeamAttendanceDonut";
import { Text } from "@/components/ui/Text";
import WeeklyAttendanceChart from "@/components/ui/WeeklyAttendanceChart";
import {
  BorderRadius,
  Colors,
  PressOpacity,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useHRAllEmployeesAttendance, useWeeklyAttendanceTrend } from "@/hooks/queries/useAttendance";
import { usePendingBreakRequests } from "@/hooks/queries/useBreakRequests";
import { usePendingJoinRequests } from "@/hooks/queries/useEmployerRequests";
import { useHRPendingLeaveRequests } from "@/hooks/queries/useLeave";
import { useOrganization } from "@/hooks/queries/useOrganization";
import { usePendingOvertimeCount } from "@/hooks/queries/useOvertimeRequests";
import { useUnreadNotificationsCount } from "@/hooks/queries/useNotification";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAutoRejectExpiredBreaksForOrg } from "@/hooks/useAutoRejectExpiredBreaksForOrg";
import { formatDate, formatDateToISO } from "@/lib/utils/date.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, LayoutAnimationConfig } from "react-native-reanimated";

export default function HRDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const today = formatDateToISO(new Date());

  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount(
    user?.id || "",
    { enabled: !!user?.id }
  );

  // Memoize filter objects to prevent React Compiler cache size issues
  const organizationId = user?.organization_id || "";

  const attendanceFilters = useMemo(
    () => ({ date: today, organizationId }),
    [today, organizationId]
  );

  const usersFilters = useMemo(
    () => ({ organizationId }),
    [organizationId]
  );

  // Queries
  const {
    data: todayAttendance,
    isLoading: loadingAttendance,
    isFetching: isFetchingAttendance,
    error: attendanceError,
    refetch: refetchAttendance,
  } = useHRAllEmployeesAttendance(attendanceFilters);

  const {
    data: pendingLeaves,
    isLoading: loadingLeaves,
    isFetching: isFetchingLeaves,
    refetch: refetchLeaves,
  } = useHRPendingLeaveRequests(organizationId);

  const {
    data: pendingBreakRequests,
    isLoading: loadingBreakRequests,
    isFetching: isFetchingBreakRequests,
    refetch: refetchBreakRequests,
  } = usePendingBreakRequests(organizationId);

  const {
    data: pendingJoinRequests,
    isLoading: loadingJoinRequests,
    isFetching: isFetchingJoinRequests,
    refetch: refetchJoinRequests,
  } = usePendingJoinRequests(organizationId);

  const {
    data: pendingOvertimeCount,
    isLoading: loadingOvertimeRequests,
    isFetching: isFetchingOvertimeRequests,
    refetch: refetchOvertimeRequests,
  } = usePendingOvertimeCount(organizationId);

  const {
    data: allUsers,
    isLoading: loadingUsers,
    isFetching: isFetchingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useAllUsers(usersFilters);

  // Get organization details for name
  const { data: organization } = useOrganization(organizationId);

  // Weekly attendance trend for chart
  const {
    data: weeklyTrendData,
    isLoading: loadingWeeklyTrend,
    refetch: refetchWeeklyTrend,
  } = useWeeklyAttendanceTrend(organizationId);

  // Auto-reject expired pending break requests
  useAutoRejectExpiredBreaksForOrg(organizationId, user?.id || "");

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAttendance(),
        refetchLeaves(),
        refetchBreakRequests(),
        refetchJoinRequests(),
        refetchOvertimeRequests(),
        refetchUsers(),
        refetchWeeklyTrend(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Loading state
  const isLoadingAnyData =
    loadingUsers ||
    loadingAttendance ||
    loadingLeaves ||
    loadingBreakRequests ||
    loadingJoinRequests ||
    loadingOvertimeRequests ||
    isFetchingUsers ||
    isFetchingAttendance ||
    isFetchingLeaves ||
    isFetchingBreakRequests ||
    isFetchingJoinRequests ||
    isFetchingOvertimeRequests;

  // Calculate statistics
  const activeEmployees = isLoadingAnyData
    ? 0
    : allUsers?.filter((u) => u.is_active && u.role === "employee").length || 0;
  const totalEmployees = isLoadingAnyData ? 0 : allUsers?.length || 0;
  const leadershipCount = isLoadingAnyData
    ? 0
    : allUsers?.filter((u) => u.role === "hr" || u.role === "admin").length ||
      0;
  const inactiveCount = isLoadingAnyData
    ? 0
    : allUsers?.filter((u) => !u.is_active).length || 0;
  const checkedInToday = isLoadingAnyData
    ? 0
    : todayAttendance?.filter((a) => a.check_in_time !== null).length || 0;
  const pendingLeavesCount = isLoadingAnyData ? 0 : pendingLeaves?.length || 0;
  const pendingBreakCount = isLoadingAnyData
    ? 0
    : pendingBreakRequests?.length || 0;
  const pendingJoinCount = isLoadingAnyData
    ? 0
    : pendingJoinRequests?.length || 0;
  const pendingOvertimeRequestsCount = isLoadingAnyData
    ? 0
    : pendingOvertimeCount || 0;
  const totalPendingApprovals =
    pendingLeavesCount + pendingBreakCount + pendingJoinCount + pendingOvertimeRequestsCount;
  const yetToCheckIn = Math.max(activeEmployees - checkedInToday, 0);

  // Check for any loading errors
  const hasError = attendanceError || usersError;

  // Calculate absent employees for donut chart
  const absentToday = Math.max(activeEmployees - checkedInToday, 0);

  // Promotional Banners for carousel - Image-only banners (text baked into images)
  const promotionalBanners = useMemo(
    () => [
      {
        variant: "image" as const,
        imageSource: require("@/assets/images/banner1.png"),
        onPress: () => router.push("/(hr)/attendance"),
        aspectRatio: 2.2,
      },
      {
        variant: "image" as const,
        imageSource: require("@/assets/images/banner2.png"),
        onPress: () => router.push("/(hr)/salary"),
        aspectRatio: 2.2,
      },
    ],
    [router]
  );

  // Quick Actions configuration - 4x2 grid layout (8 items)
  const quickActions = [
    {
      id: "attendance",
      label: "Attendance",
      icon: "clock-check-outline" as const,
      color: Colors.primary,
      onPress: () => router.push("/(hr)/attendance"),
    },
    {
      id: "employees",
      label: "Team",
      icon: "account-group" as const,
      color: Colors.secondary,
      onPress: () => router.push("/(hr)/employees"),
    },
    {
      id: "leave",
      label: "Leave",
      icon: "palm-tree" as const,
      color: Colors.error,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
      onPress: () => router.push("/(hr)/leave"),
    },
    {
      id: "salary",
      label: "Salary",
      icon: "wallet" as const,
      color: Colors.warning,
      onPress: () => router.push("/(hr)/salary"),
    },
    {
      id: "payroll",
      label: "Payroll",
      icon: "file-document-outline" as const,
      color: Colors.info,
      onPress: () => router.push("/(hr)/payroll"),
    },
    {
      id: "cashbook",
      label: "Cashbook",
      icon: "cash-register" as const,
      color: Colors.success,
      onPress: () => router.push("/(hr)/financial"),
    },
    {
      id: "breaks",
      label: "Breaks",
      icon: "coffee" as const,
      color: Colors.cyan,
      badge: pendingBreakCount > 0 ? pendingBreakCount : undefined,
      onPress: () => router.push("/(hr)/breaks"),
    },
    {
      id: "overtime",
      label: "Overtime",
      icon: "clock-plus-outline" as const,
      color: Colors.purple,
      badge: pendingOvertimeRequestsCount > 0 ? pendingOvertimeRequestsCount : undefined,
      onPress: () => router.push("/(hr)/overtime-requests" as Href),
    },
  ];

  // Suppress Reanimated entering layout animations for this whole subtree.
  // This screen mounts many nested entering animations at once (here + inside
  // TeamAttendanceDonut / MarketingBanner / ComingSoonCarousel). On the New
  // Architecture (Fabric), that burst of nested layout animations firing during
  // the navigation transition wedges the commit path and freezes the JS thread
  // on mount. skipEntering disables them for all descendants via context.
  return (
    <LayoutAnimationConfig skipEntering>
      <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Background Gradient - Softer peach/apricot with elegant fade */}
      <LinearGradient
        colors={["#FF9933", "#FFAD5C", "#FFC896", "#FFE4D0", "#FFF5ED", "#FAFAFA"]}
        locations={[0, 0.1, 0.25, 0.4, 0.6, 0.85]}
        style={styles.backgroundGradient}
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
        {/* SECTION 1: Hero Header - Compact single row */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeader}>
            <View style={styles.heroHeaderLeft}>
              <Text style={styles.userName}>{user?.full_name?.split(" ")[0]}</Text>
              <View style={styles.datePill}>
                <Feather name="calendar" size={13} color="rgba(0,0,0,0.5)" />
                <Text style={styles.dateText}>{formatDate(new Date())}</Text>
              </View>
            </View>

            <View style={styles.heroHeaderRight}>
              {/* Notification Bell */}
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push("/(hr)/notifications")}
                activeOpacity={0.7}
                accessibilityLabel={`Notifications${
                  unreadNotificationsCount > 0
                    ? `, ${unreadNotificationsCount} unread`
                    : ""
                }`}
              >
                <Ionicons name="notifications-outline" size={20} color="#1A1A1A" />
                {unreadNotificationsCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Profile Button */}
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push("/profile")}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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

        {/* SECTION 2: Team Attendance Donut - Premium Dashboard Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.healthCardWrapper}>
          <TeamAttendanceDonut
            present={checkedInToday}
            absent={absentToday}
            onLeave={0}
            total={activeEmployees}
            organizationName={organization?.name}
            totalTeam={totalEmployees}
            pendingLeave={pendingLeavesCount}
            pendingBreak={pendingBreakCount}
            pendingOvertime={pendingOvertimeRequestsCount}
          />
        </Animated.View>

          {/* SECTION 5: Quick Actions Grid - 4x2 */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.quickActionsWrapper}>
          <QuickActionsGrid actions={quickActions} columns={4} />
        </Animated.View>

        {/* Promotional Banners Carousel - Auto-rotating */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.bannerWrapper}>
          <MarketingBannerCarousel
            banners={promotionalBanners}
            autoScroll={true}
            interval={5000}
          />
        </Animated.View>

        {/* SECTION 3: Pending Actions (Collapsible) */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.sectionWrapper}>
          <CollapsibleSection
            title="Pending Actions"
            badge={
              totalPendingApprovals > 0 ? totalPendingApprovals : undefined
            }
            icon="clipboard-outline"
            iconColor={Colors.warning}
            defaultExpanded={totalPendingApprovals > 0}
          >
            <View style={styles.listContainer}>
              {/* Leave Requests */}
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/(hr)/leave")}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: "#FEE2E2" }]}>
                  <MaterialCommunityIcons
                    name="beach"
                    size={18}
                    color="#EF4444"
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>Leave Requests</Text>
                  <Text style={styles.listSubtitle}>
                    {pendingLeavesCount > 0
                      ? `${pendingLeavesCount} pending`
                      : "All clear"}
                  </Text>
                </View>
                {pendingLeavesCount > 0 && (
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>
                      {pendingLeavesCount}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.gray300}
                />
              </TouchableOpacity>

              {/* Break Requests */}
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/(hr)/break-requests")}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: "#CFFAFE" }]}>
                  <MaterialCommunityIcons
                    name="coffee"
                    size={18}
                    color="#0891B2"
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>Break Requests</Text>
                  <Text style={styles.listSubtitle}>
                    {pendingBreakCount > 0
                      ? `${pendingBreakCount} pending`
                      : "All clear"}
                  </Text>
                </View>
                {pendingBreakCount > 0 && (
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>
                      {pendingBreakCount}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.gray300}
                />
              </TouchableOpacity>

              {/* Overtime Requests */}
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/(hr)/overtime-requests" as Href)}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: "#FAF5FF" }]}>
                  <MaterialCommunityIcons
                    name="clock-plus-outline"
                    size={18}
                    color="#8B5CF6"
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>Overtime Requests</Text>
                  <Text style={styles.listSubtitle}>
                    {pendingOvertimeRequestsCount > 0
                      ? `${pendingOvertimeRequestsCount} pending`
                      : "All clear"}
                  </Text>
                </View>
                {pendingOvertimeRequestsCount > 0 && (
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>
                      {pendingOvertimeRequestsCount}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.gray300}
                />
              </TouchableOpacity>

              {/* Join Requests */}
              <TouchableOpacity
                style={[styles.listItem, styles.listItemLast]}
                onPress={() => router.push("/(hr)/join-requests" as Href)}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: "#DBEAFE" }]}>
                  <MaterialCommunityIcons
                    name="account-multiple-plus"
                    size={18}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>Join Requests</Text>
                  <Text style={styles.listSubtitle}>
                    {pendingJoinCount > 0
                      ? `${pendingJoinCount} pending`
                      : "All clear"}
                  </Text>
                </View>
                {pendingJoinCount > 0 && (
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>{pendingJoinCount}</Text>
                  </View>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.gray300}
                />
              </TouchableOpacity>
            </View>
          </CollapsibleSection>
        </Animated.View>

        {/* SECTION 4: Weekly Attendance Chart */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.sectionWrapper}>
          <WeeklyAttendanceChart
            data={weeklyTrendData || []}
            isLoading={loadingWeeklyTrend}
            totalEmployees={activeEmployees}
          />
        </Animated.View>

        {/* SECTION 5: Coming Soon Features */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <ComingSoonCarousel />
        </Animated.View>
      </ScrollView>
    </View>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    gap: Spacing.md,
  },

  // Hero Section - Minimal header row
  heroSection: {
    paddingTop: Spacing["6xl"] + Spacing.lg,
    paddingBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
    backgroundColor: "transparent",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(0,0,0,0.5)",
  },
  heroHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    marginHorizontal: Spacing.xl,
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

  // Health Card - Clean card below gradient fade
  healthCardWrapper: {
    paddingHorizontal: Spacing.xl,
  },

  // Quick Actions
  quickActionsWrapper: {
    marginTop: 0,
  },

  // Banner Wrapper
  bannerWrapper: {
    marginTop: Spacing.xs,
  },

  // Section Wrapper
  sectionWrapper: {
    paddingHorizontal: Spacing["xl"],
    marginTop: Spacing.xs,
  },

  // List Items - Refined
  listContainer: {},
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    flex: 1,
    gap: 3,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  listSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5C5C5C",
  },
  listBadge: {
    backgroundColor: Colors.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
  },
  listBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
