import EditEmployeeModal from "@/components/employee/EditEmployeeModal";
import SalaryHistoryCard from "@/components/employee/SalaryHistoryCard";
import MonthlySlipsList from "@/components/salary/MonthlySlipsList";
import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useDeleteEmployee } from "@/hooks/mutations/useUserMutations";
import { useCurrentWeekAttendance } from "@/hooks/queries/useAttendance";
import { useCurrentMonthEarnings } from "@/hooks/queries/useEarnings";
import { useSalaryRecords } from "@/hooks/queries/useSalary";
import { useUserById, userKeys } from "@/hooks/queries/useUser";
import { downloadAttendanceReport } from "@/lib/utils/attendanceSheet.utils";
import { formatDate } from "@/lib/utils/date.utils";
import { formatCurrency } from "@/lib/utils/salary.utils";
import { formatWorkingDays } from "@/lib/utils/workingDays.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const employeeId = id || "";
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { success, error, confirmDestructive } = useAlert();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState(new Date());
  const [downloadingReport, setDownloadingReport] = useState(false);

  const { data: employee, isLoading: loadingEmployee } =
    useUserById(employeeId);
  const deleteEmployee = useDeleteEmployee({
    onSuccess: () => {
      console.log("✅ [EmployeeDetail] Delete success callback triggered");
      success("Success", "Employee deleted successfully", () => {
        console.log("✅ [EmployeeDetail] Navigating back...");
        router.back();
      });
    },
    onError: (err) => {
      console.error("❌ [EmployeeDetail] Delete error callback triggered");
      console.error("❌ [EmployeeDetail] Error:", err);
      error("Error", `Failed to delete employee: ${err.message}`);
    },
  });

  // Get current month attendance
  const { data: weeklyAttendance } = useCurrentWeekAttendance(employeeId);
  const { data: currentMonthEarnings } = useCurrentMonthEarnings(employeeId);
  const { data: salaries, isLoading: loadingSalaries } =
    useSalaryRecords(employeeId);

  // Callback to refresh data after employee edit
  const handleEditSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: userKeys.byId(employeeId) });
  }, [queryClient, employeeId]);

  const handleDeleteEmployee = () => {
    console.log("🗑️ [EmployeeDetail] Delete button clicked");
    console.log("🗑️ [EmployeeDetail] Employee:", employee);
    console.log("🗑️ [EmployeeDetail] Employee ID:", employeeId);

    confirmDestructive(
      "Delete Employee",
      `Are you sure you want to delete ${employee?.full_name}? This will permanently delete all their data including attendance, salary records, and leave requests. This action cannot be undone.`,
      () => {
        console.log(
          "🗑️ [EmployeeDetail] Delete confirmed, calling mutation..."
        );
        deleteEmployee.mutate(employeeId);
      },
      () => console.log("🗑️ [EmployeeDetail] Delete cancelled"),
      "Delete"
    );
  };

  const isCurrentReportMonth =
    selectedReportMonth.getMonth() === new Date().getMonth() &&
    selectedReportMonth.getFullYear() === new Date().getFullYear();

  const previousReportMonth = () => {
    setSelectedReportMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1)
    );
  };

  const nextReportMonth = () => {
    const now = new Date();
    if (
      selectedReportMonth.getMonth() < now.getMonth() ||
      selectedReportMonth.getFullYear() < now.getFullYear()
    ) {
      setSelectedReportMonth(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1)
      );
    }
  };

  // Calculate the last day to download for current month (today's date)
  const getReportEndDay = () => {
    if (isCurrentReportMonth) {
      return new Date().getDate();
    }
    // For past months, use the last day of that month
    return new Date(
      selectedReportMonth.getFullYear(),
      selectedReportMonth.getMonth() + 1,
      0
    ).getDate();
  };

  const handleDownloadAttendanceReport = async () => {
    try {
      setDownloadingReport(true);
      await downloadAttendanceReport(
        employeeId,
        selectedReportMonth.getMonth() + 1,
        selectedReportMonth.getFullYear()
      );
      success("Success", "Attendance report downloaded successfully");
    } catch (err) {
      console.error("Download error:", err);
      error("Error", "Failed to generate attendance report");
    } finally {
      setDownloadingReport(false);
    }
  };

  // Show loading state if still loading OR if employee data is not available yet
  if (loadingEmployee || !employee) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const personalInformationRows = [
    {
      key: "email",
      icon: (
        <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
      ),
      label: "Email",
      value: employee.email,
      fallback: "Not provided",
    },
    {
      key: "phone",
      icon: (
        <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
      ),
      label: "Phone",
      value: employee.phone,
      fallback: "Not provided",
    },
    {
      key: "department",
      icon: (
        <MaterialCommunityIcons
          name="office-building-outline"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Department",
      value: employee.department,
      fallback: "Not assigned",
    },
    {
      key: "designation",
      icon: (
        <MaterialCommunityIcons
          name="account-tie-outline"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Designation",
      value: employee.designation,
      fallback: "Not assigned",
    },
    {
      key: "joining",
      icon: (
        <Ionicons
          name="calendar-outline"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Date of Joining",
      value: employee.date_of_joining
        ? formatDate(new Date(employee.date_of_joining))
        : null,
      fallback: "Not set",
    },
    {
      key: "aadhaar",
      icon: (
        <MaterialCommunityIcons
          name="card-account-details"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Aadhaar Number",
      value: employee.aadhaar_number,
      fallback: "Not provided",
    },
    {
      key: "dob",
      icon: <Ionicons name="calendar" size={18} color={Colors.textSecondary} />,
      label: "Date of Birth",
      value: employee.date_of_birth
        ? formatDate(new Date(employee.date_of_birth))
        : null,
      fallback: "Not provided",
    },
  ];

  const salaryConfigurationRows = [
    {
      key: "baseSalary",
      icon: (
        <MaterialCommunityIcons
          name="cash"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Base Salary",
      value: employee.base_salary
        ? formatCurrency(Number(employee.base_salary))
        : null,
      fallback: "Not set",
    },
    {
      key: "hourlyRate",
      icon: (
        <MaterialCommunityIcons
          name="cash-clock"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Hourly Rate",
      value: employee.hourly_rate
        ? `${formatCurrency(Number(employee.hourly_rate))}/h`
        : null,
      fallback: "Not set",
    },
    {
      key: "workingDays",
      icon: (
        <MaterialCommunityIcons
          name="calendar-check"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Working Days",
      value:
        employee.working_days && employee.working_days.length > 0
          ? formatWorkingDays(employee.working_days as any)
          : null,
      fallback: "Not set",
    },
    {
      key: "dailyHours",
      icon: (
        <MaterialCommunityIcons
          name="clock-outline"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Daily Hours",
      value: employee.daily_working_hours
        ? `${employee.daily_working_hours}h`
        : null,
      fallback: "Not set",
    },
  ];

  const bankRows = [
    employee.bank_name
      ? {
          key: "bankName",
          icon: (
            <MaterialCommunityIcons
              name="bank"
              size={18}
              color={Colors.textSecondary}
            />
          ),
          label: "Bank Name",
          value: employee.bank_name,
        }
      : null,
    employee.account_holder_name
      ? {
          key: "holder",
          icon: (
            <MaterialCommunityIcons
              name="account-outline"
              size={18}
              color={Colors.textSecondary}
            />
          ),
          label: "Account Holder",
          value: employee.account_holder_name,
        }
      : null,
    employee.account_number
      ? {
          key: "accountNumber",
          icon: (
            <MaterialCommunityIcons
              name="numeric"
              size={18}
              color={Colors.textSecondary}
            />
          ),
          label: "Account Number",
          value: employee.account_number,
        }
      : null,
    employee.ifsc_code
      ? {
          key: "ifsc",
          icon: (
            <MaterialCommunityIcons
              name="bank-transfer"
              size={18}
              color={Colors.textSecondary}
            />
          ),
          label: "IFSC Code",
          value: employee.ifsc_code,
        }
      : null,
    employee.branch_name
      ? {
          key: "branch",
          icon: (
            <MaterialCommunityIcons
              name="source-branch"
              size={18}
              color={Colors.textSecondary}
            />
          ),
          label: "Branch",
          value: employee.branch_name,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    icon: React.ReactElement;
    label: string;
    value?: string | null;
    fallback?: string;
  }[];

  const paidCount = salaries?.filter((s) => s.status === "paid").length ?? 0;
  const pendingCount =
    salaries?.filter((s) => s.status === "pending").length ?? 0;

  const baseSalaryValue = Number(employee.base_salary || 0);
  const earnedSalaryValue = Number(currentMonthEarnings?.earned_salary || 0);
  const hoursWorkedValue = Number(
    currentMonthEarnings?.total_hours_worked || 0
  );
  const expectedHoursValue = Number(currentMonthEarnings?.expected_hours || 0);
  const hourlyRateValue = Number(employee.hourly_rate || 0);
  const daysWorkedThisWeek = weeklyAttendance?.length ?? 0;

  const salaryProgress =
    baseSalaryValue > 0 ? (earnedSalaryValue / baseSalaryValue) * 100 : 0;
  const salaryProgressDisplay =
    baseSalaryValue > 0 ? `${Math.min(salaryProgress, 100).toFixed(0)}%` : "—";

  const primaryMetaLine =
    [employee.designation, employee.department].filter(Boolean).join(" • ") ||
    undefined;

  const contactItems = [
    employee.email
      ? {
          key: "email",
          icon: "mail-outline" as const,
          label: employee.email,
        }
      : null,
    employee.phone
      ? {
          key: "phone",
          icon: "call-outline" as const,
          label: employee.phone,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    icon: "mail-outline" | "call-outline";
    label: string;
  }[];

  const quickMetaItems = [
    employee.employee_id
      ? {
          key: "employeeId",
          label: "Employee ID",
          value: employee.employee_id,
        }
      : null,
    employee.date_of_joining
      ? {
          key: "joiningDate",
          label: "Joined",
          value: formatDate(new Date(employee.date_of_joining)),
        }
      : null,
    employee.working_days && employee.working_days.length > 0
      ? {
          key: "workingDays",
          label: "Working Days",
          value: formatWorkingDays(employee.working_days as any),
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    value: string;
  }[];

  const highlightItems = [
    {
      key: "earned",
      value: formatCurrency(earnedSalaryValue),
      label: "Earned this month",
      accent: Colors.success,
      icon: () => (
        <Ionicons name="cash-outline" size={20} color={Colors.textInverse} />
      ),
    },
    {
      key: "progress",
      value: salaryProgressDisplay,
      label: baseSalaryValue > 0 ? "of base salary" : "No salary target",
      accent: Colors.primary,
      icon: () => (
        <MaterialCommunityIcons
          name="chart-arc"
          size={20}
          color={Colors.textInverse}
        />
      ),
    },
    {
      key: "hours",
      value: hoursWorkedValue > 0 ? `${hoursWorkedValue.toFixed(1)}h` : "0h",
      label:
        expectedHoursValue > 0
          ? `of ${expectedHoursValue.toFixed(1)}h expected`
          : "Tracked hours",
      accent: Colors.warning,
      icon: () => (
        <Ionicons name="time-outline" size={20} color={Colors.textInverse} />
      ),
    },
    {
      key: "attendance",
      value:
        daysWorkedThisWeek > 0 ? `${daysWorkedThisWeek} days` : "No records",
      label: "Attendance this week",
      accent: Colors.info,
      icon: () => (
        <MaterialCommunityIcons
          name="calendar-week-outline"
          size={20}
          color={Colors.textInverse}
        />
      ),
    },
  ];

  const paymentSummaryRows = [
    {
      key: "total",
      icon: (
        <MaterialCommunityIcons
          name="file-document-outline"
          size={18}
          color={Colors.textSecondary}
        />
      ),
      label: "Total Records",
      value: salaries ? String(salaries.length) : "0",
    },
    {
      key: "paid",
      icon: (
        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
      ),
      label: "Paid",
      value: String(paidCount),
    },
    {
      key: "pending",
      icon: <Ionicons name="time-outline" size={18} color={Colors.warning} />,
      label: "Pending",
      value: String(pendingCount),
    },
  ];

  const hasSalaryConfiguration = salaryConfigurationRows.some(
    (row) => row.value
  );
  const hasBankDetails = bankRows.length > 0;
  const hasPaymentRecords = Boolean(salaries && salaries.length > 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroSection, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.heroProfileSection}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.6}
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={Colors.textInverse}
                />
              </TouchableOpacity>

              <Text style={styles.heroTitle}>Employee</Text>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setEditModalVisible(true)}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={Colors.textInverse}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDeleteEmployee}
                  disabled={deleteEmployee.isPending}
                  activeOpacity={0.6}
                >
                  {deleteEmployee.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.textInverse}
                    />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={Colors.textInverse}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroProfileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {employee.full_name?.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.heroProfileContent}>
                <Text style={styles.heroName}>{employee.full_name}</Text>

                <View style={styles.heroMetaRow}>
                  {employee.employee_id ? (
                    <View style={styles.heroIdPill}>
                      <MaterialCommunityIcons
                        name="card-account-details-outline"
                        size={14}
                        color={Colors.textInverse}
                      />
                      <Text style={styles.heroIdText}>
                        ID {employee.employee_id}
                      </Text>
                    </View>
                  ) : null}
                  {primaryMetaLine ? (
                    <Text style={styles.heroSubtitle}>{primaryMetaLine}</Text>
                  ) : null}
                </View>

                <View style={styles.heroBadgesRow}>
                  {baseSalaryValue > 0 ? (
                    <View style={styles.heroBadge}>
                      <MaterialCommunityIcons
                        name="cash"
                        size={14}
                        color={Colors.textInverse}
                      />
                      <Text style={styles.heroBadgeText}>
                        Base {formatCurrency(baseSalaryValue)}
                      </Text>
                    </View>
                  ) : null}
                  {hourlyRateValue > 0 ? (
                    <View style={styles.heroBadge}>
                      <MaterialCommunityIcons
                        name="cash-clock"
                        size={14}
                        color={Colors.textInverse}
                      />
                      <Text style={styles.heroBadgeText}>
                        Rate {formatCurrency(hourlyRateValue)}/h
                      </Text>
                    </View>
                  ) : null}
                  {baseSalaryValue <= 0 && hourlyRateValue <= 0 ? (
                    <View style={styles.heroBadge}>
                      <Feather
                        name="alert-circle"
                        size={14}
                        color={Colors.textInverse}
                      />
                      <Text style={styles.heroBadgeText}>
                        Salary info pending
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {contactItems.length > 0 ? (
              <View style={styles.heroContactRow}>
                {contactItems.map((item) => (
                  <View key={item.key} style={styles.heroContactItem}>
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={Colors.textInverse}
                    />
                    <Text style={styles.heroContactText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.heroMetricsRow}>
              {highlightItems.map((item) => (
                <View key={item.key} style={styles.heroMetricCard}>
                  <View style={styles.heroMetricIcon}>{item.icon()}</View>
                  <View style={styles.heroMetricContent}>
                    <Text style={styles.heroMetricValue}>{item.value}</Text>
                    <Text style={styles.heroMetricLabel}>{item.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.section, styles.personalInfoSection]}>
          <Text style={styles.sectionLabel}>Personal Information</Text>
          <View style={styles.sectionBody}>
            {personalInformationRows.map((row, index) => {
              const value = row.value ?? row.fallback ?? "Not provided";
              return (
                <View key={row.key}>
                  <View style={styles.listRow}>
                    <View style={styles.listRowLeft}>
                      {row.icon}
                      <Text style={styles.listLabel}>{row.label}</Text>
                    </View>
                    <Text style={styles.listValue} numberOfLines={1}>
                      {value}
                    </Text>
                  </View>
                  {index < personalInformationRows.length - 1 ? (
                    <View style={styles.listDivider} />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Salary Configuration</Text>
          {hasSalaryConfiguration ? (
            <View style={styles.sectionBody}>
              {salaryConfigurationRows.map((row, index) => {
                const value = row.value ?? row.fallback ?? "Not set";
                return (
                  <View key={row.key}>
                    <View style={styles.listRow}>
                      <View style={styles.listRowLeft}>
                        {row.icon}
                        <Text style={styles.listLabel}>{row.label}</Text>
                      </View>
                      <Text style={styles.listValue} numberOfLines={1}>
                        {value}
                      </Text>
                    </View>
                    {index < salaryConfigurationRows.length - 1 ? (
                      <View style={styles.listDivider} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.sectionPlaceholder}>
              <MaterialCommunityIcons
                name="cash-off"
                size={36}
                color={Colors.textTertiary}
              />
              <Text style={styles.placeholderText}>
                No salary configuration
              </Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bank Account</Text>
          {hasBankDetails ? (
            <View style={styles.sectionBody}>
              {bankRows.map((row, index) => (
                <View key={row.key}>
                  <View style={styles.listRow}>
                    <View style={styles.listRowLeft}>
                      {row.icon}
                      <Text style={styles.listLabel}>{row.label}</Text>
                    </View>
                    <Text style={styles.listValue} numberOfLines={1}>
                      {row.value}
                    </Text>
                  </View>
                  {index < bankRows.length - 1 ? (
                    <View style={styles.listDivider} />
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.sectionPlaceholder}>
              <MaterialCommunityIcons
                name="bank-off"
                size={36}
                color={Colors.textTertiary}
              />
              <Text style={styles.placeholderText}>
                No bank account details
              </Text>
            </View>
          )}
        </View>

        {/* Salary History section temporarily disabled
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Salary History</Text>
          <View style={styles.sectionBodyInset}>
            <SalaryHistoryCard userId={employeeId} />
          </View>
        </View>
        */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Summary</Text>
          {loadingSalaries ? (
            <View style={styles.sectionPlaceholder}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.placeholderText}>
                Loading payment records…
              </Text>
            </View>
          ) : hasPaymentRecords ? (
            <View style={styles.sectionBody}>
              {paymentSummaryRows.map((row, index) => (
                <View key={row.key}>
                  <View style={styles.listRow}>
                    <View style={styles.listRowLeft}>
                      {row.icon}
                      <Text style={styles.listLabel}>{row.label}</Text>
                    </View>
                    <Text style={styles.listValue}>{row.value}</Text>
                  </View>
                  {index < paymentSummaryRows.length - 1 ? (
                    <View style={styles.listDivider} />
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.sectionPlaceholder}>
              <Feather name="inbox" size={36} color={Colors.textTertiary} />
              <Text style={styles.placeholderText}>No payment records</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Salary Slips</Text>
          <View style={styles.sectionBodyInset}>
            <MonthlySlipsList userId={employeeId} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Attendance Reports</Text>
          <View style={styles.sectionBodyInset}>
            <View style={styles.reportMonthSelector}>
              <TouchableOpacity
                onPress={previousReportMonth}
                style={styles.reportMonthButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>

              <View style={styles.reportMonthTextContainer}>
                <MaterialCommunityIcons
                  name="calendar-month"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.reportMonthText}>
                  {selectedReportMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>

              <TouchableOpacity
                onPress={nextReportMonth}
                style={[
                  styles.reportMonthButton,
                  isCurrentReportMonth && styles.reportMonthButtonDisabled,
                ]}
                disabled={isCurrentReportMonth}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    isCurrentReportMonth ? Colors.textTertiary : Colors.primary
                  }
                />
              </TouchableOpacity>
            </View>

            <View style={styles.reportInfo}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.reportInfoText}>
                {isCurrentReportMonth
                  ? `Download attendance report with salary details up to today (${getReportEndDay()} ${selectedReportMonth.toLocaleDateString(
                      "en-US",
                      { month: "long" }
                    )})`
                  : `Download complete attendance report with salary details for ${selectedReportMonth.toLocaleDateString(
                      "en-US",
                      { month: "long" }
                    )}`}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.reportDownloadButton,
                downloadingReport && styles.reportDownloadButtonDisabled,
              ]}
              onPress={handleDownloadAttendanceReport}
              disabled={downloadingReport}
              activeOpacity={0.7}
            >
              {downloadingReport ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={Colors.textInverse}
                  />
                  <Text style={styles.reportDownloadButtonText}>
                    {isCurrentReportMonth
                      ? "Download Report (Current Month)"
                      : "Download PDF Report"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {employee ? (
        <EditEmployeeModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          employee={employee}
          onSuccess={handleEditSuccess}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    marginHorizontal: -Spacing["2xl"],
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing["2xl"],
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },
  heroProfileSection: {
    gap: Spacing["md"],
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -12,
  },
  heroProfileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.lg,
  },
  heroTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textInverse,
    textAlign: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  heroProfileContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textInverse,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  heroIdPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroIdText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textInverse,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.textInverse,
    fontWeight: "500",
    opacity: 0.85,
  },
  heroBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textInverse,
  },
  heroContactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  heroContactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroContactText: {
    fontSize: 13,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  heroMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  heroMetricCard: {
    flex: 1,
    minWidth: 160,
    flexBasis: "48%",
    borderRadius: BorderRadius["2xl"],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    minHeight: 90,
  },
  heroMetricIcon: {
    width: 48,
    height: 52,
    borderRadius: BorderRadius["2xl"],
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroMetricContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  heroMetricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textInverse,
    opacity: 0.75,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: 120,
  },
  section: {
    paddingBottom: Spacing["2xl"],
    gap: Spacing.sm,
  },
  personalInfoSection: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    backgroundColor: Colors.background,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    backgroundColor: Colors.background,
  },
  listRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  listLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  listValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "right",
    flexShrink: 1,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  sectionBodyInset: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    backgroundColor: Colors.background,
  },
  sectionPlaceholder: {
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  placeholderText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  reportMonthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  reportMonthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  reportMonthButtonDisabled: {
    opacity: 0.35,
  },
  reportMonthTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reportMonthText: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
  },
  reportInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reportInfoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reportDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  reportDownloadButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
  },
  reportDownloadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textInverse,
  },
  reportNote: {
    fontSize: 13,
    color: Colors.warning,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
