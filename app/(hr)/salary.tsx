import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAllCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useAllUsers } from "@/hooks/queries/useUser";
import {
  downloadBulkSalarySheet,
  getAvailableCompletedMonths,
} from "@/lib/utils/bulkSalarySheet.utils";
import { formatDate } from "@/lib/utils/date.utils";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HRSalaryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{
    month: number;
    year: number;
    monthName: string;
  } | null>(null);
  const [availableMonths, setAvailableMonths] = useState<
    Array<{
      month: number;
      year: number;
      monthName: string;
      employeeCount: number;
    }>
  >([]);

  const {
    data: employees,
    isLoading: loadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
  } = useAllUsers({
    role: "employee",
    organizationId: user?.organization_id ?? undefined,
  });
  const {
    data: currentMonthEarnings,
    isLoading: loadingEarnings,
    isFetching: isFetchingEarnings,
    refetch: refetchEarnings,
  } = useAllCurrentMonthEarnings(user?.organization_id ?? undefined);

  // Load available completed months on mount
  useEffect(() => {
    loadAvailableMonths();
  }, []);

  const loadAvailableMonths = async () => {
    try {
      const months = await getAvailableCompletedMonths();
      setAvailableMonths(months);
    } catch (error) {
      console.error("Error loading available months:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchUsers(),
        refetchEarnings(),
        loadAvailableMonths(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectMonth = (
    month: number,
    year: number,
    monthName: string
  ) => {
    setSelectedMonth({ month, year, monthName });
    setShowMonthPicker(false);
  };

  const handleDownloadSalarySheet = async () => {
    if (!selectedMonth) return;

    setDownloading(true);
    try {
      await downloadBulkSalarySheet(selectedMonth.month, selectedMonth.year);
      success("Success", "Salary sheet generated successfully!");
    } catch (err) {
      console.error("Error downloading salary sheet:", err);
      error("Error", "Failed to generate salary sheet. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Calculate total base salary of all employees
  const totalBaseSalary =
    employees?.reduce((sum, user) => sum + (user.base_salary || 0), 0) || 0;

  // Calculate total earned this month
  const totalEarnedThisMonth =
    currentMonthEarnings?.reduce(
      (sum: number, earning: any) => sum + (Number(earning.earned_salary) || 0),
      0
    ) || 0;

  // Create a map of user earnings
  const earningsMap = new Map(
    currentMonthEarnings?.map((e: any) => [
      e.user_id,
      Number(e.earned_salary) || 0,
    ]) || []
  );

  const isLoading =
    loadingUsers || loadingEarnings || isFetchingUsers || isFetchingEarnings;

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
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreeting}>Salary Management</Text>
              <View style={styles.heroDatePill}>
                <Feather name="calendar" size={16} color={Colors.textInverse} />
                <Text style={styles.heroDateText}>
                  {formatDate(new Date())}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Cards in Hero */}
          <View style={styles.heroMetricsRow}>
            <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>total base</Text>
                <Text
                  style={styles.heroMetricValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {isLoading
                    ? "—"
                    : `₹${Math.floor(totalBaseSalary).toLocaleString("en-IN")}`}
                </Text>
                <Text style={styles.heroMetricMeta}>
                  {isLoading ? "Loading…" : `${employees?.length || 0} staff`}
                </Text>
              </View>
            </View>

            <View style={[styles.heroMetricCard, styles.heroMetricSecondary]}>
              <View
                style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}
              >
                <MaterialCommunityIcons
                  name="currency-inr"
                  size={22}
                  color={Colors.textInverse}
                />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>this month</Text>
                <Text
                  style={styles.heroMetricValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {isLoading
                    ? "—"
                    : `₹${Math.floor(totalEarnedThisMonth).toLocaleString(
                        "en-IN"
                      )}`}
                </Text>
                <Text style={styles.heroMetricMeta}>
                  {isLoading ? "Loading…" : "Spent"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Salary Sheet Download Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Generate Salary Sheet</Text>
          <View style={styles.sectionBody}>
            <View style={styles.downloadContent}>
              {/* Month Selector */}
              <TouchableOpacity
                style={styles.monthSelector}
                onPress={() => setShowMonthPicker(true)}
                disabled={availableMonths.length === 0}
              >
                <View style={styles.monthSelectorLeft}>
                  <MaterialCommunityIcons
                    name="calendar-month"
                    size={20}
                    color={Colors.textSecondary}
                  />
                  <Text
                    style={styles.monthSelectorText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {selectedMonth ? selectedMonth.monthName : "Select Month"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Download Button */}
              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  (!selectedMonth || downloading) &&
                    styles.downloadButtonDisabled,
                ]}
                onPress={handleDownloadSalarySheet}
                disabled={!selectedMonth || downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="download"
                      size={20}
                      color={Colors.textInverse}
                    />
                    <Text style={styles.downloadButtonText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {availableMonths.length === 0 && (
              <View style={styles.noMonthsHint}>
                <MaterialCommunityIcons
                  name="information"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.noMonthsHintText}>
                  No completed months available. Salary sheets are available
                  after month ends.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Employee Breakdown Table */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Employee Breakdown</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : employees && employees.length > 0 ? (
            <View style={styles.sectionBody}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text
                  style={[styles.tableHeaderText, styles.employeeNameColumn]}
                >
                  Employee
                </Text>
                <Text style={[styles.tableHeaderText, styles.salaryColumn]}>
                  Base Salary
                </Text>
                <Text style={[styles.tableHeaderText, styles.earnedColumn]}>
                  Earned
                </Text>
              </View>

              {/* Table Rows */}
              <View style={styles.tableBody}>
                {employees.map((employee, index) => {
                  const earned = earningsMap.get(employee.id) || 0;
                  return (
                    <View key={employee.id}>
                      <View style={styles.tableRow}>
                        <Text
                          style={[
                            styles.employeeName,
                            styles.employeeNameColumn,
                          ]}
                          numberOfLines={1}
                        >
                          {employee.full_name}
                        </Text>
                        <Text style={[styles.baseSalary, styles.salaryColumn]}>
                          ₹
                          {Math.floor(employee.base_salary || 0).toLocaleString(
                            "en-IN"
                          )}
                        </Text>
                        <Text
                          style={[styles.earnedAmount, styles.earnedColumn]}
                        >
                          ₹{Math.floor(earned).toLocaleString("en-IN")}
                        </Text>
                      </View>
                      {index < employees.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Table Footer with Totals */}
              <View style={styles.tableFooter}>
                <Text
                  style={[styles.tableFooterText, styles.employeeNameColumn]}
                >
                  Total ({employees.length} employees)
                </Text>
                <Text style={[styles.tableFooterAmount, styles.salaryColumn]}>
                  ₹{Math.floor(totalBaseSalary).toLocaleString("en-IN")}
                </Text>
                <Text style={[styles.tableFooterAmount, styles.earnedColumn]}>
                  ₹{Math.floor(totalEarnedThisMonth).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons
                name="account-off"
                size={40}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyStateText}>No employees found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.monthList}
              showsVerticalScrollIndicator={false}
            >
              {availableMonths.length > 0 ? (
                availableMonths.map((monthData) => {
                  const isSelected =
                    selectedMonth?.month === monthData.month &&
                    selectedMonth?.year === monthData.year;
                  return (
                    <TouchableOpacity
                      key={`${monthData.year}-${monthData.month}`}
                      style={[
                        styles.monthItem,
                        isSelected && styles.monthItemSelected,
                      ]}
                      onPress={() =>
                        handleSelectMonth(
                          monthData.month,
                          monthData.year,
                          monthData.monthName
                        )
                      }
                    >
                      <View style={styles.monthItemLeft}>
                        <MaterialCommunityIcons
                          name="calendar-month"
                          size={24}
                          color={isSelected ? "#de1f26" : "#6366F1"}
                        />
                        <View style={styles.monthInfo}>
                          <Text
                            style={[
                              styles.monthName,
                              isSelected && styles.monthNameSelected,
                            ]}
                          >
                            {monthData.monthName}
                          </Text>
                          <Text style={styles.monthEmployeeCount}>
                            {monthData.employeeCount} employee
                            {monthData.employeeCount !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color="#de1f26"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyMonthsContainer}>
                  <MaterialCommunityIcons
                    name="calendar-remove"
                    size={48}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyMonthsText}>
                    No completed months available
                  </Text>
                  <Text style={styles.emptyMonthsSubtext}>
                    Salary sheets are only available after the month ends
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 120, // Extra padding for floating tab bar (56px tab + 44px safe area + 20px buffer)
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
    flexShrink: 1,
    gap: Spacing["xs"],
    minWidth: 0,
  },
  heroMetricLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
    opacity: 0.72,
    letterSpacing: 0.7,
  },
  heroMetricValue: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  heroMetricMeta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.75,
  },
  section: {
    gap: Spacing["md"],
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  sectionBody: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  loadingContainer: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: Spacing["md"],
    paddingHorizontal: Spacing["lg"],
    backgroundColor: Colors.gray100,
  },
  tableHeaderText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  tableBody: {
    gap: 0,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: Spacing["md"] + 2,
    paddingHorizontal: Spacing["lg"],
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  employeeNameColumn: {
    flex: 2,
  },
  salaryColumn: {
    flex: 1.2,
    textAlign: "right",
  },
  earnedColumn: {
    flex: 1.2,
    textAlign: "right",
  },
  employeeName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  baseSalary: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  earnedAmount: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.success,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing["lg"],
  },
  tableFooter: {
    flexDirection: "row",
    paddingVertical: Spacing["lg"],
    paddingHorizontal: Spacing["lg"],
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    backgroundColor: Colors.gray100,
  },
  tableFooterText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  tableFooterAmount: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  emptyStateContainer: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
    gap: Spacing["md"],
    backgroundColor: Colors.backgroundSecondary,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  downloadContent: {
    gap: Spacing["md"],
    padding: Spacing["lg"],
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing["lg"],
    paddingVertical: Spacing["md"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  monthSelectorText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  noMonthsHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing["sm"],
    padding: Spacing["md"],
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  noMonthsHintText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing["md"],
    borderRadius: BorderRadius.lg,
    gap: Spacing["sm"],
  },
  downloadButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
  },
  downloadButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius["2xl"],
    width: "85%",
    maxHeight: "70%",
    padding: Spacing["lg"],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["lg"],
    paddingBottom: Spacing["lg"],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  monthList: {
    maxHeight: 400,
  },
  monthItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing["lg"],
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing["md"],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthItemSelected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#de1f26",
    borderWidth: 2,
  },
  monthItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  monthInfo: {
    flex: 1,
  },
  monthName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  monthNameSelected: {
    color: "#de1f26",
  },
  monthEmployeeCount: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyMonthsContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyMonthsText: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyMonthsSubtext: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
