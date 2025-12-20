import { Text } from "@/components/ui/Text";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { usePayrollPeriods } from "@/hooks/queries/usePayroll";
import { formatDate } from "@/lib/utils/date.utils";
import { PayrollPeriod } from "@/lib/types/payroll";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

export default function PayrollDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const {
    data: payrollPeriods,
    isLoading: loadingPeriods,
    isFetching: isFetchingPeriods,
    refetch: refetchPeriods,
  } = usePayrollPeriods({
    organizationId: user?.organization_id || "",
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchPeriods();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return { bg: "#f3f4f6", text: "#6b7280", icon: "pencil-outline" };
      case "in_review":
        return { bg: "#fef3c7", text: "#f59e0b", icon: "eye-outline" };
      case "approved":
        return { bg: "#dbeafe", text: "#3b82f6", icon: "checkmark-circle-outline" };
      case "processing":
        return { bg: "#e0e7ff", text: "#6366f1", icon: "sync-outline" };
      case "completed":
        return { bg: "#dcfce7", text: "#16a34a", icon: "checkmark-done-outline" };
      case "cancelled":
        return { bg: "#fee2e2", text: "#ef4444", icon: "close-circle-outline" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280", icon: "help-circle-outline" };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Draft";
      case "in_review": return "In Review";
      case "approved": return "Approved";
      case "processing": return "Processing";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[month - 1] || "";
  };

  // Calculate statistics
  const draftCount = payrollPeriods?.filter(p => p.status === "draft").length || 0;
  const processingCount = payrollPeriods?.filter(p => p.status === "processing" || p.status === "in_review").length || 0;
  const completedCount = payrollPeriods?.filter(p => p.status === "completed").length || 0;
  const totalPeriods = payrollPeriods?.length || 0;

  const totalPayrollAmount = payrollPeriods?.reduce((sum, p) => sum + (p.total_net_salary || 0), 0) || 0;
  const totalPaidAmount = payrollPeriods?.reduce((sum, p) => sum + (p.total_amount_paid || 0), 0) || 0;

  const isLoading = loadingPeriods || isFetchingPeriods;

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
        {/* Hero Section */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreeting}>Payroll Management</Text>
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

          {/* Stats Cards */}
          <View style={styles.heroMetricsRow}>
            <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
              <View style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}>
                <MaterialCommunityIcons
                  name="file-document-multiple"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>total periods</Text>
                <Text style={styles.heroMetricValue}>
                  {isLoading ? "—" : totalPeriods}
                </Text>
                <Text style={styles.heroMetricMeta}>
                  {isLoading ? "Loading…" : `${completedCount} completed`}
                </Text>
              </View>
            </View>

            <View style={[styles.heroMetricCard, styles.heroMetricSecondary]}>
              <View style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}>
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>total payroll</Text>
                <Text style={styles.heroMetricValue}>
                  {isLoading ? "—" : `₹${Math.floor(totalPayrollAmount / 1000)}K`}
                </Text>
                <Text style={styles.heroMetricMeta}>
                  {isLoading ? "Loading…" : `₹${Math.floor(totalPaidAmount / 1000)}K paid`}
                </Text>
              </View>
            </View>

            <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
              <View style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>in progress</Text>
                <Text style={styles.heroMetricValue}>
                  {isLoading ? "—" : processingCount}
                </Text>
                <Text style={styles.heroMetricMeta}>
                  {isLoading ? "Loading…" : `${draftCount} drafts`}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Create New Payroll Period Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/(hr)/payroll/create")}
          activeOpacity={0.7}
        >
          <View style={styles.createButtonIconContainer}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
          </View>
          <View style={styles.createButtonContent}>
            <Text style={styles.createButtonTitle}>Create New Payroll Period</Text>
            <Text style={styles.createButtonSubtitle}>
              Initialize payroll for {getMonthName(currentMonth)} {currentYear}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        </TouchableOpacity>

        {/* Payroll Periods List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payroll Periods</Text>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingLabel}>Loading payroll periods…</Text>
            </View>
          ) : payrollPeriods && payrollPeriods.length > 0 ? (
            <View style={styles.periodsList}>
              {payrollPeriods.map((period: PayrollPeriod) => {
                const statusColor = getStatusColor(period.status);
                const progressPercentage = period.total_employees > 0
                  ? Math.round((period.employees_paid / period.total_employees) * 100)
                  : 0;

                return (
                  <TouchableOpacity
                    key={period.id}
                    style={styles.periodCard}
                    onPress={() => router.push(`/(hr)/payroll/${period.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.periodCardHeader}>
                      <View style={styles.periodCardTitleRow}>
                        <MaterialCommunityIcons
                          name="calendar-month"
                          size={20}
                          color={Colors.primary}
                        />
                        <Text style={styles.periodTitle}>
                          {getMonthName(period.month)} {period.year}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                        <Ionicons name={statusColor.icon as any} size={14} color={statusColor.text} />
                        <Text style={[styles.statusText, { color: statusColor.text }]}>
                          {getStatusLabel(period.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.periodCardBody}>
                      <View style={styles.periodStats}>
                        <View style={styles.periodStat}>
                          <Text style={styles.periodStatLabel}>Employees</Text>
                          <Text style={styles.periodStatValue}>{period.total_employees}</Text>
                        </View>
                        <View style={styles.periodStatDivider} />
                        <View style={styles.periodStat}>
                          <Text style={styles.periodStatLabel}>Gross Amount</Text>
                          <Text style={styles.periodStatValue}>
                            ₹{Math.floor(period.total_gross_salary / 1000)}K
                          </Text>
                        </View>
                        <View style={styles.periodStatDivider} />
                        <View style={styles.periodStat}>
                          <Text style={styles.periodStatLabel}>Net Amount</Text>
                          <Text style={[styles.periodStatValue, { color: Colors.success }]}>
                            ₹{Math.floor(period.total_net_salary / 1000)}K
                          </Text>
                        </View>
                      </View>

                      {period.status !== "draft" && period.total_employees > 0 && (
                        <View style={styles.progressSection}>
                          <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Payment Progress</Text>
                            <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
                          </View>
                          <View style={styles.progressBar}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${progressPercentage}%`, backgroundColor: statusColor.text }
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {period.employees_paid} of {period.total_employees} employees paid
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.periodCardFooter}>
                      <View style={styles.periodDateInfo}>
                        <Feather name="clock" size={12} color={Colors.textSecondary} />
                        <Text style={styles.periodDateText}>
                          Created {new Date(period.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="clipboard-text-clock-outline"
                size={48}
                color={Colors.gray300}
              />
              <Text style={styles.emptyStateTitle}>No Payroll Periods Yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Create your first payroll period to get started
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push("/(hr)/payroll/create")}
              >
                <Text style={styles.emptyStateButtonText}>Create Payroll Period</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    paddingTop: Spacing["5xl"],
    paddingBottom: Spacing["2xl"],
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
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
    gap: Spacing["md"],
  },
  heroGreeting: {
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
  heroDateText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
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
    marginBottom: Spacing["sm"],
  },
  heroMetricCard: {
    flex: 1,
    minWidth: 160,
    flexBasis: "48%",
    borderRadius: BorderRadius["2xl"],
    paddingVertical: Spacing["lg"],
    paddingHorizontal: Spacing["lg"],
    gap: Spacing["sm"],
    flexDirection: "row",
    alignItems: "center",
    minHeight: 90,
  },
  heroMetricPrimary: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroMetricSecondary: {
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroMetricIcon: {
    width: 48,
    height: 52,
    borderRadius: BorderRadius["2xl"],
    justifyContent: "center",
    alignItems: "center",
  },
  heroMetricIconOverlay: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroMetricContent: {
    flex: 1,
    gap: Spacing["xs"],
  },
  heroMetricLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
    opacity: 0.72,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  heroMetricValue: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  heroMetricMeta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.75,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["md"],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing["lg"],
    borderWidth: 2,
    borderColor: Colors.primary + "20",
    borderStyle: "dashed",
    ...Shadows.sm,
  },
  createButtonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonContent: {
    flex: 1,
    gap: Spacing["xs"],
  },
  createButtonTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  createButtonSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  section: {
    gap: Spacing["md"],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  loadingState: {
    alignItems: "center",
    gap: Spacing["sm"],
    paddingVertical: Spacing["4xl"],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
  },
  loadingLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  periodsList: {
    gap: Spacing["md"],
  },
  periodCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.sm,
  },
  periodCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing["lg"],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  periodCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["sm"],
  },
  periodTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["xs"],
    paddingHorizontal: Spacing["md"],
    paddingVertical: Spacing["xs"],
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: "capitalize",
  },
  periodCardBody: {
    padding: Spacing["lg"],
    gap: Spacing["md"],
  },
  periodStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  periodStat: {
    flex: 1,
    alignItems: "center",
    gap: Spacing["xs"],
  },
  periodStatLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  periodStatValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  periodStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  progressSection: {
    gap: Spacing["sm"],
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  progressPercentage: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  periodCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing["lg"],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  periodDateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["xs"],
  },
  periodDateText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing["md"],
    paddingVertical: Spacing["5xl"],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  emptyStateButton: {
    marginTop: Spacing["md"],
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing["xl"],
    paddingVertical: Spacing["md"],
    borderRadius: BorderRadius.lg,
  },
  emptyStateButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
});
