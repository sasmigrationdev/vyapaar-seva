/**
 * Employee Detail Screen - Redesigned
 *
 * Modern profile experience with:
 * - Hero profile with activity ring
 * - Bento stats grid
 * - Tabbed content navigation
 * - Floating action bar
 */
import EditEmployeeModal from "@/components/employee/EditEmployeeModal";
import EmployeeActionBar from "@/components/employee/EmployeeActionBar";
import EmployeeBentoStats from "@/components/employee/EmployeeBentoStats";
import EmployeeHeroProfile from "@/components/employee/EmployeeHeroProfile";
import EmployeeTabBar, { EmployeeTab } from "@/components/employee/EmployeeTabBar";
import BankTab from "@/components/employee/tabs/BankTab";
import OverviewTab from "@/components/employee/tabs/OverviewTab";
import ReportsTab from "@/components/employee/tabs/ReportsTab";
import SalaryTab from "@/components/employee/tabs/SalaryTab";
import MonthlySlipsList from "@/components/salary/MonthlySlipsList";
import { Text } from "@/components/ui/Text";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useDeleteEmployee } from "@/hooks/mutations/useUserMutations";
import { useCurrentWeekAttendance } from "@/hooks/queries/useAttendance";
import { useCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useSalaryRecords } from "@/hooks/queries/useSalary";
import { useUserById, userKeys } from "@/hooks/queries/useUser";
import { downloadAttendanceReport } from "@/lib/utils/attendanceSheet.utils";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAlert } from "@/hooks/useAlert";

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const employeeId = id || "";
  const queryClient = useQueryClient();
  const { success, error, confirmDestructive } = useAlert();

  // State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<EmployeeTab>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Queries
  const { data: employee, isLoading: loadingEmployee, refetch } =
    useUserById(employeeId);

  const deleteEmployee = useDeleteEmployee({
    onSuccess: () => {
      success("Success", "Employee deleted successfully", () => {
        router.back();
      });
    },
    onError: (err) => {
      error("Error", `Failed to delete employee: ${err.message}`);
    },
  });

  const { data: weeklyAttendance, refetch: refetchAttendance } =
    useCurrentWeekAttendance(employeeId);

  const { data: currentMonthEarnings, refetch: refetchEarnings } =
    useCurrentMonthEarnings(employeeId);

  const { data: salaries, refetch: refetchSalaries } =
    useSalaryRecords(employeeId);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchAttendance(), refetchEarnings(), refetchSalaries()]);
    setRefreshing(false);
  }, [refetch, refetchAttendance, refetchEarnings, refetchSalaries]);

  const handleEditSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: userKeys.byId(employeeId) });
  }, [queryClient, employeeId]);

  const handleDeleteEmployee = () => {
    confirmDestructive(
      "Delete Employee",
      `Are you sure you want to delete ${employee?.full_name}? This will permanently delete all their data including attendance, salary records, and leave requests.`,
      () => deleteEmployee.mutate(employeeId),
      undefined,
      "Delete"
    );
  };

  const handleCall = () => {
    if (employee?.phone) {
      Linking.openURL(`tel:${employee.phone}`);
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      const now = new Date();
      await downloadAttendanceReport(
        employeeId,
        now.getMonth() + 1,
        now.getFullYear()
      );
      success("Success", "Attendance report downloaded successfully");
    } catch (err) {
      console.error("Download error:", err);
      error("Error", "Failed to generate attendance report");
    } finally {
      setDownloadingReport(false);
    }
  };

  // Loading state
  if (loadingEmployee || !employee) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading employee...</Text>
      </View>
    );
  }

  // Computed values
  const baseSalaryValue = Number(employee.base_salary || 0);
  const earnedSalaryValue = Number(currentMonthEarnings?.earned_salary || 0);
  const hoursWorkedValue = Number(currentMonthEarnings?.total_hours_worked || 0);
  const daysWorkedThisWeek = weeklyAttendance?.length ?? 0;
  const paidCount = salaries?.filter((s) => s.status === "paid").length ?? 0;
  const pendingCount = salaries?.filter((s) => s.status === "pending").length ?? 0;
  const dailyHours = Number(employee.daily_working_hours || 8);
  const workingDaysPerWeek = (employee.working_days as string[])?.length || 5;
  // ~4.33 weeks per month for more accurate calculation
  const expectedMonthlyHours = Math.round(workingDaysPerWeek * 4.33) * dailyHours;

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            employee={employee}
            onEditPress={() => setEditModalVisible(true)}
          />
        );
      case "salary":
        return (
          <SalaryTab
            employee={employee}
            onEditPress={() => setEditModalVisible(true)}
          />
        );
      case "bank":
        return (
          <BankTab
            employee={employee}
            onEditPress={() => setEditModalVisible(true)}
          />
        );
      case "reports":
        return (
          <ReportsTab
            employeeId={employeeId}
            onSuccess={(msg) => success("Success", msg)}
            onError={(msg) => error("Error", msg)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Hero Profile */}
        <EmployeeHeroProfile
          employee={employee}
          onEditPress={() => setEditModalVisible(true)}
        />

        {/* Bento Stats Grid */}
        <EmployeeBentoStats
          earnedSalary={earnedSalaryValue}
          baseSalary={baseSalaryValue}
          hoursWorked={hoursWorkedValue}
          expectedHours={expectedMonthlyHours}
          daysWorkedThisWeek={daysWorkedThisWeek}
          pendingPayments={pendingCount}
          paidPayments={paidCount}
          onViewSalarySlips={() => setActiveTab("reports")}
          onViewAttendance={() => setActiveTab("reports")}
        />

        {/* Tab Navigation */}
        <EmployeeTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          {renderTabContent()}
        </Animated.View>

        {/* Salary Slips Section (always visible at bottom) */}
        {activeTab === "reports" && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.slipsSection}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <View style={styles.slipsCard}>
              <MonthlySlipsList userId={employeeId} />
            </View>
          </Animated.View>
        )}

        {/* Bottom padding for action bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Bar */}
      <EmployeeActionBar
        onCall={employee.phone ? handleCall : undefined}
        onEdit={() => setEditModalVisible(true)}
        onDownload={handleDownloadReport}
        onDelete={handleDeleteEmployee}
        hasPhone={Boolean(employee.phone)}
        isDownloading={downloadingReport}
        isDeleting={deleteEmployee.isPending}
      />

      {/* Edit Modal */}
      {employee && (
        <EditEmployeeModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          employee={employee}
          onSuccess={handleEditSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Salary Slips Section
  slipsSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  slipsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
});
