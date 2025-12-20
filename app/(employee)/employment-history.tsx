import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useEmploymentHistory } from "@/hooks/queries/useEmploymentHistory";
import { EmploymentHistory } from "@/lib/types";
import { formatDate } from "@/lib/utils/date.utils";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/ui/Text";

export default function EmploymentHistoryScreen() {
  const { user } = useAuth();
  const userId = user?.id || "";

  const {
    data: history,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useEmploymentHistory(userId);

  const currentEmployment = history?.find((h) => !h.left_at);
  const pastEmployments = history?.filter((h) => h.left_at);

  const getJoinMethodLabel = (method: string) => {
    switch (method) {
      case "approved":
        return "Join Request";
      case "migrated":
        return "Migrated";
      case "hr_added":
        return "Added by HR";
      default:
        return method;
    }
  };

  const getJoinMethodIcon = (method: string) => {
    switch (method) {
      case "approved":
        return "checkmark-circle";
      case "migrated":
        return "sync";
      case "hr_added":
        return "person-add";
      default:
        return "help-circle";
    }
  };

  const calculateDuration = (joinedAt: string, leftAt?: string | null) => {
    const start = new Date(joinedAt);
    const end = leftAt ? new Date(leftAt) : new Date();

    const months = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (months < 1) {
      const days = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      return days === 1 ? "1 day" : `${days} days`;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
      return months === 1 ? "1 month" : `${months} months`;
    }

    if (remainingMonths === 0) {
      return years === 1 ? "1 year" : `${years} years`;
    }

    return `${years}y ${remainingMonths}m`;
  };

  const renderEmploymentCard = ({
    item,
    index,
  }: {
    item: EmploymentHistory;
    index: number;
  }) => {
    const isCurrent = !item.left_at;
    const duration = calculateDuration(item.joined_at, item.left_at);

    return (
      <View style={styles.timelineItem}>
        {/* Timeline connector */}
        {index !== (history?.length || 0) - 1 && (
          <View style={styles.timelineConnector} />
        )}

        {/* Timeline dot */}
        <View
          style={[styles.timelineDot, isCurrent && styles.timelineDotActive]}
        >
          <MaterialCommunityIcons
            name={isCurrent ? "briefcase" : "briefcase-outline"}
            size={16}
            color={isCurrent ? "#FFFFFF" : Colors.primary}
          />
        </View>

        {/* Card */}
        <View style={[styles.card, isCurrent && styles.currentCard]}>
          {/* Current Badge */}
          {isCurrent && (
            <View style={styles.currentBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}

          {/* Employer Header */}
          <View style={styles.cardHeader}>
            <View style={styles.orgIconContainer}>
              <MaterialCommunityIcons
                name="account-tie"
                size={28}
                color={isCurrent ? Colors.primary : Colors.gray500}
              />
            </View>
            <View style={styles.orgInfo}>
              <Text style={styles.orgName}>
                {item.employer_name ||
                 item.organization?.owner?.full_name ||
                 item.organization?.name ||
                 "Unknown Employer"}
              </Text>
              {item.employer_email && (
                <Text style={styles.orgEmail}>{item.employer_email}</Text>
              )}
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Join Date */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Feather name="calendar" size={14} color={Colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Joined</Text>
                <Text style={styles.detailValue}>
                  {formatDate(new Date(item.joined_at))}
                </Text>
              </View>
            </View>

            {/* Leave Date */}
            {item.left_at && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Feather name="calendar" size={14} color={Colors.textSecondary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Left</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(new Date(item.left_at))}
                  </Text>
                </View>
              </View>
            )}

            {/* Duration */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{duration}</Text>
              </View>
            </View>

            {/* Join Method */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Ionicons
                  name={getJoinMethodIcon(item.join_method) as any}
                  size={14}
                  color={Colors.textSecondary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Method</Text>
                <Text style={styles.detailValue}>
                  {getJoinMethodLabel(item.join_method)}
                </Text>
              </View>
            </View>
          </View>

          {/* Approved By */}
          {item.approved_by && item.approver && (
            <View style={styles.approverSection}>
              <View style={styles.approverRow}>
                <View style={styles.approverIconWrapper}>
                  <Ionicons name="person-outline" size={14} color={Colors.primary} />
                </View>
                <Text style={styles.approverLabel}>Approved by</Text>
                <Text style={styles.approverName}>{item.approver.full_name}</Text>
              </View>
            </View>
          )}

          {/* Leave Reason */}
          {item.leave_reason && (
            <View style={styles.reasonSection}>
              <View style={styles.reasonHeader}>
                <MaterialCommunityIcons
                  name="information"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.reasonTitle}>Leave Reason</Text>
              </View>
              <Text style={styles.reasonText}>{item.leave_reason}</Text>
            </View>
          )}

          {/* Termination Info */}
          {item.terminated_by && (
            <View style={styles.terminationBadge}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.terminationText}>Terminated by Employer</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <MaterialCommunityIcons
            name="briefcase-outline"
            size={56}
            color={Colors.gray400}
          />
        </View>
        <Text style={styles.emptyStateTitle}>No Employment History</Text>
        <Text style={styles.emptyStateText}>
          You haven't worked with any employer yet. Search for your employer to
          get started!
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Employment History",
            headerBackTitle: "Back",
            headerStyle: {
              backgroundColor: Colors.background,
            },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Employment History",
            headerBackTitle: "Back",
            headerStyle: {
              backgroundColor: Colors.background,
            },
          }}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>
            {(error as any)?.message || "Failed to load employment history"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Employment History",
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: Colors.background,
          },
        }}
      />

      {/* Stats Header */}
      {history && history.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{history.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                currentEmployment && { color: Colors.success },
              ]}
            >
              {currentEmployment ? "1" : "0"}
            </Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pastEmployments?.length || 0}</Text>
            <Text style={styles.statLabel}>Past</Text>
          </View>
        </View>
      )}

      {/* Timeline */}
      <FlatList
        data={(history as any) || []}
        keyExtractor={(item) => item.id}
        renderItem={renderEmploymentCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  // Stats Header
  statsContainer: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // List
  listContent: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  // Timeline
  timelineItem: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    position: "relative",
  },
  timelineConnector: {
    position: "absolute",
    left: 19,
    top: 44,
    bottom: -Spacing.lg,
    width: 2,
    backgroundColor: Colors.border,
  },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    zIndex: 1,
  },
  timelineDotActive: {
    backgroundColor: Colors.primary,
  },
  // Card
  card: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  currentCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "#EEF2FF",
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FFFFFF",
  },
  currentBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: "#FFFFFF",
    fontWeight: Typography.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Card Header
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  orgIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  orgInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  orgName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  orgEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  // Details Grid
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    minWidth: "48%",
    flex: 1,
  },
  detailIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  // Approver Section
  approverSection: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  approverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  approverIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  approverLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  approverName: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    textAlign: "right",
  },
  // Reason Section
  reasonSection: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reasonTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: "italic",
  },
  // Termination Badge
  terminationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  terminationText: {
    fontSize: Typography.fontSize.sm,
    color: "#DC2626",
    fontWeight: Typography.fontWeight.semibold,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
