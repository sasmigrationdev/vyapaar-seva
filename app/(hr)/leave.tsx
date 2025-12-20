import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useReviewLeaveRequest } from "@/hooks/mutations/useLeaveMutations";
import { useHRAllLeaveRequests } from "@/hooks/queries/useLeave";
import { LeaveRequestWithUser } from "@/lib/types";
import { formatDate } from "@/lib/utils/date.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";

export default function HRLeaveScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error, confirm, confirmDestructive } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const { data: leaveRequests, isLoading, refetch } = useHRAllLeaveRequests({
    organizationId: user?.organization_id || '',
  }, {
    enabled: !!user?.organization_id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const reviewMutation = useReviewLeaveRequest({
    onSuccess: () => {
      success("Success", "Leave request reviewed");
    },
    onError: (err) => {
      error("Error", err.message);
    },
  });

  const handleApprove = (requestId: string) => {
    confirm(
      "Approve Leave",
      "Are you sure you want to approve this leave request?",
      () =>
        reviewMutation.mutate({
          requestId,
          status: "approved",
          reviewedBy: user?.id || "",
        }),
      undefined,
      "Approve"
    );
  };

  const handleReject = (requestId: string) => {
    confirmDestructive(
      "Reject Leave",
      "Are you sure you want to reject this leave request?",
      () =>
        reviewMutation.mutate({
          requestId,
          status: "rejected",
          reviewedBy: user?.id || "",
          reviewerNotes: "Rejected by HR",
        }),
      undefined,
      "Reject"
    );
  };

  // Filter leave requests based on active tab
  const pendingCount =
    leaveRequests?.filter((r) => r.status === "pending")?.length ?? 0;
  const filteredLeaveRequests = leaveRequests?.filter((request) => {
    if (activeTab === "pending") {
      return request.status === "pending";
    }
    return true; // 'all' tab shows everything
  });

  const renderLeaveItem = ({ item }: { item: LeaveRequestWithUser }) => {
    const statusConfig = {
      pending: { bg: "#FEF3C7", color: "#F59E0B", icon: "clock-outline" },
      approved: { bg: "#DCFCE7", color: "#10B981", icon: "check-circle" },
      rejected: { bg: "#FEE2E2", color: "#EF4444", icon: "close-circle" },
    };
    const leaveTypeConfig = {
      sick: { bg: "#FEE2E2", color: "#EF4444", icon: "medical-bag" },
      casual: { bg: "#DBEAFE", color: "#3B82F6", icon: "coffee" },
      earned: { bg: "#DCFCE7", color: "#10B981", icon: "star" },
      unpaid: { bg: "#F3E8FF", color: "#A855F7", icon: "cash-off" },
      other: { bg: "#F1F5F9", color: "#64748B", icon: "dots-horizontal" },
    };
    const config =
      statusConfig[item.status as keyof typeof statusConfig] ||
      statusConfig.pending;
    const typeConfig =
      leaveTypeConfig[item.leave_type as keyof typeof leaveTypeConfig] ||
      leaveTypeConfig.other;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.leaveIconWrapper,
                { backgroundColor: typeConfig.bg },
              ]}
            >
              <MaterialCommunityIcons
                name={typeConfig.icon as any}
                size={24}
                color={typeConfig.color}
              />
            </View>
            <View>
              <Text style={styles.leaveTypeTitle}>{item.leave_type}</Text>
              <Text style={styles.cardSubtext}>
                {item.user?.full_name || "Unknown Employee"}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.dateRangeContainer}>
          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" />
              <Text style={styles.dateLabel}>From</Text>
            </View>
            <Text style={styles.dateValue}>
              {formatDate(new Date(item.start_date))}
            </Text>
          </View>

          <View style={styles.dateDivider} />

          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <Ionicons name="calendar" size={18} color="#64748B" />
              <Text style={styles.dateLabel}>To</Text>
            </View>
            <Text style={styles.dateValue}>
              {formatDate(new Date(item.end_date))}
            </Text>
          </View>

          <View style={styles.dateDivider} />

          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <MaterialCommunityIcons
                name="calendar-range"
                size={18}
                color="#64748B"
              />
              <Text style={styles.dateLabel}>Total Days</Text>
            </View>
            <Text style={styles.dateValue}>
              {item.total_days || 0} day{(item.total_days || 0) > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.reasonContainer}>
          <View style={styles.reasonHeader}>
            <Feather name="message-square" size={16} color="#64748B" />
            <Text style={styles.reasonLabel}>Reason</Text>
          </View>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>

        {item.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(item.id)}
              disabled={reviewMutation.isPending}
              activeOpacity={0.7}
            >
              {reviewMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(item.id)}
              disabled={reviewMutation.isPending}
              activeOpacity={0.7}
            >
              {reviewMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {item.reviewer_notes && (
          <View style={styles.reviewerNotesContainer}>
            <View style={styles.reviewerNotesHeader}>
              <MaterialCommunityIcons
                name="comment-text-outline"
                size={16}
                color="#6366F1"
              />
              <Text style={styles.reviewerNotesLabel}>Reviewer Notes</Text>
            </View>
            <Text style={styles.reviewerNotesText}>{item.reviewer_notes}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Modern Header with Gradient */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.headerTitle}>Leave Requests</Text>
            <View style={styles.heroDatePill}>
              <MaterialCommunityIcons
                name="beach"
                size={16}
                color={Colors.textInverse}
              />
              <Text style={styles.headerSubtitle}>
                {pendingCount > 0 ? `${pendingCount} pending` : "All clear"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pending
          </Text>
          {(leaveRequests?.filter((r) => r.status === "pending")?.length ?? 0) >
            0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {leaveRequests?.filter((r) => r.status === "pending")?.length ??
                  0}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
          onPress={() => setActiveTab("all")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "all" && styles.activeTabText,
            ]}
          >
            All
          </Text>
          {leaveRequests && leaveRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{leaveRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : filteredLeaveRequests && filteredLeaveRequests.length > 0 ? (
        <FlatList
          data={filteredLeaveRequests}
          renderItem={renderLeaveItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#6366F1"]}
              tintColor="#6366F1"
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="beach" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            {activeTab === "pending"
              ? "No pending requests"
              : "No leave requests"}
          </Text>
          <Text style={styles.emptySubtext}>
            Leave requests will appear here
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing["2xl"],
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
    ...Shadows.lg,
  },
  headerContent: {
    paddingHorizontal: Spacing["2xl"],
  },
  heroTextBlock: {
    gap: Spacing["md"],
  },
  headerTitle: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  heroDatePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing["xs"],
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: Spacing["md"],
    paddingVertical: Spacing["xs"],
    borderRadius: BorderRadius.full,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["lg"],
    paddingBottom: Spacing["md"],
    gap: Spacing["md"],
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["lg"],
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray50,
    gap: Spacing["sm"],
  },
  activeTab: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textInverse,
  },
  badge: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing["sm"],
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  listContent: {
    padding: Spacing["2xl"],
    paddingBottom: Spacing["4xl"],
  },
  card: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing["lg"],
    marginBottom: Spacing["lg"],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  leaveIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  leaveTypeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "capitalize",
  },
  cardSubtext: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  dateRangeContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  reasonContainer: {
    marginBottom: 8,
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  reviewerNotesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
  },
  reviewerNotesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  reviewerNotesLabel: {
    fontSize: 13,
    color: "#6366F1",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reviewerNotesText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
});
