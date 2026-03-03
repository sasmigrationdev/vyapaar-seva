import { Text } from "@/components/ui/Text";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import {
  SalaryHeroHeader,
  SalarySummaryStats,
  EmployeeSalaryCard,
  SalaryActionBar,
  type EmployeeStatus,
} from "@/components/salary";
import { BorderRadius, Colors, Spacing, Typography, FontFamily } from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAllCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useAllUsers } from "@/hooks/queries/useUser";
import {
  downloadBulkSalarySheet,
  getAvailableCompletedMonths,
} from "@/lib/utils/bulkSalarySheet.utils";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAlert } from "@/hooks/useAlert";

type FilterTab = "all" | "active" | "inactive" | "no_setup";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function HRSalaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useAlert();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
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

  // Current month display
  const currentMonthDisplay = useMemo(() => {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  // Memoize filter objects
  const organizationId = user?.organization_id ?? undefined;
  const employeeFilters = useMemo(
    () => ({ role: "employee" as const, organizationId }),
    [organizationId]
  );

  // Queries
  const {
    data: employees,
    isLoading: loadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
  } = useAllUsers(employeeFilters);

  const {
    data: currentMonthEarnings,
    isLoading: loadingEarnings,
    isFetching: isFetchingEarnings,
    refetch: refetchEarnings,
  } = useAllCurrentMonthEarnings(organizationId);

  const isLoading =
    loadingUsers || loadingEarnings || isFetchingUsers || isFetchingEarnings;

  // Load available months on mount
  useEffect(() => {
    loadAvailableMonths();
  }, []);

  const loadAvailableMonths = async () => {
    try {
      const months = await getAvailableCompletedMonths();
      setAvailableMonths(months);
    } catch (err) {
      console.error("Error loading available months:", err);
    }
  };

  // Create earnings map
  const earningsMap = useMemo(() => {
    return new Map(
      currentMonthEarnings?.map((e: any) => [
        e.user_id,
        {
          earned: Number(e.earned_salary) || 0,
          hours: Number(e.total_hours) || 0,
        },
      ]) || []
    );
  }, [currentMonthEarnings]);

  // Get employee status
  const getEmployeeStatus = useCallback(
    (employee: any): EmployeeStatus => {
      if (!employee.base_salary && !employee.hourly_rate) return "no_setup";
      const earnings = earningsMap.get(employee.id);
      return earnings && earnings.earned > 0 ? "active" : "inactive";
    },
    [earningsMap]
  );

  // Process employees with status
  const processedEmployees = useMemo(() => {
    if (!employees) return [];

    return employees.map((emp) => {
      const earnings = earningsMap.get(emp.id) || { earned: 0, hours: 0 };
      const status = getEmployeeStatus(emp);

      return {
        ...emp,
        earned: earnings.earned,
        hours: earnings.hours,
        status,
        initials: emp.full_name
          ?.split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "??",
      };
    });
  }, [employees, earningsMap, getEmployeeStatus]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    let result = processedEmployees;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.full_name?.toLowerCase().includes(query) ||
          emp.designation?.toLowerCase().includes(query) ||
          emp.department?.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    if (activeFilter !== "all") {
      result = result.filter((emp) => emp.status === activeFilter);
    }

    return result;
  }, [processedEmployees, searchQuery, activeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalBase =
      processedEmployees.reduce(
        (sum, emp) => sum + (emp.base_salary || 0),
        0
      );
    const totalEarned = processedEmployees.reduce(
      (sum, emp) => sum + emp.earned,
      0
    );
    const activeCount = processedEmployees.filter(
      (emp) => emp.status === "active"
    ).length;
    const inactiveCount = processedEmployees.filter(
      (emp) => emp.status === "inactive"
    ).length;
    const noSetupCount = processedEmployees.filter(
      (emp) => emp.status === "no_setup"
    ).length;

    return {
      totalBase,
      totalEarned,
      activeCount,
      inactiveCount,
      noSetupCount,
      totalCount: processedEmployees.length,
    };
  }, [processedEmployees]);

  // Handlers
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
    if (!selectedMonth) {
      setShowMonthPicker(true);
      return;
    }

    setDownloading(true);
    try {
      await downloadBulkSalarySheet(selectedMonth.month, selectedMonth.year);
      success("Success", "Salary sheet generated successfully!");
    } catch (err) {
      console.error("Error downloading salary sheet:", err);
      error("Error", err instanceof Error ? err.message : "Failed to generate salary sheet. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleEmployeePress = (employeeId: string) => {
    router.push(`/(hr)/employee/${employeeId}`);
  };

  const handleStatPress = (filter: FilterTab) => {
    setActiveFilter(filter);
    setSearchQuery("");
  };

  // Filter tabs configuration
  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.totalCount },
    { key: "active", label: "Active", count: stats.activeCount },
    { key: "inactive", label: "Inactive", count: stats.inactiveCount },
    { key: "no_setup", label: "No Setup", count: stats.noSetupCount },
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
        {/* Hero Header */}
        <SalaryHeroHeader selectedMonth={currentMonthDisplay} />

        {/* Summary Stats (floats over hero) */}
        <SalarySummaryStats
          totalBase={stats.totalBase}
          totalEarned={stats.totalEarned}
          activeCount={stats.activeCount}
          totalCount={stats.totalCount}
          isLoading={isLoading}
          onActivePress={() => handleStatPress("active")}
        />

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={18}
              color={Colors.textTertiary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsContainer}
          >
            {filterTabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  activeFilter === tab.key && styles.filterTabActive,
                ]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilter === tab.key && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.filterTabBadge,
                    activeFilter === tab.key && styles.filterTabBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterTabBadgeText,
                      activeFilter === tab.key &&
                        styles.filterTabBadgeTextActive,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Employee Cards */}
          {isLoading ? (
            <View style={styles.skeletonContainer}>
              <SkeletonCard height={140} />
              <SkeletonCard height={140} />
              <SkeletonCard height={140} />
            </View>
          ) : filteredEmployees.length > 0 ? (
            <View style={styles.cardsContainer}>
              {filteredEmployees.map((employee, index) => (
                <EmployeeSalaryCard
                  key={employee.id}
                  id={employee.id}
                  name={employee.full_name || "Unknown"}
                  avatarInitials={employee.initials}
                  designation={employee.designation}
                  department={employee.department}
                  baseSalary={employee.base_salary || 0}
                  earnedSalary={employee.earned}
                  totalHours={employee.hours}
                  status={employee.status}
                  index={index}
                  onPress={() => handleEmployeePress(employee.id)}
                />
              ))}
            </View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100)}>
              <EmptyState
                icon="account-cash-outline"
                iconLibrary="material-community"
                title={
                  searchQuery
                    ? "No employees found"
                    : activeFilter === "no_setup"
                    ? "All set!"
                    : "No employees"
                }
                subtitle={
                  searchQuery
                    ? "Try adjusting your search"
                    : activeFilter === "no_setup"
                    ? "All employees have salary setup"
                    : activeFilter === "active"
                    ? "No employees have earned this month"
                    : "No employees match this filter"
                }
              />
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <SalaryActionBar
        onDownload={handleDownloadSalarySheet}
        onMonthPicker={() => setShowMonthPicker(true)}
        isDownloading={downloading}
        downloadDisabled={availableMonths.length === 0}
      />

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
              <TouchableOpacity
                onPress={() => setShowMonthPicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={Colors.gray500}
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
                          color={isSelected ? Colors.primary : Colors.info}
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
                          color={Colors.primary}
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
                    color={Colors.textTertiary}
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
    paddingBottom: 140,
  },
  contentSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterTabsContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray50,
    gap: Spacing.xs,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textInverse,
  },
  filterTabBadge: {
    backgroundColor: Colors.gray200,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    alignItems: "center",
  },
  filterTabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterTabBadgeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterTabBadgeTextActive: {
    color: Colors.textInverse,
  },
  skeletonContainer: {
    gap: Spacing.md,
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  // Modal styles
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
    padding: Spacing.lg,
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
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
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
    padding: Spacing.lg,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthItemSelected: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
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
    color: Colors.text,
    marginBottom: 4,
  },
  monthNameSelected: {
    color: Colors.primary,
  },
  monthEmployeeCount: {
    fontSize: 13,
    color: Colors.gray500,
  },
  emptyMonthsContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyMonthsText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyMonthsSubtext: {
    fontSize: 13,
    color: Colors.gray500,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
