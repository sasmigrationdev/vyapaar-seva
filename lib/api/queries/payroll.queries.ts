import { supabase } from '@/lib/supabase/client';
import type {
  PayrollPeriod,
  PayrollPeriodWithStats,
  PayrollSalaryRecord,
  PaymentTransaction,
  BulkPaymentBatch,
  PayrollPeriodStats,
} from '@/lib/types/payroll';

export const payrollQueries = {
  /**
   * Get payroll periods with optional filters (HR only)
   */
  getPayrollPeriods: async (filters?: {
    organizationId?: string;
    status?: string;
    year?: number;
  }): Promise<PayrollPeriod[]> => {
    let query = supabase
      .from('payroll_periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (filters?.organizationId) query = query.eq('organization_id', filters.organizationId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.year) query = query.eq('year', filters.year);

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },

  /**
   * Get specific payroll period by ID (HR only)
   */
  getPayrollPeriodById: async (periodId: string): Promise<PayrollPeriodWithStats | null> => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select(`
        *,
        initiator:initiated_by(full_name, employee_id),
        approver:approved_by(full_name, employee_id),
        completer:completed_by(full_name, employee_id)
      `)
      .eq('id', periodId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return data as PayrollPeriodWithStats;
  },

  /**
   * Get payroll period for specific month/year (HR only)
   */
  getPayrollPeriodByMonthYear: async (
    organizationId: string,
    month: number,
    year: number
  ): Promise<PayrollPeriod | null> => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get salary records for a payroll period (HR only)
   */
  getSalaryRecordsByPeriod: async (
    payrollPeriodId: string
  ): Promise<PayrollSalaryRecord[]> => {
    const { data, error } = await supabase
      .from('salary_records')
      .select(`
        *,
        user:user_id(
          full_name,
          employee_id,
          department,
          designation,
          email,
          phone,
          bank_name,
          account_number,
          ifsc_code,
          account_holder_name,
          branch_name
        ),
        paid_by_user:paid_by(full_name, employee_id)
      `)
      .eq('payroll_period_id', payrollPeriodId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []) as PayrollSalaryRecord[];
  },

  /**
   * Get salary records by payment status (HR only)
   */
  getSalaryRecordsByPaymentStatus: async (
    payrollPeriodId: string,
    paymentStatus: string
  ): Promise<PayrollSalaryRecord[]> => {
    const { data, error } = await supabase
      .from('salary_records')
      .select(`
        *,
        user:user_id(
          full_name,
          employee_id,
          department,
          designation
        )
      `)
      .eq('payroll_period_id', payrollPeriodId)
      .eq('payment_status', paymentStatus)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []) as PayrollSalaryRecord[];
  },

  /**
   * Get payment statistics for a payroll period (HR only)
   */
  getPayrollPeriodStats: async (payrollPeriodId: string): Promise<PayrollPeriodStats> => {
    const { data, error } = await supabase
      .from('salary_records')
      .select('*')
      .eq('payroll_period_id', payrollPeriodId);

    if (error) throw error;

    const records = data || [];
    const totalEmployees = records.length;
    const totalGrossSalary = records.reduce(
      (sum, r) => sum + (Number(r.base_salary) + Number(r.allowances || 0) + Number(r.bonus || 0)),
      0
    );
    const totalDeductions = records.reduce((sum, r) => sum + Number(r.deductions || 0), 0);
    const totalNetSalary = records.reduce((sum, r) => sum + Number(r.total_salary || 0), 0);

    const paidRecords = records.filter(r => r.payment_status === 'paid');
    const employeesPaid = paidRecords.length;
    const employeesPending = totalEmployees - employeesPaid;
    const totalPaid = paidRecords.reduce((sum, r) => sum + Number(r.total_salary || 0), 0);
    const totalPending = totalNetSalary - totalPaid;

    return {
      totalEmployees,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      employeesPaid,
      employeesPending,
      totalPaid,
      totalPending,
    };
  },

  /**
   * Get payment transactions (HR only)
   */
  getPaymentTransactions: async (filters?: {
    salaryRecordId?: string;
    payrollPeriodId?: string;
    status?: string;
  }): Promise<PaymentTransaction[]> => {
    let query = supabase
      .from('payment_transactions')
      .select(`
        *,
        salary_record:salary_record_id(
          id,
          month,
          year,
          total_salary,
          user:user_id(full_name, employee_id)
        ),
        processor:processed_by(full_name, employee_id)
      `)
      .order('created_at', { ascending: false });

    if (filters?.salaryRecordId) query = query.eq('salary_record_id', filters.salaryRecordId);
    if (filters?.payrollPeriodId) query = query.eq('payroll_period_id', filters.payrollPeriodId);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []) as PaymentTransaction[];
  },

  /**
   * Get bulk payment batches (HR only)
   */
  getBulkPaymentBatches: async (payrollPeriodId: string): Promise<BulkPaymentBatch[]> => {
    const { data, error } = await supabase
      .from('bulk_payment_batches')
      .select(`
        *,
        initiator:initiated_by(full_name, employee_id)
      `)
      .eq('payroll_period_id', payrollPeriodId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as BulkPaymentBatch[];
  },

  /**
   * Get bulk payment batch by ID (HR only)
   */
  getBulkPaymentBatchById: async (batchId: string): Promise<BulkPaymentBatch | null> => {
    const { data, error } = await supabase
      .from('bulk_payment_batches')
      .select(`
        *,
        initiator:initiated_by(full_name, employee_id),
        payroll_period:payroll_period_id(month, year)
      `)
      .eq('id', batchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return data as BulkPaymentBatch;
  },

  /**
   * Check if payroll period exists for month/year (HR only)
   */
  checkPayrollPeriodExists: async (
    organizationId: string,
    month: number,
    year: number
  ): Promise<boolean> => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code === 'PGRST116') return false;
    if (error) throw error;

    return !!data;
  },
};
