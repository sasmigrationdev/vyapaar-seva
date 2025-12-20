import { supabase } from '@/lib/supabase/client';
import type {
  PayrollPeriod,
  PayrollPeriodStatus,
  PaymentMode,
  PayrollSalaryRecord,
  PaymentTransaction,
  BulkPaymentBatch,
} from '@/lib/types/payroll';

export const payrollMutations = {
  /**
   * Create a new payroll period (HR only)
   */
  createPayrollPeriod: async (params: {
    organizationId: string;
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    initiatedBy: string;
    notes?: string;
  }): Promise<PayrollPeriod> => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert({
        organization_id: params.organizationId,
        month: params.month,
        year: params.year,
        start_date: params.startDate,
        end_date: params.endDate,
        initiated_by: params.initiatedBy,
        initiated_at: new Date().toISOString(),
        notes: params.notes,
        status: 'draft',
        total_employees: 0,
        total_gross_salary: 0,
        total_deductions: 0,
        total_net_salary: 0,
        employees_paid: 0,
        total_amount_paid: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PayrollPeriod;
  },

  /**
   * Generate salary records for a payroll period (HR only)
   * This creates salary records for all active employees based on their attendance
   */
  generatePayrollRecords: async (params: {
    payrollPeriodId: string;
    organizationId: string;
    month: number;
    year: number;
    createdBy: string;
  }): Promise<{ success: boolean; recordsCreated: number; errors: string[] }> => {
    try {
      // Get all active employees in the organization
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id, base_salary, hourly_rate, monthly_total_hours, working_days, daily_working_hours')
        .eq('organization_id', params.organizationId)
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      const errors: string[] = [];
      let recordsCreated = 0;

      // Calculate start and end dates for the month
      const startDate = new Date(params.year, params.month - 1, 1);
      const endDate = new Date(params.year, params.month, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // For each employee, calculate attendance and create salary record
      for (const employee of employees || []) {
        try {
          // Get attendance records for the month
          const { data: attendanceRecords, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('user_id', employee.id)
            .gte('date', startDateStr)
            .lte('date', endDateStr);

          if (attendanceError) {
            errors.push(`Error fetching attendance for employee ${employee.id}: ${attendanceError.message}`);
            continue;
          }

          // Calculate working metrics
          const totalHoursWorked = (attendanceRecords || []).reduce(
            (sum, record) => sum + (Number(record.total_hours) || 0),
            0
          );
          const presentDays = (attendanceRecords || []).filter(r => r.is_valid_day).length;
          const workingDaysInMonth = (attendanceRecords || []).filter(r => r.is_valid_day).length;

          // Calculate salary
          const baseSalary = Number(employee.base_salary) || 0;
          const hourlyRate = Number(employee.hourly_rate) || 0;
          const expectedHours = Number(employee.monthly_total_hours) || 0;

          // Calculate earned salary based on hours worked
          const earnedBaseSalary = expectedHours > 0
            ? (totalHoursWorked / expectedHours) * baseSalary
            : baseSalary;

          // Create salary record
          const { error: insertError } = await supabase
            .from('salary_records')
            .insert({
              user_id: employee.id,
              month: params.month,
              year: params.year,
              base_salary: earnedBaseSalary,
              allowances: 0,
              deductions: 0,
              bonus: 0,
              working_days: workingDaysInMonth,
              present_days: presentDays,
              leaves_taken: 0,
              hours_worked: totalHoursWorked,
              expected_hours: expectedHours,
              hourly_rate: hourlyRate,
              payroll_period_id: params.payrollPeriodId,
              payment_status: 'pending',
              status: 'draft',
              created_by: params.createdBy,
            });

          if (insertError) {
            // Check if record already exists
            if (insertError.code === '23505') {
              errors.push(`Salary record already exists for employee ${employee.id}`);
            } else {
              errors.push(`Error creating salary record for employee ${employee.id}: ${insertError.message}`);
            }
            continue;
          }

          recordsCreated++;
        } catch (employeeError: any) {
          errors.push(`Error processing employee ${employee.id}: ${employeeError.message}`);
        }
      }

      // Update payroll period statistics
      await updatePayrollPeriodStats(params.payrollPeriodId);

      return {
        success: recordsCreated > 0,
        recordsCreated,
        errors,
      };
    } catch (error: any) {
      throw new Error(`Failed to generate payroll records: ${error.message}`);
    }
  },

  /**
   * Update payroll period status (HR only)
   */
  updatePayrollPeriodStatus: async (
    periodId: string,
    status: PayrollPeriodStatus,
    userId: string
  ): Promise<PayrollPeriod> => {
    const updates: any = { status };

    if (status === 'approved') {
      updates.approved_by = userId;
      updates.approved_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_by = userId;
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('payroll_periods')
      .update(updates)
      .eq('id', periodId)
      .select()
      .single();

    if (error) throw error;
    return data as PayrollPeriod;
  },

  /**
   * Mark salary as paid (HR only)
   */
  markSalaryAsPaid: async (params: {
    salaryRecordId: string;
    paymentMethod: PaymentMode;
    paymentReference?: string;
    paidBy: string;
    notes?: string;
  }): Promise<PayrollSalaryRecord> => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('salary_records')
      .update({
        payment_status: 'paid',
        payment_mode: params.paymentMethod,
        payment_reference: params.paymentReference,
        paid_by: params.paidBy,
        paid_at: now,
        payment_notes: params.notes,
        status: 'paid', // Also update old status field for compatibility
        payment_date: now.split('T')[0],
      })
      .eq('id', params.salaryRecordId)
      .select()
      .single();

    if (error) throw error;

    // Get the payroll period ID to update stats
    if (data.payroll_period_id) {
      await updatePayrollPeriodStats(data.payroll_period_id);
    }

    return data as PayrollSalaryRecord;
  },

  /**
   * Bulk mark salaries as paid (HR only)
   */
  bulkMarkSalariesPaid: async (params: {
    salaryRecordIds: string[];
    payrollPeriodId: string;
    paymentMethod: PaymentMode;
    paidBy: string;
    batchName: string;
    notes?: string;
  }): Promise<{
    success: number;
    failed: number;
    batchId: string;
    errors: Array<{ recordId: string; error: string }>;
  }> => {
    const now = new Date().toISOString();
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    // Create bulk payment batch
    const { data: batch, error: batchError } = await supabase
      .from('bulk_payment_batches')
      .insert({
        payroll_period_id: params.payrollPeriodId,
        batch_name: params.batchName,
        total_employees: params.salaryRecordIds.length,
        total_amount: 0, // Will be updated after processing
        status: 'processing',
        initiated_by: params.paidBy,
        started_at: now,
        notes: params.notes,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    let totalAmount = 0;

    // Process each salary record
    for (const recordId of params.salaryRecordIds) {
      try {
        const { data, error } = await supabase
          .from('salary_records')
          .update({
            payment_status: 'paid',
            payment_mode: params.paymentMethod,
            paid_by: params.paidBy,
            paid_at: now,
            payment_notes: params.notes,
            status: 'paid',
            payment_date: now.split('T')[0],
          })
          .eq('id', recordId)
          .select('total_salary')
          .single();

        if (error) {
          failedCount++;
          errors.push({ recordId, error: error.message });
        } else {
          successCount++;
          totalAmount += Number(data.total_salary) || 0;
        }
      } catch (error: any) {
        failedCount++;
        errors.push({ recordId, error: error.message });
      }
    }

    // Update batch status
    const batchStatus: any =
      successCount === params.salaryRecordIds.length
        ? 'completed'
        : successCount > 0
        ? 'partially_completed'
        : 'failed';

    await supabase
      .from('bulk_payment_batches')
      .update({
        status: batchStatus,
        processed_count: successCount + failedCount,
        success_count: successCount,
        failed_count: failedCount,
        total_amount: totalAmount,
        completed_at: new Date().toISOString(),
        error_log: errors,
      })
      .eq('id', batch.id);

    // Update payroll period stats
    await updatePayrollPeriodStats(params.payrollPeriodId);

    return {
      success: successCount,
      failed: failedCount,
      batchId: batch.id,
      errors,
    };
  },

  /**
   * Update salary record details (HR only)
   */
  updateSalaryRecord: async (
    recordId: string,
    updates: Partial<{
      base_salary: number;
      allowances: number;
      deductions: number;
      bonus: number;
      notes: string;
    }>
  ): Promise<PayrollSalaryRecord> => {
    const { data, error } = await supabase
      .from('salary_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;

    // Update payroll period stats if linked
    if (data.payroll_period_id) {
      await updatePayrollPeriodStats(data.payroll_period_id);
    }

    return data as PayrollSalaryRecord;
  },

  /**
   * Revert payment (HR only)
   */
  revertPayment: async (params: {
    salaryRecordId: string;
    reason: string;
    revertedBy: string;
  }): Promise<PayrollSalaryRecord> => {
    const { data, error } = await supabase
      .from('salary_records')
      .update({
        payment_status: 'pending',
        payment_mode: null,
        payment_reference: null,
        paid_by: null,
        paid_at: null,
        payment_notes: `Payment reverted: ${params.reason}`,
        status: 'approved', // Revert to approved status
      })
      .eq('id', params.salaryRecordId)
      .select()
      .single();

    if (error) throw error;

    // Update payroll period stats if linked
    if (data.payroll_period_id) {
      await updatePayrollPeriodStats(data.payroll_period_id);
    }

    return data as PayrollSalaryRecord;
  },

  /**
   * Create payment transaction (HR only)
   */
  createPaymentTransaction: async (params: {
    salaryRecordId: string;
    payrollPeriodId: string;
    amount: number;
    paymentMethod: PaymentMode;
    referenceNumber?: string;
    bankName?: string;
    accountNumber?: string;
    processedBy: string;
    notes?: string;
  }): Promise<PaymentTransaction> => {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        salary_record_id: params.salaryRecordId,
        payroll_period_id: params.payrollPeriodId,
        amount: params.amount,
        payment_method: params.paymentMethod,
        reference_number: params.referenceNumber,
        bank_name: params.bankName,
        account_number: params.accountNumber,
        transaction_date: new Date().toISOString(),
        processed_by: params.processedBy,
        notes: params.notes,
        status: 'completed',
      })
      .select()
      .single();

    if (error) throw error;
    return data as PaymentTransaction;
  },

  /**
   * Delete payroll period (HR only)
   * Only allowed for draft periods
   */
  deletePayrollPeriod: async (periodId: string): Promise<void> => {
    const { error } = await supabase
      .from('payroll_periods')
      .delete()
      .eq('id', periodId)
      .eq('status', 'draft'); // Only allow deletion of draft periods

    if (error) throw error;
  },
};

/**
 * Helper function to update payroll period statistics
 */
async function updatePayrollPeriodStats(payrollPeriodId: string): Promise<void> {
  const { data: records, error } = await supabase
    .from('salary_records')
    .select('*')
    .eq('payroll_period_id', payrollPeriodId);

  if (error) throw error;

  const stats = {
    total_employees: records?.length || 0,
    total_gross_salary: records?.reduce(
      (sum, r) => sum + (Number(r.base_salary) + Number(r.allowances || 0) + Number(r.bonus || 0)),
      0
    ) || 0,
    total_deductions: records?.reduce((sum, r) => sum + Number(r.deductions || 0), 0) || 0,
    total_net_salary: records?.reduce((sum, r) => sum + Number(r.total_salary || 0), 0) || 0,
    employees_paid: records?.filter(r => r.payment_status === 'paid').length || 0,
    total_amount_paid: records
      ?.filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + Number(r.total_salary || 0), 0) || 0,
  };

  await supabase
    .from('payroll_periods')
    .update(stats)
    .eq('id', payrollPeriodId);
}
