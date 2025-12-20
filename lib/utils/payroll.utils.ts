import {
  PaymentMode,
  PaymentStatus,
  PayrollPeriodStatus,
  PayrollSalaryRecord,
} from "../types";

/**
 * Calculate total salary for a record
 */
export function calculateTotalSalary(
  baseSalary: number,
  allowances: number,
  deductions: number,
  bonus: number
): number {
  return baseSalary + allowances + bonus - deductions;
}

/**
 * Calculate earned salary based on hours worked
 */
export function calculateEarnedSalary(
  baseSalary: number,
  hoursWorked: number,
  expectedHours: number
): number {
  if (expectedHours === 0) return 0;
  return (baseSalary / expectedHours) * hoursWorked;
}

/**
 * Format currency for display (Indian Rupee)
 */
export function formatCurrency(amount: number): string {
  return `₹${Math.floor(amount).toLocaleString("en-IN")}`;
}

/**
 * Get payment status color and icon
 */
export function getPaymentStatusColor(status: PaymentStatus): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (status) {
    case "pending":
      return {
        bg: "#F3F4F6",
        text: "#6B7280",
        icon: "clock-outline",
      };
    case "processing":
      return {
        bg: "#FEF3C7",
        text: "#92400E",
        icon: "progress-clock",
      };
    case "paid":
      return {
        bg: "#D1FAE5",
        text: "#065F46",
        icon: "check-circle",
      };
    case "failed":
      return {
        bg: "#FEE2E2",
        text: "#991B1B",
        icon: "alert-circle",
      };
    case "on_hold":
      return {
        bg: "#FED7AA",
        text: "#9A3412",
        icon: "pause-circle",
      };
    default:
      return {
        bg: "#F3F4F6",
        text: "#6B7280",
        icon: "help-circle",
      };
  }
}

/**
 * Get period status color
 */
export function getPeriodStatusColor(status: PayrollPeriodStatus): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (status) {
    case "draft":
      return {
        bg: "#F3F4F6",
        text: "#6B7280",
        icon: "file-document-edit-outline",
      };
    case "in_review":
      return {
        bg: "#FEF3C7",
        text: "#92400E",
        icon: "file-search-outline",
      };
    case "approved":
      return {
        bg: "#DBEAFE",
        text: "#1E40AF",
        icon: "check-decagram",
      };
    case "processing":
      return {
        bg: "#E0E7FF",
        text: "#3730A3",
        icon: "progress-clock",
      };
    case "completed":
      return {
        bg: "#D1FAE5",
        text: "#065F46",
        icon: "check-circle",
      };
    case "cancelled":
      return {
        bg: "#FEE2E2",
        text: "#991B1B",
        icon: "close-circle",
      };
    default:
      return {
        bg: "#F3F4F6",
        text: "#6B7280",
        icon: "help-circle",
      };
  }
}

/**
 * Format month/year for display
 */
export function formatPayrollPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Get short month name
 */
