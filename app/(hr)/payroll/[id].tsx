import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useMarkSalaryAsPaid,
  useBulkMarkSalariesPaid,
  useUpdatePayrollSalaryRecord,
  useRevertPayment,
  useUpdatePayrollPeriodStatus,
} from "@/hooks/mutations/usePayrollMutations";
import {
  usePayrollPeriodById,
  useSalaryRecordsByPeriod,
  usePayrollPeriodStats,
} from "@/hooks/queries/usePayroll";
import {
  PaymentMode,
  PaymentStatus,
  PayrollPeriodStatus,
  PayrollSalaryRecord,
} from "@/lib/types";
import {
  generateBulkSalarySlips,
  generatePayrollSummaryPDF,
} from "@/lib/utils/payrollExport.utils";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";

// Helper functions for colors
const getStatusColor = (status: PayrollPeriodStatus) => {
  switch (status) {
    case "draft":
      return { bg: Colors.gray100, text: Colors.textSecondary };
    case "in_review":
      return { bg: "#FEF3C7", text: "#92400E" };
    case "approved":
      return { bg: "#DBEAFE", text: "#1E40AF" };
    case "processing":
      return { bg: "#E0E7FF", text: "#3730A3" };
    case "completed":
      return { bg: "#D1FAE5", text: "#065F46" };
    case "cancelled":
      return { bg: "#FEE2E2", text: "#991B1B" };
    default:
      return { bg: Colors.gray100, text: Colors.textSecondary };
  }
};

const getPaymentStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case "pending":
      return { bg: Colors.gray100, text: Colors.textSecondary, icon: "clock-outline" };
    case "processing":
      return { bg: "#FEF3C7", text: "#92400E", icon: "progress-clock" };
    case "paid":
      return { bg: "#D1FAE5", text: "#065F46", icon: "check-circle" };
    case "failed":
      return { bg: "#FEE2E2", text: "#991B1B", icon: "alert-circle" };
    case "on_hold":
      return { bg: "#FED7AA", text: "#9A3412", icon: "pause-circle" };
    default:
      return { bg: Colors.gray100, text: Colors.textSecondary, icon: "help-circle" };
  }
};

