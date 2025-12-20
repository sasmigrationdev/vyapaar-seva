import { Text } from "@/components/ui/Text";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  StatusColors,
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
  ActivityIndicator,
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

  // Check if any data is loading or fetching
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

  // Only calculate statistics when data is available and not fetching
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
  const totalPendingApprovals =
    pendingLeavesCount + pendingBreakCount + pendingJoinCount;
  const yetToCheckIn = Math.max(activeEmployees - checkedInToday, 0);
  const attendancePercentage =
    activeEmployees > 0
      ? Math.round((checkedInToday / activeEmployees) * 100)
      : 0;

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
          colors={["#E67300", "#FF9933", "#FFB366"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreeting}>
                {user?.full_name?.split(" ")[0]}
              </Text>
              <View style={styles.heroDatePill}>
                <Feather name="calendar" size={16} color={Colors.textInverse} />
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

          <View style={styles.heroMetricsRow}>
            <TouchableOpacity
              style={[styles.heroMetricCard, styles.heroMetricPrimary]}
              activeOpacity={0.85}
              onPress={() => router.push("/(hr)/employees")}
            >
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>active staff</Text>
                <Text
                  style={styles.heroMetricValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loadingUsers || isFetchingUsers ? "—" : activeEmployees}
                </Text>
                <Text style={styles.heroMetricMeta} numberOfLines={1}>
                  {loadingUsers || isFetchingUsers
                    ? "Syncing…"
                    : `${totalEmployees} total`}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.heroMetricCard, styles.heroMetricSecondary]}
              activeOpacity={0.85}
              onPress={() => router.push("/(hr)/attendance")}
            >
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <MaterialCommunityIcons
                  name="clock-check-outline"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>pending</Text>
                <Text
                  style={styles.heroMetricValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loadingAttendance || isFetchingAttendance
                    ? "—"
                    : yetToCheckIn}
                </Text>
                <Text style={styles.heroMetricMeta} numberOfLines={1}>
                  {loadingAttendance ||
                  isFetchingAttendance ||
                  loadingUsers ||
                  isFetchingUsers
                    ? "Loading…"
                    : `${checkedInToday} present`}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.heroMetricCard, styles.heroMetricPrimary]}
              activeOpacity={0.85}
              onPress={() => router.push("/(hr)/attendance")}
            >
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <MaterialCommunityIcons
                  name="account-check-outline"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>present</Text>
                <Text
                  style={styles.heroMetricValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loadingAttendance || isFetchingAttendance
                    ? "—"
                    : checkedInToday}
                </Text>
                <Text style={styles.heroMetricMeta} numberOfLines={1}>
                  {loadingUsers || isFetchingUsers ? "Loading…" : "Today"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.heroMetricCard, styles.heroMetricSecondary]}
              activeOpacity={0.85}
              onPress={() => router.push("/(hr)/leave")}
            >
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <MaterialCommunityIcons
                  name="clipboard-clock-outline"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>approvals</Text>
                <Text
                  style={styles.heroMetricValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loadingLeaves ||
                  isFetchingLeaves ||
                  loadingBreakRequests ||
                  isFetchingBreakRequests ||
                  loadingJoinRequests ||
                  isFetchingJoinRequests
                    ? "—"
                    : totalPendingApprovals}
                </Text>
                <Text
                  style={styles.heroMetricMeta}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {loadingLeaves ||
                  isFetchingLeaves ||
                  loadingBreakRequests ||
                  isFetchingBreakRequests ||
                  loadingJoinRequests ||
                  isFetchingJoinRequests
                    ? "Loading…"
                    : `L:${pendingLeavesCount} • B:${pendingBreakCount} • J:${pendingJoinCount}`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitleText}>Quick Actions</Text>

          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => router.push("/(hr)/salary")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: StatusColors.pending.background }]}
              >
                <MaterialCommunityIcons
                  name="wallet"
                  size={22}
                  color={Colors.warning}
                />
              </View>
              <Text style={styles.quickActionLabel}>Salary</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => router.push("/(hr)/payroll")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#e0e7ff" }]}
              >
                <MaterialCommunityIcons
                  name="clipboard-text-clock"
                  size={22}
                  color="#6366f1"
                />
              </View>
              <Text style={styles.quickActionLabel}>Payroll</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => router.push("/(hr)/leave")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#fce7f3" }]}
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
              onPress={() => router.push("/(hr)/breaks")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#cffafe" }]}
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
              onPress={() => router.push("/(hr)/wifi-networks")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#dbeafe" }]}
              >
                <MaterialCommunityIcons name="wifi" size={22} color="#2563eb" />
              </View>
              <Text style={styles.quickActionLabel}>WiFi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => router.push("/(hr)/break-requests")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#e0e7ff" }]}
              >
                <MaterialCommunityIcons
                  name="clipboard-clock"
                  size={22}
                  color="#6366f1"
                />
              </View>
              <Text style={styles.quickActionLabel}>Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => router.push("/(hr)/financial")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: StatusColors.approved.background }]}
              >
                <MaterialCommunityIcons
                  name="cash-register"
                  size={22}
                  color={Colors.success}
                />
              </View>
              <Text style={styles.quickActionLabel}>Cash Book</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => router.push("/(hr)/profile")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#dcfce7" }]}
              >
                <MaterialCommunityIcons name="account-circle" size={22} color="#16a34a" />
              </View>
              <Text style={styles.quickActionLabel}>Profile</Text>
            </TouchableOpacity> */}
          </View>
        </View>

        <View style={styles.modernSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleText}>Pending Actions</Text>
            {totalPendingApprovals > 0 && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {totalPendingApprovals}
                </Text>
              </View>
            )}
          </View>

          {loadingLeaves || loadingBreakRequests || loadingJoinRequests ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingLabel}>Loading…</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/(hr)/leave")}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: StatusColors.pending.background }]}>
                  <MaterialCommunityIcons
                    name="beach"
                    size={20}
                    color={Colors.warning}
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listLabel}>Leave Requests</Text>
                  <Text style={styles.listMeta}>
                    {pendingLeavesCount > 0
                      ? `${pendingLeavesCount} pending`
                      : "All clear"}
                  </Text>
                </View>
                {pendingLeavesCount > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
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

              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/(hr)/break-requests")}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: Colors.accentLight + "30" }]}>
                  <MaterialCommunityIcons
                    name="coffee"
                    size={20}
                    color={Colors.accent}
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listLabel}>Break Requests</Text>
                  <Text style={styles.listMeta}>
                    {pendingBreakCount > 0
                      ? `${pendingBreakCount} pending`
                      : "All clear"}
                  </Text>
                </View>
                {pendingBreakCount > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
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

              <TouchableOpacity
                style={[styles.listItem, styles.listItemLast]}
                onPress={() => router.push("/(hr)/join-requests" as Href)}
                activeOpacity={0.6}
              >
                <View style={[styles.listIcon, { backgroundColor: Colors.infoLight + "30" }]}>
                  <MaterialCommunityIcons
                    name="account-multiple-plus"
                    size={20}
                    color={Colors.info}
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listLabel}>Join Requests</Text>
                  <Text style={styles.listMeta}>
                    {pendingJoinCount > 0
                      ? `${pendingJoinCount} pending`
                      : "All clear"}
                  </Text>
                </View>
                {pendingJoinCount > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {pendingJoinCount}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.gray300}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.modernSection}
          onPress={() => router.push("/(hr)/attendance")}
          activeOpacity={0.6}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleText}>Attendance Health</Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={Colors.textSecondary}
            />
          </View>

          {loadingAttendance ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingLabel}>Loading…</Text>
            </View>
          ) : todayAttendance && todayAttendance.length > 0 ? (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.infoValue}>{checkedInToday}</Text>
                <Text style={styles.infoLabel}>Present</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <Ionicons name="time" size={16} color={Colors.warning} />
                <Text style={styles.infoValue}>{yetToCheckIn}</Text>
                <Text style={styles.infoLabel}>Pending</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <Ionicons name="stats-chart" size={16} color={Colors.primary} />
                <Text style={[styles.infoValue, { color: Colors.primary }]}>
                  {attendancePercentage}%
                </Text>
                <Text style={styles.infoLabel}>Rate</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={36} color={Colors.gray300} />
              <Text style={styles.emptyStateTitle}>No attendance yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Records will appear as check-ins begin
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modernSection}
          onPress={() => router.push("/(hr)/employees")}
          activeOpacity={0.6}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleText}>Team Overview</Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={Colors.textSecondary}
            />
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="account-multiple"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.infoValue}>{totalEmployees}</Text>
              <Text style={styles.infoLabel}>Total</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="shield-account"
                size={16}
                color={Colors.accent}
              />
              <Text style={styles.infoValue}>{leadershipCount}</Text>
              <Text style={styles.infoLabel}>HR</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="account-off"
                size={16}
                color={Colors.error}
              />
              <Text style={styles.infoValue}>{inactiveCount}</Text>
              <Text style={styles.infoLabel}>Inactive</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
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
    gap: Spacing["md"],
  },
  heroGreeting: {
    fontSize: 34,
    fontWeight: "700",
    color: Colors.textInverse,
    letterSpacing: -1,
  },
  heroDatePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroDateText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
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
    marginBottom: Spacing["sm"],
  },
  heroMetricCard: {
    flex: 1,
    minWidth: 160,
    flexBasis: "48%",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 90,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroMetricPrimary: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroMetricSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroMetricIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  heroMetricIconOverlay: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  heroMetricContent: {
    flex: 1,
    flexShrink: 1,
    gap: Spacing["xs"],
    minWidth: 0,
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textInverse,
    opacity: 0.7,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroMetricValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  heroMetricMeta: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textInverse,
    opacity: 0.7,
  },
  sectionBlock: {
    gap: Spacing["lg"],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing["xs"],
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["xl"],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing["lg"],
    ...Shadows.sm,
  },
  loadingState: {
    alignItems: "center",
    gap: Spacing["sm"],
    paddingVertical: Spacing["xl"],
  },
  loadingLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  pendingGrid: {
    gap: Spacing["md"],
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["md"],
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["md"],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  pendingIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingContent: {
    flex: 1,
    gap: Spacing["xs"],
  },
  pendingTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  pendingSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  pendingBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing["md"],
    justifyContent: "center",
    alignItems: "center",
  },
  pendingCount: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  pendingCheck: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  attendanceContent: {
    gap: Spacing["lg"],
  },
  attendanceSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["md"],
  },
  attendanceSummaryBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary + "15",
  },
  attendanceSummaryCopy: {
    flex: 1,
    gap: Spacing["xs"],
  },
  attendanceHeadline: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  attendanceSubheadline: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  attendanceProgressContainer: {
    gap: Spacing["sm"],
  },
  attendanceProgressBar: {
    height: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
    overflow: "hidden",
  },
  attendanceProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  attendanceFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["md"],
  },
  attendanceStatItem: {
    flex: 1,
    gap: Spacing["xs"],
  },
  attendanceStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  attendancePercentage: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  attendanceMeta: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  attendanceStatLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing["sm"],
    paddingVertical: Spacing["xl"],
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  teamInsightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing["md"],
  },
  teamInsightCard: {
    flexBasis: "31%",
    flexGrow: 1,
    minHeight: 120,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing["md"],
    gap: Spacing["sm"],
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
    overflow: "hidden",
  },
  teamInsightGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  teamInsightIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  teamInsightValue: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  teamInsightLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  modernSection: {
    gap: Spacing["md"],
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: Spacing["sm"],
    justifyContent: "center",
    alignItems: "center",
  },
  sectionBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["md"],
    paddingVertical: 16,
    paddingHorizontal: Spacing["lg"],
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    flex: 1,
  },
  listLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  listMeta: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing["sm"],
    justifyContent: "center",
    alignItems: "center",
  },
  countBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: Spacing["lg"],
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing["xs"],
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

  quickActionsSection: {
    gap: Spacing["md"],
  },
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
    borderColor: "rgba(0,0,0,0.04)",
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
});
