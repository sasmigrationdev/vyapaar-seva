/**
 * Team Screen - Redesigned
 *
 * Modern team management with:
 * - Gradient hero header
 * - Unified stats card
 * - Enhanced filtering/sorting
 * - Clean employee cards with long-press actions
 * - Smooth animations
 */
import { useDeleteEmployee } from "@/hooks/mutations/useUserMutations";
import { useCurrentWeekAttendanceForAll } from "@/hooks/queries/useAttendance";
import { useAllCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/auth/useAuth";
import { User } from "@/lib/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Pressable,
  Linking,
  Modal,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { Text } from "@/components/ui/Text";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import TeamHeroHeader from "@/components/team/TeamHeroHeader";
import TeamSummaryStats from "@/components/team/TeamSummaryStats";
import { Colors, Spacing, BorderRadius, Shadows, FontFamily } from "@/constants/theme";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

type FilterType = "all" | "active" | "inactive" | "new" | "needs-setup" | "incomplete";
type SortType = "name-asc" | "name-desc" | "hours-desc" | "earnings-desc";

const SORT_OPTIONS: { value: SortType; label: string; icon: string }[] = [
  { value: "name-asc", label: "Name A-Z", icon: "sort-alphabetical-ascending" },
  { value: "name-desc", label: "Name Z-A", icon: "sort-alphabetical-descending" },
  { value: "hours-desc", label: "Most Hours", icon: "clock-outline" },
  { value: "earnings-desc", label: "Highest Earned", icon: "cash" },
];

// Redesigned Employee Card
const EmployeeCard = ({
  employee,
  daysWorkedThisWeek,
  hoursWorked,
  earnedSalary,
  onPress,
  onLongPress,
  index,
}: {
  employee: User;
  daysWorkedThisWeek: number;
  hoursWorked: number;
  earnedSalary: number;
  onPress: () => void;
  onLongPress: () => void;
  index: number;
}) => {
  const baseSalary = Number(employee.base_salary || 0);
  const hourlyRate = Number(employee.hourly_rate || 0);
  const progressPercent = baseSalary > 0 ? Math.min((earnedSalary / baseSalary) * 100, 100) : 0;
  const hasWorkedThisWeek = daysWorkedThisWeek > 0;

  // Attention indicators
  const needsSalary = employee.is_active && baseSalary === 0 && hourlyRate === 0;
  const isIncomplete = employee.is_active && (!employee.phone || !employee.bank_name);

  return (
    <Animated.View entering={FadeInDown.delay(50 * Math.min(index, 10)).springify()}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        accessibilityLabel={`${employee.full_name || "Unknown employee"}, ${employee.designation || "No designation"}${employee.department ? `, ${employee.department}` : ""}, ${daysWorkedThisWeek} days worked this week, ${hoursWorked.toFixed(0)} hours, ${(earnedSalary / 1000).toFixed(1)}K earned${!employee.is_active ? ", Inactive" : ""}`}
        accessibilityRole="button"
        accessibilityHint="Tap to view details, long press for actions"
      >
        {/* Main Row */}
        <View style={styles.cardTop}>
          {/* Avatar with status */}
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: employee.is_active ? Colors.primary : Colors.gray400 },
              ]}
            >
              <Text style={styles.avatarText}>
                {employee.full_name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                hasWorkedThisWeek ? styles.statusPresent : styles.statusAbsent,
              ]}
            />
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {employee.full_name || "Unknown"}
              </Text>
              {!employee.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
              {needsSalary && (
                <View style={styles.warningBadge}>
                  <Text style={styles.warningBadgeText}>No Salary</Text>
                </View>
              )}
              {isIncomplete && !needsSalary && (
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>Incomplete</Text>
                </View>
              )}
            </View>
            <Text style={styles.employeeRole} numberOfLines={1}>
              {employee.designation || "No designation"}
              {employee.department ? ` \u2022 ${employee.department}` : ""}
            </Text>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={20} color={Colors.gray300} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="calendar-check" size={14} color={Colors.primary} />
            <Text style={styles.statValue}>{daysWorkedThisWeek}</Text>
            <Text style={styles.statLabel}>days</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.info} />
            <Text style={styles.statValue}>{hoursWorked.toFixed(0)}</Text>
            <Text style={styles.statLabel}>hrs</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="currency-inr" size={14} color={Colors.success} />
            <Text style={styles.statValue}>{(earnedSalary / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>earned</Text>
          </View>
        </View>

        {/* Full-width Progress Bar */}
        {baseSalary > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{progressPercent.toFixed(0)}%</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Long Press Action Sheet
const ActionSheet = ({
  visible,
  employee,
  onClose,
  onCall,
  onDelete,
  isDeleting,
}: {
  visible: boolean;
  employee: User | null;
  onClose: () => void;
  onCall: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) => {
  if (!employee) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{employee.full_name}</Text>
            <Text style={styles.sheetSubtitle}>
              {employee.designation || "Employee"}
            </Text>
          </View>

          <View style={styles.sheetActions}>
            {employee.phone && (
              <TouchableOpacity
                style={styles.sheetAction}
                onPress={() => {
                  onCall();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetActionIcon, { backgroundColor: Colors.success + "15" }]}>
                  <Ionicons name="call-outline" size={20} color={Colors.success} />
                </View>
                <Text style={styles.sheetActionText}>Call</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                router.push(`/(hr)/employee/${employee.id}`);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetActionIcon, { backgroundColor: Colors.info + "15" }]}>
                <Ionicons name="person-outline" size={20} color={Colors.info} />
              </View>
              <Text style={styles.sheetActionText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={onDelete}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetActionIcon, { backgroundColor: Colors.error + "15" }]}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                )}
              </View>
              <Text style={[styles.sheetActionText, { color: Colors.error }]}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sheetCancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// Sort Sheet
const SortSheet = ({
  visible,
  currentSort,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentSort: SortType;
  onClose: () => void;
  onSelect: (sort: SortType) => void;
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.sortSheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sort By</Text>
          </View>

          <View style={styles.sortOptions}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  currentSort === option.value && styles.sortOptionActive,
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={20}
                  color={currentSort === option.value ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    currentSort === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {currentSort === option.value && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default function EmployeesScreen() {
  const { user } = useAuth();
  const { success, error, info } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("name-asc");
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);
  const [actionSheetEmployee, setActionSheetEmployee] = useState<User | null>(null);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  // Memoize filter objects to prevent React Compiler cache size issues
  const organizationId = user?.organization_id || "";
  const employeeFilters = useMemo(
    () => ({ role: "employee" as const, organizationId }),
    [organizationId]
  );

  const { data: users, isLoading, refetch: refetchUsers } = useAllUsers(employeeFilters);

  const { data: earnings, refetch: refetchEarnings } =
    useAllCurrentMonthEarnings(organizationId);

  const { data: weeklyAttendance, refetch: refetchWeeklyAttendance } =
    useCurrentWeekAttendanceForAll(organizationId);

  const deleteEmployee = useDeleteEmployee({
    onSuccess: () => {
      setDeletingUserId(null);
      setEmployeeToDelete(null);
      setActionSheetEmployee(null);
      success("Success", "Employee removed");
    },
    onError: (err) => {
      setDeletingUserId(null);
      error("Error", err.message);
    },
  });

  // Create lookup maps
  const earningsMap = useMemo(() => {
    if (!earnings) return {};
    return earnings.reduce(
      (acc, e) => {
        acc[e.user_id] = e;
        return acc;
      },
      {} as Record<string, (typeof earnings)[0]>
    );
  }, [earnings]);

  const attendanceMap = weeklyAttendance || {};

  // Helper functions for employee status checks
  const isNewThisMonth = (emp: User) => {
    if (!emp.created_at) return false;
    const createdDate = new Date(emp.created_at);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
  };

  const needsSalarySetup = (emp: User) => {
    const baseSalary = Number(emp.base_salary || 0);
    const hourlyRate = Number(emp.hourly_rate || 0);
    return baseSalary === 0 && hourlyRate === 0;
  };

  const hasIncompleteProfile = (emp: User) => {
    // Missing phone OR missing bank details (for active employees)
    if (!emp.is_active) return false;
    return !emp.phone || !emp.bank_name || !emp.account_number;
  };

  // Calculate stats and filter
  const { filteredUsers, stats } = useMemo(() => {
    if (!users) return {
      filteredUsers: [],
      stats: {
        total: 0,
        newJoinsThisMonth: 0,
        needsSetup: 0,
        incompleteProfiles: 0
      }
    };

    const total = users.length;
    const newJoinsThisMonth = users.filter(isNewThisMonth).length;
    const needsSetup = users.filter((u) => u.is_active && needsSalarySetup(u)).length;
    const incompleteProfiles = users.filter(hasIncompleteProfile).length;

    // Filter
    let filtered = users.filter((emp) => {
      if (activeFilter === "active" && !emp.is_active) return false;
      if (activeFilter === "inactive" && emp.is_active) return false;
      if (activeFilter === "new" && !isNewThisMonth(emp)) return false;
      if (activeFilter === "needs-setup" && !(emp.is_active && needsSalarySetup(emp))) return false;
      if (activeFilter === "incomplete" && !hasIncompleteProfile(emp)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          emp.full_name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.phone?.includes(q) ||
          emp.department?.toLowerCase().includes(q) ||
          emp.designation?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.full_name || "").localeCompare(b.full_name || "");
        case "name-desc":
          return (b.full_name || "").localeCompare(a.full_name || "");
        case "hours-desc": {
          const hoursA = Number(earningsMap[a.id]?.total_hours_worked || 0);
          const hoursB = Number(earningsMap[b.id]?.total_hours_worked || 0);
          return hoursB - hoursA;
        }
        case "earnings-desc": {
          const earnedA = Number(earningsMap[a.id]?.earned_salary || 0);
          const earnedB = Number(earningsMap[b.id]?.earned_salary || 0);
          return earnedB - earnedA;
        }
        default:
          return 0;
      }
    });

    return {
      filteredUsers: filtered,
      stats: { total, newJoinsThisMonth, needsSetup, incompleteProfiles },
    };
  }, [users, searchQuery, activeFilter, sortBy, earningsMap]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUsers(), refetchEarnings(), refetchWeeklyAttendance()]);
    setRefreshing(false);
  };

  const handleDelete = (emp: User) => {
    setEmployeeToDelete(emp);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      setDeletingUserId(employeeToDelete.id);
      deleteEmployee.mutate(employeeToDelete.id);
    }
  };

  const handleCall = (emp: User) => {
    if (emp.phone) {
      Linking.openURL(`tel:${emp.phone}`);
    } else {
      info("No Phone", "No phone number on file");
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: User; index: number }) => {
      const empEarnings = earningsMap[item.id];
      return (
        <EmployeeCard
          employee={item}
          daysWorkedThisWeek={attendanceMap[item.id] || 0}
          hoursWorked={Number(empEarnings?.total_hours_worked || 0)}
          earnedSalary={Number(empEarnings?.earned_salary || 0)}
          onPress={() => router.push(`/(hr)/employee/${item.id}`)}
          onLongPress={() => setActionSheetEmployee(item)}
          index={index}
        />
      );
    },
    [earningsMap, attendanceMap]
  );

  // Base filters always shown
  const baseFilters: FilterType[] = ["all", "active", "inactive"];

  // Special filters (shown when active or when there are items)
  const specialFilters: { type: FilterType; label: string; show: boolean }[] = [
    { type: "new", label: "New", show: activeFilter === "new" || stats.newJoinsThisMonth > 0 },
    { type: "needs-setup", label: "No Salary", show: activeFilter === "needs-setup" || stats.needsSetup > 0 },
    { type: "incomplete", label: "Incomplete", show: activeFilter === "incomplete" || stats.incompleteProfiles > 0 },
  ];

  const getFilterLabel = (filter: FilterType) => {
    switch (filter) {
      case "needs-setup": return "No Salary";
      case "incomplete": return "Incomplete";
      default: return filter.charAt(0).toUpperCase() + filter.slice(1);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero Header */}
      <TeamHeroHeader onAddPress={() => router.push("/(hr)/employee/add")} />

      {/* Summary Stats */}
      <TeamSummaryStats
        newJoinsThisMonth={stats.newJoinsThisMonth}
        needsSetup={stats.needsSetup}
        incompleteProfiles={stats.incompleteProfiles}
        onNewJoinsPress={() => setActiveFilter("new")}
        onNeedsSetupPress={() => setActiveFilter("needs-setup")}
        onIncompletePress={() => setActiveFilter("incomplete")}
      />

      {/* Search & Filter Section */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.filterSection}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            accessibilityLabel="Search employees"
            accessibilityHint="Enter name, email, phone, department, or designation to filter"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter & Sort Row */}
        <View style={styles.filterSortRow}>
          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            {baseFilters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter)}
                accessibilityLabel={`${getFilterLabel(filter)} employees filter`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeFilter === filter }}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilter === filter && styles.filterTabTextActive,
                  ]}
                >
                  {getFilterLabel(filter)}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Special filter pills - only show when active */}
            {specialFilters
              .filter((f) => activeFilter === f.type)
              .map((filter) => (
                <TouchableOpacity
                  key={filter.type}
                  style={[styles.filterTab, styles.filterTabActive, styles.filterTabSpecial]}
                  onPress={() => setActiveFilter("all")}
                  accessibilityLabel={`${filter.label} filter active, tap to clear`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: true }}
                >
                  <Text style={[styles.filterTabText, styles.filterTabTextActive]}>
                    {filter.label}
                  </Text>
                  <Ionicons name="close" size={14} color={Colors.textInverse} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
          </View>

          {/* Sort Button */}
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortSheetVisible(true)}
            accessibilityLabel="Sort options"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="sort" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-search" size={48} color={Colors.gray300} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No results" : "No employees"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery ? "Try different search terms" : "Add your first team member"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push("/(hr)/employee/add")}
                  accessibilityLabel="Add Employee"
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={18} color={Colors.textInverse} />
                  <Text style={styles.emptyButtonText}>Add Employee</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Action Sheet */}
      <ActionSheet
        visible={!!actionSheetEmployee}
        employee={actionSheetEmployee}
        onClose={() => setActionSheetEmployee(null)}
        onCall={() => actionSheetEmployee && handleCall(actionSheetEmployee)}
        onDelete={() => actionSheetEmployee && handleDelete(actionSheetEmployee)}
        isDeleting={deletingUserId === actionSheetEmployee?.id}
      />

      {/* Sort Sheet */}
      <SortSheet
        visible={sortSheetVisible}
        currentSort={sortBy}
        onClose={() => setSortSheetVisible(false)}
        onSelect={setSortBy}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={!!employeeToDelete}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove Employee"
        itemName={employeeToDelete?.full_name || ""}
        itemType="Employee"
        consequences={[
          "Remove employee from your organization",
          "Delete all their attendance and salary records",
          "Revoke their access to the app",
        ]}
        isLoading={deleteEmployee.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },

  // Filter Section
  filterSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },

  // Filter & Sort Row
  filterSortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },

  // Filter Tabs
  filterTabs: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  filterTabActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  filterTabSpecial: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textInverse,
  },

  // Sort Button
  sortButton: {
    width: 40,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },

  // List
  listContent: {
    padding: Spacing.lg,
    gap: 12,
    paddingBottom: Spacing["3xl"],
  },

  // Card
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    padding: Spacing.md,
    gap: 12,
    ...Shadows.sm,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Avatar
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textInverse,
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: Colors.background,
  },
  statusPresent: {
    backgroundColor: Colors.success,
  },
  statusAbsent: {
    backgroundColor: Colors.gray300,
  },

  // Info
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.gray100,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  warningBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.warning + "20",
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.warning,
  },
  infoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.info + "20",
  },
  infoBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.info,
  },
  employeeRole: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.gray200,
  },

  // Progress Bar
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.gray100,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.success,
    minWidth: 32,
    textAlign: "right",
  },

  // Loading & Empty
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textInverse,
  },

  // Sheet Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingBottom: Spacing["3xl"],
  },
  sortSheetContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingBottom: Spacing["3xl"],
  },
  sheetHeader: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sheetActions: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
  },
  sheetActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  sheetCancelButton: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  // Sort Options
  sortOptions: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sortOptionActive: {
    backgroundColor: Colors.primary + "10",
  },
  sortOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  sortOptionTextActive: {
    fontWeight: "600",
    color: Colors.primary,
  },
});
