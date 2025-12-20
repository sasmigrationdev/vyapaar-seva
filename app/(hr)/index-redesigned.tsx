import { Text } from "@/components/ui/Text";
import TeamHealthCard from "@/components/ui/TeamHealthCard";
import QuickActionsRow from "@/components/ui/QuickActionsRow";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useHRAllEmployeesAttendance } from "@/hooks/queries/useAttendance";
import { usePendingBreakRequests } from "@/hooks/queries/useBreakRequests";
import { usePendingJoinRequests } from "@/hooks/queries/useEmployerRequests";
import { useHRPendingLeaveRequests } from "@/hooks/queries/useLeave";
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
    isFetchingUsers ||
    isFetchingAttendance ||
    isFetchingLeaves ||
    isFetchingBreakRequests ||
    isFetchingJoinRequests;

  // Calculate statistics
  const activeEmployees = isLoadingAnyData
    ? 0
    : allUsers?.filter((u) => u.is_active && u.role === "employee").length || 0;
  const totalEmployees = isLoadingAnyData ? 0 : allUsers?.length || 0;
  const leadershipCount = isLoadingAnyData
    ? 0
    : allUsers?.filter((u) => u.role === "hr" || u.role === "admin").length || 0;
  const inactiveCount = isLoadingAnyData
    ? 0
    : allUsers?.filter((u) => !u.is_active).length || 0;
  const checkedInToday = isLoadingAnyData
    ? 0
    : todayAttendance?.filter((a) => a.check_in_time !== null).length || 0;
  const pendingLeavesCount = isLoadingAnyData ? 0 : pendingLeaves?.length || 0;
  const pendingBreakCount = isLoadingAnyData ? 0 : pendingBreakRequests?.length || 0;
  const pendingJoinCount = isLoadingAnyData ? 0 : pendingJoinRequests?.length || 0;
  const totalPendingApprovals = pendingLeavesCount + pendingBreakCount + pendingJoinCount;
  const yetToCheckIn = Math.max(activeEmployees - checkedInToday, 0);

  // Quick Actions configuration
  const quickActions = [
    {
      id: "salary",
      label: "Salary",
      icon: "wallet" as const,
      color: Colors.warning,
      onPress: () => router.push("/(hr)/salary"),
    },
    {
      id: "leave",
      label: "Leave",
      icon: "beach" as const,
      color: "#EC4899",
      onPress: () => router.push("/(hr)/leave"),
      badge: pendingLeavesCount,
    },
    {
      id: "breaks",
      label: "Breaks",
      icon: "coffee" as const,
      color: "#0891B2",
      onPress: () => router.push("/(hr)/breaks"),
      badge: pendingBreakCount,
    },
    {
      id: "wifi",
      label: "WiFi",
      icon: "wifi" as const,
      color: "#2563EB",
      onPress: () => router.push("/(hr)/wifi-networks"),
    },
    {
      id: "requests",
      label: "Requests",
      icon: "clipboard-clock" as const,
      color: "#6366F1",
      onPress: () => router.push("/(hr)/break-requests"),
    },
    {
      id: "cashbook",
      label: "Cash Book",
      icon: "cash-register" as const,
      color: Colors.success,
      onPress: () => router.push("/(hr)/financial"),
    },
  ];

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
        {/* SECTION 1: Hero with Team Health */}
        <LinearGradient
          colors={["#E67300", "#FF9933", "#FFB366"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {/* Header Row */}
          <View style={styles.heroHeader}>
            <View style={styles.heroHeaderLeft}>
              <Text style={styles.greeting}>
                Hello, {user?.full_name?.split(" ")[0]}
              </Text>
              <View style={styles.datePill}>
                <Feather name="calendar" size={14} color="rgba(255,255,255,0.9)" />
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

          {/* Team Health Card - Primary Focus */}
          <TeamHealthCard
            totalStaff={activeEmployees}
            presentToday={checkedInToday}
            pendingCheckIn={yetToCheckIn}
            pendingLeaves={pendingLeavesCount}
            pendingBreaks={pendingBreakCount}
            pendingJoins={pendingJoinCount}
            isLoading={isLoadingAnyData}
            onAttendancePress={() => router.push("/(hr)/attendance")}
            onApprovalsPress={() => router.push("/(hr)/leave")}
          />
        </LinearGradient>

        {/* SECTION 2: Quick Actions (Horizontal Scroll) */}
        <View style={styles.quickActionsWrapper}>
          <QuickActionsRow actions={quickActions} />
        </View>

        {/* SECTION 3: Pending Actions (Collapsible) */}
        <View style={styles.sectionWrapper}>
          <CollapsibleSection
            title="Pending Actions"
            subtitle={totalPendingApprovals > 0 ? `${totalPendingApprovals} items need attention` : "All caught up!"}
            badge={totalPendingApprovals > 0 ? totalPendingApprovals : undefined}
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
                  <MaterialCommunityIcons name="beach" size={18} color="#EF4444" />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>Leave Requests</Text>
                  <Text style={styles.listSubtitle}>
                    {pendingLeavesCount > 0 ? `${pendingLeavesCount} pending` : "All clear"}
                  </Text>
                </View>
                {pendingLeavesCount > 0 && (
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>{pendingLeavesCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
              </TouchableOpacity>

              {/* Break Requests */}
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/(hr)/break-requests")}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: "#CFFAFE" }]}>
                  <MaterialCommunityIcons name="coffee" size={18} color="#0891B2" />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>Break Requests</Text>
                  <Text style={styles.listSubtitle}>
                    {pendingBreakCount > 0 ? `${pendingBreakCount} pending` : "All clear"}
                  </Text>
                </View>
                {pendingBreakCount > 0 && (
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>{pendingBreakCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
              </TouchableOpacity>

              {/* Join Requests */}
              <TouchableOpacity
                style={[styles.listItem, styles.listItemLast]}
                onPress={() => router.push("/(hr)/join-requests" as Href)}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: "#DBEAFE" }]}>
                  <MaterialCommunityIcons name="account-multiple-plus" size={18} color="#2563EB" />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>Join Requests</Text>
                  <Text style={styles.listSubtitle}>
                    {pendingJoinCount > 0 ? `${pendingJoinCount} pending` : "All clear"}
                  </Text>
                </View>
                {pendingJoinCount > 0 && (
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>{pendingJoinCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={Colors.gray300} />
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
                <View style={[styles.teamStatIcon, { backgroundColor: Colors.primary + "15" }]}>
                  <MaterialCommunityIcons name="account-multiple" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.teamStatValue}>{totalEmployees}</Text>
                <Text style={styles.teamStatLabel}>Total</Text>
              </TouchableOpacity>

              <View style={styles.teamStatItem}>
                <View style={[styles.teamStatIcon, { backgroundColor: Colors.success + "15" }]}>
                  <MaterialCommunityIcons name="account-check" size={20} color={Colors.success} />
                </View>
                <Text style={styles.teamStatValue}>{activeEmployees}</Text>
                <Text style={styles.teamStatLabel}>Active</Text>
              </View>

              <View style={styles.teamStatItem}>
                <View style={[styles.teamStatIcon, { backgroundColor: Colors.accent + "15" }]}>
                  <MaterialCommunityIcons name="shield-account" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.teamStatValue}>{leadershipCount}</Text>
                <Text style={styles.teamStatLabel}>HR/Admin</Text>
              </View>

              <View style={styles.teamStatItem}>
                <View style={[styles.teamStatIcon, { backgroundColor: Colors.error + "15" }]}>
                  <MaterialCommunityIcons name="account-off" size={20} color={Colors.error} />
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
  },

  // Hero Section
  heroSection: {
    paddingTop: Spacing["6xl"],
    paddingBottom: Spacing["2xl"],
    paddingHorizontal: Spacing["xl"],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: Spacing["xl"],
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroHeaderLeft: {
    gap: Spacing.sm,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
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

  // Quick Actions
  quickActionsWrapper: {
    marginTop: Spacing["xl"],
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
    borderBottomColor: "rgba(0,0,0,0.04)",
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
