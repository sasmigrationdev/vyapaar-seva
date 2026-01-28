import { Tables } from "../supabase/types";

// Re-export payroll types
export * from './payroll';

// Database table types
export type User = Tables<"users">;
export type AttendanceRecord = Tables<"attendance_records">;
export type SalaryRecord = Tables<"salary_records"> & {
  // Computed fields added by query functions for UI compatibility
  month_year?: string;
  days_worked?: number;
  paid_date?: string | null;
};
export type LeaveRequest = Tables<"leave_requests">;
export type Notification = Tables<"notifications">;
export type Organization = Tables<"organizations">;
export type EmployeeMonthlyEarnings = Tables<"employee_monthly_earnings">;
export type BreakRequest = Tables<"break_requests">;
export type SalaryHistory = Tables<"salary_history">;

// Overtime Request type (will be available after migration is applied)
// For now, define the type manually until Supabase types are regenerated
export interface OvertimeRequest {
  id: string;
  user_id: string;
  attendance_record_id: string;
  request_date: string;
  requested_hours: number;
  reason: string | null;
  status: OvertimeRequestStatus;
  approved_hours: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Break-related types
export interface AttendanceBreak {
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  duration_minutes: number;
  notes?: string;
}

// Enums
export type UserRole = "employee" | "hr" | "admin";
export type LeaveType =
  | "sick"
  | "casual"
  | "earned"
  | "unpaid"
  | "maternity"
  | "paternity";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type BreakStatus = "pending_start" | "active" | "completed" | "rejected" | "cancelled";
export type OvertimeRequestStatus = "pending" | "approved" | "rejected";
export type SalaryStatus = "draft" | "pending" | "approved" | "paid";
export type PaymentMethod = "bank_transfer" | "cash" | "cheque" | "upi";
export type NotificationType =
  | "attendance"
  | "salary"
  | "leave"
  | "announcement"
  | "system";
export type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// Extended types with relations
export type UserWithOrganization = User & {
  organization?: Organization;
};

export type UserWithEarnings = User & {
  current_month_earnings?: EmployeeMonthlyEarnings;
};

export type AttendanceWithUser = AttendanceRecord & {
  user?: Pick<User, "full_name" | "employee_id">;
  break_requests?: BreakRequest[];
};

export type SalaryWithUser = SalaryRecord & {
  user?: Pick<User, "full_name" | "employee_id">;
};

export type LeaveRequestWithUser = LeaveRequest & {
  user?: Pick<User, "full_name" | "employee_id">;
  reviewer?: Pick<User, "full_name">;
};

export type EarningsWithUser = EmployeeMonthlyEarnings & {
  user?: Pick<
    User,
    "full_name" | "employee_id" | "base_salary" | "hourly_rate"
  >;
};

export type SalaryHistoryWithUser = SalaryHistory & {
  user?: Pick<User, "full_name" | "employee_id">;
  changedBy?: Pick<User, "full_name">;
};

export type OvertimeRequestWithUser = OvertimeRequest & {
  user?: Pick<User, "full_name" | "employee_id" | "organization_id">;
  reviewer?: Pick<User, "full_name">;
  attendance_record?: Pick<AttendanceRecord, "date" | "check_in_time" | "check_out_time" | "total_hours">;
};

// Monthly attendance summary
export interface MonthlyAttendanceSummary {
  records: AttendanceRecord[];
  totalDays: number;
  validDays: number;
  totalHours: number;
  avgHours: number;
}

// Dashboard stats
export interface EmployeeDashboardStats {
  todayAttendance: AttendanceRecord | null;
  monthlyAttendance: MonthlyAttendanceSummary;
  upcomingLeaves: LeaveRequest[];
  latestSalary: SalaryRecord | null;
  unreadNotifications: number;
}

export interface HRDashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayPresent: number;
  pendingLeaveRequests: number;
  pendingSalaryRecords: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  fullName: string;
  employeeId: string;
  phone?: string;
}

export interface CheckInForm {
  notes?: string;
  wifiSsid?: string;
  wifiVerified?: boolean;
}

export interface CheckOutForm {
  notes?: string;
  wifiSsid?: string;
  wifiVerified?: boolean;
}

export interface StartBreakForm {
  reason: string;
  notes?: string;
  wifiSsid?: string;
  wifiVerified?: boolean;
}

export interface EndBreakForm {
  notes?: string;
  wifiSsid?: string;
  wifiVerified?: boolean;
}

