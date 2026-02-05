import { Text } from "@/components/ui/Text";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import {
  PayrollHeroHeader,
  PayrollSummaryStats,
  PayrollPeriodCard,
  PayrollActionBar,
} from "@/components/payroll";
import {
  BorderRadius,
  Colors,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { usePayrollPeriods } from "@/hooks/queries/usePayroll";
import { PayrollPeriod } from "@/lib/types/payroll";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type FilterType = "all" | "active" | "completed" | "draft";

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "draft", label: "Drafts" },
];

export default function PayrollDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

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

  const getMonthName = (month: number) => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return monthNames[month - 1] || "";
  };

  const getFullMonthName = (month: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[month - 1] || "";
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!payrollPeriods) {
      return {
        totalPeriods: 0,
        completedCount: 0,
        inProgressCount: 0,
        draftCount: 0,
        totalAmount: 0,
        paidAmount: 0,
      };
    }

    return {
      totalPeriods: payrollPeriods.length,
      completedCount: payrollPeriods.filter(p => p.status === "completed").length,
      inProgressCount: payrollPeriods.filter(
        p => p.status === "processing" || p.status === "in_review" || p.status === "approved"
      ).length,
      draftCount: payrollPeriods.filter(p => p.status === "draft").length,
      totalAmount: payrollPeriods.reduce((sum, p) => sum + (p.total_net_salary || 0), 0),
      paidAmount: payrollPeriods.reduce((sum, p) => sum + (p.total_amount_paid || 0), 0),
    };
  }, [payrollPeriods]);

  // Filter periods
  const filteredPeriods = useMemo(() => {
    if (!payrollPeriods) return [];

    let filtered = [...payrollPeriods];

    // Apply status filter
    if (activeFilter === "active") {
      filtered = filtered.filter(
        p => p.status === "processing" || p.status === "in_review" || p.status === "approved"
      );
    } else if (activeFilter === "completed") {
      filtered = filtered.filter(p => p.status === "completed");
    } else if (activeFilter === "draft") {
      filtered = filtered.filter(p => p.status === "draft");
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const monthName = getFullMonthName(p.month).toLowerCase();
        const yearStr = p.year.toString();
        return monthName.includes(query) || yearStr.includes(query);
      });
    }

    return filtered;
  }, [payrollPeriods, activeFilter, searchQuery]);

  const isLoading = loadingPeriods || isFetchingPeriods;

  const handleFilterByStatus = (filter: FilterType) => {
    setActiveFilter(filter);
  };

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
        <PayrollHeroHeader />

        {/* Summary Stats */}
        <PayrollSummaryStats
          totalPeriods={stats.totalPeriods}
          completedCount={stats.completedCount}
          totalAmount={stats.totalAmount}
          paidAmount={stats.paidAmount}
          inProgressCount={stats.inProgressCount}
          draftCount={stats.draftCount}
          isLoading={isLoading}
          onTotalPress={() => handleFilterByStatus("all")}
          onInProgressPress={() => handleFilterByStatus("active")}
        />

        {/* Search & Filter Section */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={styles.filterSection}
        >
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by month or year..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterTab,
                  activeFilter === option.key && styles.filterTabActive,
                ]}
                onPress={() => setActiveFilter(option.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilter === option.key && styles.filterTabTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} height={180} />
              ))}
            </View>
          ) : filteredPeriods.length > 0 ? (
            <View style={styles.periodsList}>
              {filteredPeriods.map((period: PayrollPeriod, index: number) => (
                <PayrollPeriodCard
                  key={period.id}
                  id={period.id}
                  month={period.month}
                  year={period.year}
                  status={period.status}
                  totalEmployees={period.total_employees}
                  employeesPaid={period.employees_paid}
                  totalGrossSalary={period.total_gross_salary}
                  totalNetSalary={period.total_net_salary}
                  createdAt={period.created_at}
                  index={index}
                  onPress={() => router.push(`/(hr)/payroll/${period.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="clipboard-text-clock-outline"
              iconLibrary="material-community"
              title={
                searchQuery || activeFilter !== "all"
                  ? "No Matching Periods"
                  : "No Payroll Periods Yet"
              }
              subtitle={
                searchQuery || activeFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Create your first payroll period to get started"
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <PayrollActionBar
        onCreatePress={() => router.push("/(hr)/payroll/create")}
        currentMonth={`${getMonthName(currentMonth)} ${currentYear}`}
      />
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
  },
  filterSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  filterTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textInverse,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  loadingContainer: {
    gap: Spacing.md,
  },
  periodsList: {
    gap: Spacing.md,
  },
});
