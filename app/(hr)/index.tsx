import { Text } from "@/components/ui/Text";
import { TeamHealthScoreCard } from "@/components/ui/TeamHealthScore";
import QuickActionsGrid from "@/components/ui/QuickActionsGrid";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { GlassCardSimple } from "@/components/ui/GlassCard";
import {
  BorderRadius,
  Colors,
  Gradients,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useHRAllEmployeesAttendance } from "@/hooks/queries/useAttendance";
import { usePendingBreakRequests } from "@/hooks/queries/useBreakRequests";
import { usePendingJoinRequests } from "@/hooks/queries/useEmployerRequests";
import { useHRPendingLeaveRequests } from "@/hooks/queries/useLeave";
import { usePendingOvertimeCount } from "@/hooks/queries/useOvertimeRequests";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAutoRejectExpiredBreaksForOrg } from "@/hooks/useAutoRejectExpiredBreaksForOrg";
import { formatDate, formatDateToISO } from "@/lib/utils/date.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function HRDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const today = formatDateToISO(new Date());

  // Queries
  const {
    data: todayAttendance,
    isLoading: loadingAttendance,
    isFetching: isFetchingAttendance,
    refetch: refetchAttendance,
  } = useHRAllEmployeesAttendance({
    date: today,
    organizationId: user?.organization_id || "",
  });

  const {
    data: pendingLeaves,
    isLoading: loadingLeaves,
    isFetching: isFetchingLeaves,
    refetch: refetchLeaves,
  } = useHRPendingLeaveRequests(user?.organization_id || "");

  const {
    data: pendingBreakRequests,
    isLoading: loadingBreakRequests,
    isFetching: isFetchingBreakRequests,
    refetch: refetchBreakRequests,
  } = usePendingBreakRequests(user?.organization_id || "");

  const {
    data: pendingJoinRequests,
    isLoading: loadingJoinRequests,
    isFetching: isFetchingJoinRequests,
    refetch: refetchJoinRequests,
  } = usePendingJoinRequests(user?.organization_id || "");

  const {
    data: pendingOvertimeCount,
    isLoading: loadingOvertimeRequests,
    isFetching: isFetchingOvertimeRequests,
    refetch: refetchOvertimeRequests,
  } = usePendingOvertimeCount(user?.organization_id || "");

  const {
    data: allUsers,
    isLoading: loadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
  } = useAllUsers({
    organizationId: user?.organization_id || "",
  });

  // Auto-reject expired pending break requests
  useAutoRejectExpiredBreaksForOrg(user?.organization_id || "", user?.id || "");

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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Quick Actions configuration - 2x2 grid layout
  const quickActions = [
    {
      id: "salary",
      label: "Salary",
      description: "Manage payroll",
      icon: "wallet" as const,
      color: Colors.warning,
      onPress: () => router.push("/(hr)/salary"),
    },
    {
      id: "attendance",
      label: "Attendance",
      description: "Track team",
      icon: "clock-check-outline" as const,
      color: Colors.primary,
      onPress: () => router.push("/(hr)/attendance"),
    },
    {
      id: "employees",
      label: "Team",
      description: `${totalEmployees} members`,
      icon: "account-group" as const,
      color: Colors.secondary,
      onPress: () => router.push("/(hr)/employees"),
    },
    {
      id: "cashbook",
      label: "Cashbook",
      description: "Transactions",
      icon: "cash-register" as const,
      color: Colors.success,
      onPress: () => router.push("/(hr)/financial"),
    },
  ];

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
        {/* SECTION 1: Hero Header */}
        <LinearGradient
          colors={Gradients.saffronHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {/* Header Row */}
          <View style={styles.heroHeader}>
            <View style={styles.heroHeaderLeft}>
              <Text style={styles.greetingSmall}>{getGreeting()}</Text>
              <Text style={styles.greeting}>
                {user?.full_name?.split(" ")[0]}
              </Text>
              <View style={styles.datePill}>
                <Feather name="calendar" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.dateText}>{formatDate(new Date())}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push("/profile")}
            >
              <Text style={styles.profileInitial}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* SECTION 2: Team Health Score - Floating Card */}
        <View style={styles.healthCardWrapper}>
          <TeamHealthScoreCard
            presentCount={checkedInToday}
            totalCount={activeEmployees}
            pendingCount={yetToCheckIn}
            onPress={() => router.push("/(hr)/attendance")}
          />
        </View>

        {/* SECTION 3: Attention Required Banner */}
        {totalPendingApprovals > 0 && (
          <TouchableOpacity
            style={styles.attentionBanner}
            onPress={() => router.push("/(hr)/leave")}
            activeOpacity={0.8}
          >
            <View style={styles.attentionIconWrapper}>
              <MaterialCommunityIcons name="alert-circle" size={22} color={Colors.warning} />
            </View>
            <View style={styles.attentionContent}>
              <Text style={styles.attentionTitle}>Attention Required</Text>
              <Text style={styles.attentionSubtitle}>
                {pendingLeavesCount > 0 && `${pendingLeavesCount} leave`}
                {pendingLeavesCount > 0 && pendingBreakCount > 0 && ", "}
                {pendingBreakCount > 0 && `${pendingBreakCount} break`}
                {(pendingLeavesCount > 0 || pendingBreakCount > 0) && pendingOvertimeRequestsCount > 0 && ", "}
                {pendingOvertimeRequestsCount > 0 && `${pendingOvertimeRequestsCount} overtime`}
                {(pendingLeavesCount > 0 || pendingBreakCount > 0 || pendingOvertimeRequestsCount > 0) && pendingJoinCount > 0 && ", "}
                {pendingJoinCount > 0 && `${pendingJoinCount} join`}
                {" requests pending"}
              </Text>
            </View>
            <View style={styles.attentionBadge}>
              <Text style={styles.attentionBadgeText}>{totalPendingApprovals}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* SECTION 4: Quick Actions Grid */}
        <View style={styles.quickActionsWrapper}>
          <QuickActionsGrid actions={quickActions} columns={2} />
        </View>

        {/* SECTION 3: Pending Actions (Collapsible) */}
        <View style={styles.sectionWrapper}>
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
        </View>

        {/* SECTION 4: Team Overview (Collapsible) */}
        <View style={styles.sectionWrapper}>
          <CollapsibleSection
            title="Team Overview"
            subtitle={`${totalEmployees} total members`}
            icon="people-outline"
            iconColor={Colors.primary}
            defaultExpanded={false}
          >
            <View style={styles.teamStatsGrid}>
              <TouchableOpacity
                style={styles.teamStatItem}
                onPress={() => router.push("/(hr)/employees")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.teamStatIcon,
                    { backgroundColor: Colors.primary + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account-multiple"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.teamStatValue}>{totalEmployees}</Text>
                <Text style={styles.teamStatLabel}>Total</Text>
              </TouchableOpacity>

              <View style={styles.teamStatItem}>
                <View
                  style={[
                    styles.teamStatIcon,
                    { backgroundColor: Colors.success + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account-check"
                    size={20}
                    color={Colors.success}
                  />
                </View>
                <Text style={styles.teamStatValue}>{activeEmployees}</Text>
                <Text style={styles.teamStatLabel}>Active</Text>
              </View>

              <View style={styles.teamStatItem}>
                <View
                  style={[
                    styles.teamStatIcon,
                    { backgroundColor: Colors.accent + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="shield-account"
                    size={20}
                    color={Colors.accent}
                  />
                </View>
                <Text style={styles.teamStatValue}>{leadershipCount}</Text>
                <Text style={styles.teamStatLabel}>HR/Admin</Text>
              </View>

              <View style={styles.teamStatItem}>
                <View
                  style={[
                    styles.teamStatIcon,
                    { backgroundColor: Colors.error + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account-off"
                    size={20}
                    color={Colors.error}
                  />
                </View>
                <Text style={styles.teamStatValue}>{inactiveCount}</Text>
                <Text style={styles.teamStatLabel}>Inactive</Text>
              </View>
            </View>
          </CollapsibleSection>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    gap: Spacing.lg,
  },

  // Hero Section - Compact header
  heroSection: {
    paddingTop: Spacing["6xl"],
    paddingBottom: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroHeaderLeft: {
    gap: Spacing.xs,
  },
  greetingSmall: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Health Card - Floating with negative margin
  healthCardWrapper: {
    marginTop: -Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
  },

  // Attention Banner
  attentionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: Spacing.md,
  },
  attentionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  attentionContent: {
    flex: 1,
    gap: 2,
  },
  attentionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  attentionSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#B45309",
  },
  attentionBadge: {
    backgroundColor: Colors.warning,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  attentionBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Quick Actions
  quickActionsWrapper: {
    marginTop: Spacing.sm,
  },

  // Section Wrapper
  sectionWrapper: {
    paddingHorizontal: Spacing["xl"],
    marginTop: Spacing["lg"],
  },

  // List Items
  listContainer: {},
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  listSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  listBadge: {
    backgroundColor: Colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  listBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Team Stats Grid
  teamStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  teamStatItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  teamStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  teamStatValue: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  teamStatLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
});
