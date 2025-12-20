import type { User, SalaryRecord } from './index';

// Payroll Period Status
export type PayrollPeriodStatus = 'draft' | 'in_review' | 'approved' | 'processing' | 'completed' | 'cancelled';

// Payment Status
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'on_hold';

// Payment Mode
export type PaymentMode = 'bank_transfer' | 'cash' | 'cheque' | 'upi' | 'other';

// Payment Transaction Status
export type PaymentTransactionStatus = 'initiated' | 'processing' | 'completed' | 'failed' | 'reversed';

// Bulk Payment Batch Status
export type BulkPaymentBatchStatus = 'pending' | 'processing' | 'completed' | 'partially_completed' | 'failed';

// Base Payroll Period type
export interface PayrollPeriod {
  id: string;
  organization_id: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatus;
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  employees_paid: number;
  total_amount_paid: number;
  initiated_by: string | null;
  initiated_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Payroll Period with user details
export interface PayrollPeriodWithStats extends PayrollPeriod {
  initiator?: Pick<User, 'full_name' | 'employee_id'>;
  approver?: Pick<User, 'full_name' | 'employee_id'>;
  completer?: Pick<User, 'full_name' | 'employee_id'>;
}

// Salary Record with Payroll fields
export interface PayrollSalaryRecord extends SalaryRecord {
  payroll_period_id: string | null;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  payment_mode: PaymentMode | null;
  paid_by: string | null;
  paid_at: string | null;
  payment_notes: string | null;
  hours_worked: number;
  expected_hours: number;
  hourly_rate: number;
  user?: Pick<
    User,
    | 'full_name'
    | 'employee_id'
    | 'department'
    | 'designation'
    | 'email'
    | 'phone'
    | 'bank_name'
    | 'account_number'
    | 'ifsc_code'
    | 'account_holder_name'
    | 'branch_name'
  >;
  paid_by_user?: Pick<User, 'full_name' | 'employee_id'>;
}

// Payment Transaction
export interface PaymentTransaction {
  id: string;
  salary_record_id: string;
  payroll_period_id: string;
  amount: number;
  payment_method: PaymentMode;
  reference_number: string | null;
  status: PaymentTransactionStatus;
  bank_name: string | null;
  account_number: string | null;
  transaction_date: string | null;
  processed_by: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  salary_record?: {
    id: string;
    month: number;
    year: number;
    total_salary: number;
    user?: Pick<User, 'full_name' | 'employee_id'>;
  };
  processor?: Pick<User, 'full_name' | 'employee_id'>;
}

// Bulk Payment Batch
export interface BulkPaymentBatch {
  id: string;
  payroll_period_id: string;
  batch_name: string;
  total_employees: number;
  total_amount: number;
  status: BulkPaymentBatchStatus;
  processed_count: number;
  success_count: number;
  failed_count: number;
  initiated_by: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  error_log: Array<{ employee_id: string; error: string }>;
  created_at: string;
  updated_at: string;
  initiator?: Pick<User, 'full_name' | 'employee_id'>;
  payroll_period?: {
    month: number;
    year: number;
  };
}

// Payroll Period Statistics
export interface PayrollPeriodStats {
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  employeesPaid: number;
  employeesPending: number;
  totalPaid: number;
  totalPending: number;
}

// Form types for payroll operations
export interface CreatePayrollPeriodForm {
  organizationId: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface MarkSalaryPaidForm {
  salaryRecordId: string;
  paymentMethod: PaymentMode;
  paymentReference?: string;
  notes?: string;
}

export interface BulkMarkSalariesPaidForm {
  salaryRecordIds: string[];
  payrollPeriodId: string;
  paymentMethod: PaymentMode;
  batchName: string;
  notes?: string;
}

export interface UpdateSalaryRecordForm {
  recordId: string;
  baseSalary?: number;
  allowances?: number;
  deductions?: number;
  bonus?: number;
  notes?: string;
}

export interface RevertPaymentForm {
  salaryRecordId: string;
  reason: string;
}

export interface UpdatePayrollPeriodStatusForm {
  periodId: string;
  status: PayrollPeriodStatus;
  notes?: string;
}

// Salary calculation result
export interface SalaryCalculation {
  baseSalary: number;
  hoursWorked: number;
  expectedHours: number;
  hourlyRate: number;
  earnedBaseSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  grossSalary: number;
  netSalary: number;
}

// Payroll summary for dashboard
export interface PayrollSummary {
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  averageSalary: number;
  totalEmployees: number;
}