export interface LeaveRequestForm {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface SalaryRecordForm {
  userId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances?: number;
  deductions?: number;
  bonus?: number;
  workingDays: number;
  presentDays: number;
  leavesTaken?: number;
  notes?: string;
}

export interface EmployeeForm {
  fullName: string;
  email: string;
  employeeId: string;
  phone?: string;
  role: UserRole;
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  password?: string;
  baseSalary?: number;
  workingDays?: WeekDay[];
  dailyWorkingHours?: number;
  // Bank account details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  branchName?: string;
}

export interface EmployeeSalaryConfig {
  baseSalary: number;
  workingDays: WeekDay[];
  dailyWorkingHours: number;
  hourlyRate?: number;
  monthlyTotalHours?: number;
}

// Organization stats
export interface OrganizationStats {
  totalEmployees: number;
  activeEmployees: number;
  hrCount: number;
  employeeCount: number;
  presentToday: number;
  absentToday: number;
  pendingLeaveRequests: number;
}

// WiFi Verification types
export type OfficeWiFiNetwork = {
  id: string;
  organization_id: string;
  ssid: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export interface WiFiVerificationStatus {
  isConnected: boolean;
  ssid: string | null;
  isOfficeWiFi: boolean;
  permissionGranted: boolean;
  error?: string;
}

// Employer-Employee Management types
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type RequestType = "join" | "leave";
export type JoinMethod = "request" | "hr_created" | "migrated";

export interface EmployerEmployeeRequest {
  id: string;
  employee_id: string;
  employer_id: string | null;
  organization_id: string;
  request_type: RequestType;
  status: RequestStatus;
  message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  employee?: Pick<
    User,
    | "id"
    | "full_name"
    | "email"
    | "phone"
    | "employee_id"
    | "profile_picture_url"
  >;
  organization?: Pick<Organization, "id" | "name">;
  reviewer?: Pick<User, "id" | "full_name" | "email">;
}

export interface EmploymentHistory {
  id: string;
  employee_id: string;
  organization_id: string;
  joined_at: string;
  left_at: string | null;
  join_method: JoinMethod;
  leave_reason: string | null;
  approved_by: string | null;
  terminated_by: string | null;
  notes: string | null;
  created_at: string;
  // Flat employer fields (added for easier display)
  employer_name?: string | null;
  employer_email?: string | null;
  // Relations
  organization?: Pick<Organization, "id" | "name"> & {
    owner?: Pick<User, "id" | "full_name" | "email"> | null;
  };
  employee?: Pick<
    User,
    | "id"
    | "full_name"
    | "email"
    | "phone"
    | "employee_id"
    | "profile_picture_url"
  >;
  approver?: Pick<User, "id" | "full_name" | "email">;
  terminator?: Pick<User, "id" | "full_name" | "email">;
}

export interface EmployerSearchResult {
  organization_id: string;
  organization_name: string;
  employer_code: string | null;
  employer_id: string | null;
  employer_name: string | null;
  employer_email: string | null;
}

// Extended Organization type
export type OrganizationWithOwner = Organization & {
  owner?: Pick<User, "id" | "full_name" | "email">;
};

// Form types for employer features
export interface EmployerSignupForm {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}

export interface JoinRequestForm {
  organizationId: string;
  message?: string;
}

export interface ReviewRequestForm {
  requestId: string;
  notes?: string;
}

export interface LeaveOrganizationForm {
  reason?: string;
}

// Dashboard stats with requests
export interface EmployeeDashboardStatsExtended extends EmployeeDashboardStats {
  currentEmployment: EmploymentHistory | null;
  pendingJoinRequests: EmployerEmployeeRequest[];
}

export interface HRDashboardStatsExtended extends HRDashboardStats {
  pendingJoinRequests: number;
}

// Attendance Period Summary types
export interface AttendancePeriodSummary {
  totalWorkingHours: number;
  expectedWorkingDays: number;
  daysAttended: number;
  approvedLeaveDays: number;
  absentDays: number;
  approvedOvertimeHours: number;
  attendancePercentage: number;
}

export interface OrganizationAttendanceSummary extends AttendancePeriodSummary {
  employeeCount: number;
}

export type YearFilter = number | 'all';
export type MonthFilter = number | 'all'; // 0-11 for months

// WiFi Connectivity State for Auto Check-In
export interface WiFiConnectivityState {
  isConnected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  ssid: string | null;
  isOfficeWiFi: boolean;
  lastChecked: Date | null;
}

// Auto Attendance Action Result
export interface AutoAttendanceAction {
  type: 'check-in' | 'check-out';
  timestamp: Date;
  success: boolean;
  reason?: string;
}

// Auto Attendance State
export interface AutoAttendanceState {
  isEnabled: boolean;
  lastAction: AutoAttendanceAction | null;
  blockReason: string | null;
  isProcessing: boolean;
}

// Payslip Download tracking
export interface PayslipDownload {
  id: string;
  user_id: string;
  month: number;
  year: number;
  downloaded_at: string;
  device_platform?: string;
  device_info?: string;
  created_at: string;
}
