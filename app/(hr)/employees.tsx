import { useDeleteEmployee } from "@/hooks/mutations/useUserMutations";
import { useCurrentWeekAttendanceForAll } from "@/hooks/queries/useAttendance";
import { useAllCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAuth } from "@/hooks/auth/useAuth";
import { User } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/salary.utils";
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
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { Text } from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";

type FilterType = 'all' | 'active' | 'inactive';

// Employee Card Component
const EmployeeCard = ({
  employee,
  daysWorkedThisWeek,
  hoursWorked,
  earnedSalary,
  onPress,
  onDelete,
  isDeleting,
  onNoPhone,
}: {
  employee: User;
  daysWorkedThisWeek: number;
  hoursWorked: number;
  earnedSalary: number;
  onPress: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onNoPhone: () => void;
}) => {
  const baseSalary = Number(employee.base_salary || 0);
  const progressPercent = baseSalary > 0 ? Math.min((earnedSalary / baseSalary) * 100, 100) : 0;
  const hasWorkedThisWeek = daysWorkedThisWeek > 0;

  const handleCall = () => {
    if (employee.phone) {
      Linking.openURL(`tel:${employee.phone}`);
    } else {
      onNoPhone();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Main Row */}
      <View style={styles.cardTop}>
        {/* Avatar with status */}
        <View style={styles.avatarContainer}>
          <View style={[
            styles.avatar,
            { backgroundColor: employee.is_active ? Colors.primary : Colors.gray400 }
          ]}>
            <Text style={styles.avatarText}>
              {employee.full_name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <View style={[
            styles.statusDot,
            hasWorkedThisWeek ? styles.statusPresent : styles.statusAbsent
          ]} />
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
          </View>
          <Text style={styles.employeeRole} numberOfLines={1}>
            {employee.designation || 'No designation'}{employee.department ? ` • ${employee.department}` : ''}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.cardActions}>
          {employee.phone && (
            <TouchableOpacity style={styles.iconButton} onPress={handleCall}>
              <Ionicons name="call-outline" size={18} color={Colors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="calendar-check" size={14} color={Colors.textSecondary} />
          <Text style={styles.statValue}>{daysWorkedThisWeek}</Text>
          <Text style={styles.statLabel}>days</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.statValue}>{hoursWorked.toFixed(0)}</Text>
          <Text style={styles.statLabel}>hrs</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <MaterialCommunityIcons name="currency-inr" size={14} color={Colors.textSecondary} />
          <Text style={styles.statValue}>{(earnedSalary / 1000).toFixed(1)}K</Text>
          <Text style={styles.statLabel}>earned</Text>
        </View>

        {baseSalary > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{progressPercent.toFixed(0)}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
};

export default function EmployeesScreen() {
  const { user } = useAuth();
  const { success, error, confirmDestructive, info } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { data: users, isLoading, refetch: refetchUsers } = useAllUsers({
    role: "employee",
    organizationId: user?.organization_id || '',
  });

  const { data: earnings, refetch: refetchEarnings } = useAllCurrentMonthEarnings(
    user?.organization_id || ''
  );

  const { data: weeklyAttendance, refetch: refetchWeeklyAttendance } = useCurrentWeekAttendanceForAll(
    user?.organization_id || ''
  );

  const deleteEmployee = useDeleteEmployee({
    onSuccess: () => {
      setDeletingUserId(null);
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
    return earnings.reduce((acc, e) => {
      acc[e.user_id] = e;
      return acc;
    }, {} as Record<string, typeof earnings[0]>);
  }, [earnings]);

  const attendanceMap = weeklyAttendance || {};

  // Calculate stats and filter
  const { filteredUsers, stats } = useMemo(() => {
    if (!users) return { filteredUsers: [], stats: { total: 0, active: 0, present: 0, totalPaid: 0 } };

    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    let present = 0;
    let totalPaid = 0;

    users.forEach(emp => {
      if ((attendanceMap[emp.id] || 0) > 0) present++;
    });

    if (earnings) {
      totalPaid = earnings.reduce((sum, e) => sum + Number(e.earned_salary || 0), 0);
    }

    // Filter
    let filtered = users.filter(emp => {
      if (activeFilter === 'active' && !emp.is_active) return false;
      if (activeFilter === 'inactive' && emp.is_active) return false;

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

    // Sort by name
    filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

    return {
      filteredUsers: filtered,
      stats: { total, active, present, totalPaid }
    };
  }, [users, earnings, attendanceMap, searchQuery, activeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUsers(), refetchEarnings(), refetchWeeklyAttendance()]);
    setRefreshing(false);
  };

  const handleDelete = (emp: User) => {
    confirmDestructive(
      "Remove Employee",
      `Remove ${emp.full_name} from your team? This cannot be undone.`,
      () => {
        setDeletingUserId(emp.id);
        deleteEmployee.mutate(emp.id);
      },
      undefined,
      "Remove"
    );
  };

  const renderItem = useCallback(({ item }: { item: User }) => {
    const empEarnings = earningsMap[item.id];
    return (
      <EmployeeCard
        employee={item}
        daysWorkedThisWeek={attendanceMap[item.id] || 0}
        hoursWorked={Number(empEarnings?.total_hours_worked || 0)}
        earnedSalary={Number(empEarnings?.earned_salary || 0)}
        onPress={() => router.push(`/(hr)/employee/${item.id}`)}
        onDelete={() => handleDelete(item)}
        isDeleting={deletingUserId === item.id}
        onNoPhone={() => info("No Phone", "No phone number on file")}
      />
    );
  }, [earningsMap, attendanceMap, deletingUserId, info]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Team</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/(hr)/employee/add")}
            >
              <Ionicons name="person-add" size={20} color={Colors.textInverse} />
            </TouchableOpacity>
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: Colors.primary + '12' }]}>
              <Text style={styles.summaryValue}>{stats.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: Colors.success + '12' }]}>
              <Text style={styles.summaryValue}>{stats.present}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: Colors.secondary + '12' }]}>
              <Text style={styles.summaryValue}>{(stats.totalPaid / 1000).toFixed(0)}K</Text>
              <Text style={styles.summaryLabel}>Paid</Text>
            </View>
          </View>

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
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={Colors.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            {(['all', 'active', 'inactive'] as FilterType[]).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.filterTabTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
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
                  >
                    <Ionicons name="add" size={18} color={Colors.textInverse} />
                    <Text style={styles.emptyButtonText}>Add Employee</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
  },
  filterTabActive: {
    backgroundColor: Colors.text,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textInverse,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: 14,
    gap: 12,
  },
  cardPressed: {
    backgroundColor: Colors.gray50,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.gray200,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  employeeRole: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
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
    marginHorizontal: 10,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 2,
  },

  // Loading & Empty
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textInverse,
  },
});