const formatMonth = (month: number, year: number) => {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export default function PayrollPeriodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, info, confirm } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "all">("all");
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<PayrollSalaryRecord | null>(null);

  // Form states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [revertReason, setRevertReason] = useState("");
  const [editData, setEditData] = useState({
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    bonus: 0,
    notes: "",
  });

  // Queries
  const { data: period, isLoading: loadingPeriod, refetch: refetchPeriod } = usePayrollPeriodById(id);
  const { data: salaries = [], isLoading: loadingSalaries, refetch: refetchSalaries } = useSalaryRecordsByPeriod(id);
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = usePayrollPeriodStats(id);

  // Mutations
  const markPaidMutation = useMarkSalaryAsPaid(user?.id || "");
  const bulkPaidMutation = useBulkMarkSalariesPaid(user?.id || "");
  const updateSalaryMutation = useUpdatePayrollSalaryRecord();
  const revertMutation = useRevertPayment();
  const updateStatusMutation = useUpdatePayrollPeriodStatus();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPeriod(), refetchSalaries(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered salaries
  const filteredSalaries = salaries.filter((salary) => {
    const matchesSearch =
      salary.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salary.user?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      paymentStatusFilter === "all" || salary.payment_status === paymentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Selection handlers
  const toggleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAll = () => {
    const allIds = filteredSalaries
      .filter((s) => s.payment_status === "pending")
      .map((s) => s.id);
    setSelectedRecords(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedRecords(new Set());
  };

  const selectAllPending = () => {
    const pendingIds = filteredSalaries
      .filter((s) => s.payment_status === "pending")
      .map((s) => s.id);
    setSelectedRecords(new Set(pendingIds));
  };

  // Payment handlers
  const openPaymentModal = (record: PayrollSalaryRecord) => {
    setCurrentRecord(record);
    setPaymentMethod("bank_transfer");
    setPaymentReference("");
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const handleMarkAsPaid = () => {
    if (!currentRecord) return;

    markPaidMutation.mutate(
      {
        salaryRecordId: currentRecord.id,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      },
      {
        onSuccess: () => {
          success("Success", "Salary marked as paid successfully");
          setShowPaymentModal(false);
          setCurrentRecord(null);
        },
        onError: (err) => {
          error("Error", err.message || "Failed to mark salary as paid");
        },
      }
    );
  };

  const handleBulkPayment = () => {
    if (selectedRecords.size === 0) {
      error("Error", "Please select at least one employee");
      return;
    }

    bulkPaidMutation.mutate(
      {
        salaryRecordIds: Array.from(selectedRecords),
        payrollPeriodId: id,
        paymentMethod,
        notes: paymentNotes || undefined,
      },
      {
        onSuccess: (result) => {
          success(
            "Bulk Payment Complete",
            `Successfully paid: ${result.success}\nFailed: ${result.failed}`
          );
          setShowBulkPaymentModal(false);
          setSelectedRecords(new Set());
        },
        onError: (err) => {
          error("Error", err.message || "Failed to process bulk payment");
        },
      }
    );
  };

  // Edit handlers
  const openEditModal = (record: PayrollSalaryRecord) => {
    setCurrentRecord(record);
    setEditData({
      baseSalary: record.base_salary || 0,
      allowances: record.allowances || 0,
      deductions: record.deductions || 0,
      bonus: record.bonus || 0,
      notes: record.notes || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateSalary = () => {
    if (!currentRecord) return;

    updateSalaryMutation.mutate(
      {
        recordId: currentRecord.id,
        updates: {
          base_salary: editData.baseSalary,
          allowances: editData.allowances,
          deductions: editData.deductions,
          bonus: editData.bonus,
          notes: editData.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          success("Success", "Salary record updated successfully");
          setShowEditModal(false);
          setCurrentRecord(null);
        },
        onError: (err) => {
          error("Error", err.message || "Failed to update salary record");
        },
      }
    );
  };

  // Revert handlers
  const openRevertModal = (record: PayrollSalaryRecord) => {
    setCurrentRecord(record);
    setRevertReason("");
    setShowRevertModal(true);
  };

  const handleRevertPayment = () => {
    if (!currentRecord || !revertReason.trim()) {
      error("Error", "Please provide a reason for reverting");
      return;
    }

    revertMutation.mutate(
      {
        salaryRecordId: currentRecord.id,
        reason: revertReason,
        revertedBy: user?.id || "",
      },
      {
        onSuccess: () => {
          success("Success", "Payment reverted successfully");
          setShowRevertModal(false);
          setCurrentRecord(null);
        },
        onError: (err) => {
          error("Error", err.message || "Failed to revert payment");
        },
      }
    );
  };

  // Status update
  const handleUpdateStatus = () => {
    if (!period) return;

    const statusFlow: PayrollPeriodStatus[] = ["draft", "in_review", "approved", "processing", "completed"];
    const currentIndex = statusFlow.indexOf(period.status);

    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
      info("Info", "Cannot progress status further");
      return;
    }

    const nextStatus = statusFlow[currentIndex + 1];

    confirm(
      "Confirm Status Change",
      `Change status from "${period.status}" to "${nextStatus}"?`,
      () => {
        updateStatusMutation.mutate(
          { periodId: id, status: nextStatus, userId: user?.id || "" },
          {
            onSuccess: () => {
              success("Success", "Status updated successfully");
            },
            onError: (err) => {
              error("Error", err.message || "Failed to update status");
            },
          }
        );
      },
      undefined,
      "Confirm"
    );
  };

  // Export handlers
  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await generateBulkSalarySlips(id);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      error("Error", "Failed to generate salary slips PDF");
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportSummary = async () => {
    setExportingSummary(true);
    try {
      await generatePayrollSummaryPDF(id);
    } catch (err) {
      console.error("Error exporting summary:", err);
      error("Error", "Failed to generate payroll summary PDF");
    } finally {
      setExportingSummary(false);
    }
  };

  const calculateTotal = (record: PayrollSalaryRecord) => {
    const base = record.base_salary || 0;
    const allowances = record.allowances || 0;
    const deductions = record.deductions || 0;
    const bonus = record.bonus || 0;
    return base + allowances + bonus - deductions;
  };

  const calculateEditTotal = () => {
    return editData.baseSalary + editData.allowances + editData.bonus - editData.deductions;
  };

  const isLoading = loadingPeriod || loadingSalaries || loadingStats;

  if (isLoading && !period) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!period) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>Payroll period not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(period.status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="calendar-month" size={24} color={Colors.primary} />
              <Text style={styles.headerTitle}>{formatMonth(period.month, period.year)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {period.status.replace("_", " ")}
              </Text>
            </View>
          </View>

          <View style={styles.dateRange}>
            <Text style={styles.dateRangeText}>
              {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Employees</Text>
              <Text style={styles.statValue}>{stats?.totalEmployees || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Gross</Text>
              <Text style={styles.statValue}>₹{Math.floor(stats?.totalGrossSalary || 0).toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Net</Text>
              <Text style={styles.statValue}>₹{Math.floor(stats?.totalNetSalary || 0).toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Paid</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {stats?.employeesPaid || 0}/{stats?.totalEmployees || 0}
              </Text>
            </View>
          </View>

          {/* Status Update Button */}
          {period.status !== "completed" && period.status !== "cancelled" && (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <MaterialCommunityIcons name="arrow-right-circle" size={20} color={Colors.textInverse} />
                  <Text style={styles.statusButtonText}>Progress Status</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Search and Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
            {(["all", "pending", "paid", "processing", "failed", "on_hold"] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  paymentStatusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setPaymentStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    paymentStatusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === "all" ? "All" : status.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bulk Actions */}
        {selectedRecords.size > 0 && (
          <View style={styles.bulkActionsBar}>
            <Text style={styles.bulkActionsText}>{selectedRecords.size} selected</Text>
            <View style={styles.bulkActionsButtons}>
              <TouchableOpacity style={styles.bulkActionButton} onPress={deselectAll}>
                <Text style={styles.bulkActionButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.bulkActionButtonPrimary]}
                onPress={() => setShowBulkPaymentModal(true)}
              >
                <MaterialCommunityIcons name="check-all" size={18} color={Colors.textInverse} />
                <Text style={styles.bulkActionButtonTextPrimary}>Mark Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.selectionButtons}>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAll}>
            <Text style={styles.selectionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAllPending}>
            <Text style={styles.selectionButtonText}>Select Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={deselectAll}>
            <Text style={styles.selectionButtonText}>Deselect All</Text>
          </TouchableOpacity>
        </View>

        {/* Export Actions */}
        <View style={styles.exportSection}>
          <Text style={styles.exportLabel}>Export Reports</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={[styles.exportButton, exportingPDF && styles.exportButtonDisabled]}
              onPress={handleExportPDF}
              disabled={exportingPDF || salaries.length === 0}
            >
              {exportingPDF ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-pdf-box" size={20} color={Colors.textInverse} />
                  <Text style={styles.exportButtonText}>Salary Slips PDF</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonSecondary, exportingSummary && styles.exportButtonDisabled]}
              onPress={handleExportSummary}
              disabled={exportingSummary || salaries.length === 0}
            >
              {exportingSummary ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-document" size={20} color={Colors.textInverse} />
                  <Text style={styles.exportButtonText}>Summary PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Salary Records List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Salary Records ({filteredSalaries.length})</Text>

          {filteredSalaries.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-off" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyStateText}>No records found</Text>
            </View>
          ) : (
            <View style={styles.recordsList}>
              {filteredSalaries.map((record) => {
                const paymentColor = getPaymentStatusColor(record.payment_status);
                const total = calculateTotal(record);
                const isSelected = selectedRecords.has(record.id);

                return (
                  <View key={record.id} style={styles.recordCard}>
                    <View style={styles.recordHeader}>
                      <TouchableOpacity
                        style={styles.recordCheckbox}
                        onPress={() => toggleSelectRecord(record.id)}
                        disabled={record.payment_status !== "pending"}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxActive,
                            record.payment_status !== "pending" && styles.checkboxDisabled,
                          ]}
                        >
                          {isSelected && (
                            <MaterialCommunityIcons name="check" size={16} color={Colors.textInverse} />
                          )}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.recordInfo}>
                        <Text style={styles.recordName}>{record.user?.full_name || "Unknown"}</Text>
                        <Text style={styles.recordId}>ID: {record.user?.employee_id || "N/A"}</Text>
                      </View>

                      <View style={[styles.paymentBadge, { backgroundColor: paymentColor.bg }]}>
                        <MaterialCommunityIcons name={paymentColor.icon} size={14} color={paymentColor.text} />
                        <Text style={[styles.paymentBadgeText, { color: paymentColor.text }]}>
                          {record.payment_status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recordDetails}>
                      <View style={styles.salaryBreakdown}>
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Base Salary</Text>
                          <Text style={styles.breakdownValue}>₹{(record.base_salary || 0).toLocaleString("en-IN")}</Text>
                        </View>
                        {(record.allowances || 0) > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Allowances</Text>
                            <Text style={[styles.breakdownValue, { color: Colors.success }]}>
                              +₹{(record.allowances || 0).toLocaleString("en-IN")}
                            </Text>
                          </View>
                        )}
                        {(record.bonus || 0) > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Bonus</Text>
                            <Text style={[styles.breakdownValue, { color: Colors.success }]}>
                              +₹{(record.bonus || 0).toLocaleString("en-IN")}
                            </Text>
                          </View>
                        )}
                        {(record.deductions || 0) > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Deductions</Text>
                            <Text style={[styles.breakdownValue, { color: Colors.danger }]}>
                              -₹{(record.deductions || 0).toLocaleString("en-IN")}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                          <Text style={styles.breakdownLabelTotal}>Net Salary</Text>
                          <Text style={styles.breakdownValueTotal}>₹{total.toLocaleString("en-IN")}</Text>
                        </View>
                      </View>

                      {record.hours_worked !== null && (
                        <View style={styles.hoursRow}>
                          <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.textSecondary} />
                          <Text style={styles.hoursText}>
                            {record.hours_worked}h / {record.expected_hours}h worked
                          </Text>
                        </View>
                      )}

                      {record.payment_status === "paid" && (
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentInfoText}>
                            Paid via {record.payment_mode?.replace("_", " ")} on{" "}
                            {record.paid_at ? new Date(record.paid_at).toLocaleDateString() : "N/A"}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.recordActions}>
                      {record.payment_status === "pending" && (
                        <>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openEditModal(record)}
                          >
                            <Feather name="edit-2" size={16} color={Colors.primary} />
                            <Text style={styles.actionButtonText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.actionButtonPrimary]}
                            onPress={() => openPaymentModal(record)}
                          >
                            <MaterialCommunityIcons name="cash-check" size={16} color={Colors.textInverse} />
                            <Text style={styles.actionButtonTextPrimary}>Mark Paid</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {record.payment_status === "paid" && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonDanger]}
                          onPress={() => openRevertModal(record)}
                        >
                          <MaterialCommunityIcons name="undo" size={16} color={Colors.danger} />
                          <Text style={[styles.actionButtonText, { color: Colors.danger }]}>Revert</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Single Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark as Paid</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {(["bank_transfer", "cash", "cheque", "upi", "other"] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodChip,
                      paymentMethod === method && styles.paymentMethodChipActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === method && styles.paymentMethodTextActive,
                      ]}
                    >
                      {method.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Payment Reference (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="Transaction ID or reference number"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.modalLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Additional notes..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleMarkAsPaid}
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Confirm Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Payment Modal */}
      <Modal visible={showBulkPaymentModal} transparent animationType="slide" onRequestClose={() => setShowBulkPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Payment</Text>
              <TouchableOpacity onPress={() => setShowBulkPaymentModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.bulkSummary}>
                <Text style={styles.bulkSummaryLabel}>Selected Employees</Text>
                <Text style={styles.bulkSummaryValue}>{selectedRecords.size}</Text>
              </View>

              <Text style={styles.modalLabel}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {(["bank_transfer", "cash", "cheque", "upi", "other"] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodChip,
                      paymentMethod === method && styles.paymentMethodChipActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === method && styles.paymentMethodTextActive,
                      ]}
                    >
                      {method.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Batch notes..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowBulkPaymentModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleBulkPayment}
                disabled={bulkPaidMutation.isPending}
              >
                {bulkPaidMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Process Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Salary</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Base Salary</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.baseSalary.toString()}
                onChangeText={(text) => setEditData({ ...editData, baseSalary: Number(text) || 0 })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.modalLabel}>Allowances</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.allowances.toString()}
                onChangeText={(text) => setEditData({ ...editData, allowances: Number(text) || 0 })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.modalLabel}>Deductions</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.deductions.toString()}
                onChangeText={(text) => setEditData({ ...editData, deductions: Number(text) || 0 })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.modalLabel}>Bonus</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.bonus.toString()}
                onChangeText={(text) => setEditData({ ...editData, bonus: Number(text) || 0 })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.modalLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={editData.notes}
                onChangeText={(text) => setEditData({ ...editData, notes: text })}
                placeholder="Adjustment notes..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />

              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Net Salary</Text>
                <Text style={styles.totalValue}>₹{calculateEditTotal().toLocaleString("en-IN")}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleUpdateSalary}
                disabled={updateSalaryMutation.isPending}
              >
                {updateSalaryMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Revert Modal */}
      <Modal visible={showRevertModal} transparent animationType="slide" onRequestClose={() => setShowRevertModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Revert Payment</Text>
              <TouchableOpacity onPress={() => setShowRevertModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="alert" size={24} color={Colors.warning} />
                <Text style={styles.warningText}>
                  This will revert the payment status to pending. This action should be used carefully.
                </Text>
              </View>

              <Text style={styles.modalLabel}>Reason for Reversion *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={revertReason}
                onChangeText={setRevertReason}
                placeholder="Explain why this payment needs to be reverted..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowRevertModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, { backgroundColor: Colors.danger }]}
                onPress={handleRevertPayment}
                disabled={revertMutation.isPending}
              >
                {revertMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Revert Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing["2xl"],
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  headerCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textTransform: "uppercase",
  },
  dateRange: {
    paddingVertical: Spacing.sm,
  },
  dateRangeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  statusButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  searchSection: {
    gap: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  filterChips: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: "capitalize",
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  bulkActionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bulkActionsText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  bulkActionsButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  bulkActionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  bulkActionButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
  },
  bulkActionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  bulkActionButtonTextPrimary: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  selectionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  selectionButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  selectionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  section: {
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  emptyState: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  recordsList: {
    gap: Spacing.md,
  },
  recordCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  recordCheckbox: {
    padding: Spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  recordId: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  paymentBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textTransform: "capitalize",
  },
  recordDetails: {
    gap: Spacing.md,
  },
  salaryBreakdown: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  breakdownLabelTotal: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  breakdownValueTotal: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  hoursText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  paymentInfo: {
    backgroundColor: Colors.success + "20",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  paymentInfoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
  },
  recordActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionButtonDanger: {
    borderColor: Colors.danger,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  actionButtonTextPrimary: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["3xl"],
    borderTopRightRadius: BorderRadius["3xl"],
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  modalBody: {
    padding: Spacing.xl,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: "top",
  },
  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  paymentMethodChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentMethodText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    textTransform: "capitalize",
  },
  paymentMethodTextActive: {
    color: Colors.textInverse,
  },
  bulkSummary: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  bulkSummaryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  bulkSummaryValue: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  totalCard: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  totalLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  totalValue: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  warningBox: {
    flexDirection: "row",
    gap: Spacing.md,
    backgroundColor: Colors.warning + "20",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.warning,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  modalButtonSecondaryText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  modalButtonPrimaryText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  exportSection: {
    gap: Spacing.md,
  },
  exportLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  exportButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  exportButtonSecondary: {
    backgroundColor: Colors.primaryDark,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
});