export function getShortMonthName(month: number): string {
  const date = new Date(2000, month - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

/**
 * Calculate date range for payroll period
 */
export function calculatePayrollDates(
  month: number,
  year: number
): {
  startDate: string;
  endDate: string;
} {
  // Start date: 1st of the month
  const startDate = new Date(year, month - 1, 1);

  // End date: Last day of the month
  const endDate = new Date(year, month, 0);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

/**
 * Validate salary record before saving
 */
export function validateSalaryRecord(
  record: Partial<PayrollSalaryRecord>
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Base salary must be positive
  if (record.base_salary !== undefined && record.base_salary < 0) {
    errors.push("Base salary cannot be negative");
  }

  // Allowances must be non-negative
  if (record.allowances !== undefined && record.allowances < 0) {
    errors.push("Allowances cannot be negative");
  }

  // Deductions must be non-negative
  if (record.deductions !== undefined && record.deductions < 0) {
    errors.push("Deductions cannot be negative");
  }

  // Bonus must be non-negative
  if (record.bonus !== undefined && record.bonus < 0) {
    errors.push("Bonus cannot be negative");
  }

  // Hours worked must be non-negative
  if (record.hours_worked !== undefined && record.hours_worked < 0) {
    errors.push("Hours worked cannot be negative");
  }

  // Expected hours must be positive if provided
  if (record.expected_hours !== undefined && record.expected_hours <= 0) {
    errors.push("Expected hours must be greater than zero");
  }

  // Hours worked cannot exceed expected hours significantly (allow 20% buffer)
  if (
    record.hours_worked !== undefined &&
    record.expected_hours !== undefined &&
    record.hours_worked > record.expected_hours * 1.2
  ) {
    errors.push("Hours worked exceeds expected hours by more than 20%");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate payment completion percentage
 */
export function calculatePaymentProgress(
  totalEmployees: number,
  paidEmployees: number
): number {
  if (totalEmployees === 0) return 0;
  return Math.round((paidEmployees / totalEmployees) * 100);
}

/**
 * Calculate payroll summary statistics
 */
export function calculatePayrollSummary(salaryRecords: PayrollSalaryRecord[]): {
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  averageSalary: number;
  totalPaid: number;
  totalPending: number;
  paidCount: number;
  pendingCount: number;
} {
  const summary = {
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    averageSalary: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
  };

  salaryRecords.forEach((record) => {
    const gross =
      (record.base_salary || 0) +
      (record.allowances || 0) +
      (record.bonus || 0);
    const deductions = record.deductions || 0;
    const net = gross - deductions;

    summary.totalGross += gross;
    summary.totalDeductions += deductions;
    summary.totalNet += net;

    if (record.payment_status === "paid") {
      summary.totalPaid += net;
      summary.paidCount += 1;
    } else if (record.payment_status === "pending") {
      summary.totalPending += net;
      summary.pendingCount += 1;
    }
  });

  summary.averageSalary =
    salaryRecords.length > 0
      ? summary.totalNet / salaryRecords.length
      : 0;

  return summary;
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: PaymentMode): string {
  const methodMap: Record<PaymentMode, string> = {
    bank_transfer: "Bank Transfer",
    cash: "Cash",
    cheque: "Cheque",
    upi: "UPI",
    other: "Other",
  };

  return methodMap[method] || method;
}

/**
 * Get next status in workflow
 */
export function getNextStatus(
  currentStatus: PayrollPeriodStatus
): PayrollPeriodStatus | null {
  const statusFlow: PayrollPeriodStatus[] = [
    "draft",
    "in_review",
    "approved",
    "processing",
    "completed",
  ];

  const currentIndex = statusFlow.indexOf(currentStatus);

  if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
    return null;
  }

  return statusFlow[currentIndex + 1];
}

/**
 * Check if status can be progressed
 */
export function canProgressStatus(status: PayrollPeriodStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

/**
 * Check if salary can be edited
 */
export function canEditSalary(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "pending" || paymentStatus === "on_hold";
}

/**
 * Check if payment can be reverted
 */
export function canRevertPayment(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "paid";
}

/**
 * Get payment status display text
 */
export function getPaymentStatusText(status: PaymentStatus): string {
  const statusMap: Record<PaymentStatus, string> = {
    pending: "Pending",
    processing: "Processing",
    paid: "Paid",
    failed: "Failed",
    on_hold: "On Hold",
  };

  return statusMap[status] || status;
}

/**
 * Get period status display text
 */
export function getPeriodStatusText(status: PayrollPeriodStatus): string {
  const statusMap: Record<PayrollPeriodStatus, string> = {
    draft: "Draft",
    in_review: "In Review",
    approved: "Approved",
    processing: "Processing",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
}

/**
 * Calculate working days in a month
 */
export function calculateWorkingDays(month: number, year: number): number {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  let workingDays = 0;

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const dayOfWeek = date.getDay();
    // Exclude Sundays (0)
    if (dayOfWeek !== 0) {
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * Calculate expected hours for a month
 */
export function calculateExpectedHours(
  month: number,
  year: number,
  hoursPerDay: number = 8
): number {
  const workingDays = calculateWorkingDays(month, year);
  return workingDays * hoursPerDay;
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startFormatted = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endFormatted = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Calculate attendance percentage
 */
export function calculateAttendancePercentage(
  hoursWorked: number,
  expectedHours: number
): number {
  if (expectedHours === 0) return 0;
  return Math.round((hoursWorked / expectedHours) * 100);
}

/**
 * Get status badge color for attendance percentage
 */
export function getAttendanceBadgeColor(percentage: number): {
  bg: string;
  text: string;
} {
  if (percentage >= 90) {
    return { bg: "#D1FAE5", text: "#065F46" }; // Green
  } else if (percentage >= 75) {
    return { bg: "#DBEAFE", text: "#1E40AF" }; // Blue
  } else if (percentage >= 50) {
    return { bg: "#FEF3C7", text: "#92400E" }; // Yellow
  } else {
    return { bg: "#FEE2E2", text: "#991B1B" }; // Red
  }
}

/**
 * Sort salary records by various criteria
 */
export function sortSalaryRecords(
  records: PayrollSalaryRecord[],
  sortBy: "name" | "salary" | "status" | "hours",
  order: "asc" | "desc" = "asc"
): PayrollSalaryRecord[] {
  const sorted = [...records].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        const nameA = a.users?.full_name || "";
        const nameB = b.users?.full_name || "";
        comparison = nameA.localeCompare(nameB);
        break;

      case "salary":
        const salaryA = calculateTotalSalary(
          a.base_salary || 0,
          a.allowances || 0,
          a.deductions || 0,
          a.bonus || 0
        );
        const salaryB = calculateTotalSalary(
          b.base_salary || 0,
          b.allowances || 0,
          b.deductions || 0,
          b.bonus || 0
        );
        comparison = salaryA - salaryB;
        break;

      case "status":
        const statusOrder = ["pending", "processing", "on_hold", "failed", "paid"];
        const statusIndexA = statusOrder.indexOf(a.payment_status);
        const statusIndexB = statusOrder.indexOf(b.payment_status);
        comparison = statusIndexA - statusIndexB;
        break;

      case "hours":
        const hoursA = a.hours_worked || 0;
        const hoursB = b.hours_worked || 0;
        comparison = hoursA - hoursB;
        break;
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Filter salary records by search query
 */
export function filterSalaryRecords(
  records: PayrollSalaryRecord[],
  searchQuery: string
): PayrollSalaryRecord[] {
  if (!searchQuery.trim()) return records;

  const query = searchQuery.toLowerCase();

  return records.filter((record) => {
    const name = record.users?.full_name?.toLowerCase() || "";
    const empId = record.users?.employee_id?.toLowerCase() || "";
    const department = record.users?.department?.toLowerCase() || "";

    return (
      name.includes(query) ||
      empId.includes(query) ||
      department.includes(query)
    );
  });
}

/**
 * Group salary records by payment status
 */
export function groupByPaymentStatus(
  records: PayrollSalaryRecord[]
): Record<PaymentStatus, PayrollSalaryRecord[]> {
  const grouped: Record<PaymentStatus, PayrollSalaryRecord[]> = {
    pending: [],
    processing: [],
    paid: [],
    failed: [],
    on_hold: [],
  };

  records.forEach((record) => {
    grouped[record.payment_status].push(record);
  });

  return grouped;
}

/**
 * Validate payroll period dates
 */
export function validatePayrollPeriod(
  month: number,
  year: number
): { valid: boolean; message?: string } {
  // Month must be between 1-12
  if (month < 1 || month > 12) {
    return {
      valid: false,
      message: "Month must be between 1 and 12",
    };
  }

  // Year must be reasonable (not too far in past or future)
  const currentYear = new Date().getFullYear();
  if (year < currentYear - 5 || year > currentYear + 1) {
    return {
      valid: false,
      message: "Year must be within 5 years of current year",
    };
  }

  // Cannot create payroll for future months
  const now = new Date();
  const periodDate = new Date(year, month - 1);
  if (periodDate > now) {
    return {
      valid: false,
      message: "Cannot create payroll for future months",
    };
  }

  return { valid: true };
}
