import { supabase } from '@/lib/supabase/client';
import { SalaryStatus } from '@/lib/types';

export const salaryMutations = {
  /**
   * Create salary record (HR only)
   */
  createSalaryRecord: async (params: {
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
    createdBy: string;
    notes?: string;
  }) => {
    const { data, error } = await supabase
      .from('salary_records')
      .insert({
        user_id: params.userId,
        month: params.month,
        year: params.year,
        base_salary: params.baseSalary,
        allowances: params.allowances || 0,
        deductions: params.deductions || 0,
        bonus: params.bonus || 0,
        working_days: params.workingDays,
        present_days: params.presentDays,
        leaves_taken: params.leavesTaken || 0,
        created_by: params.createdBy,
        notes: params.notes,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update salary record (HR only)
   */
  updateSalaryRecord: async (
    recordId: string,
    updates: Partial<{
      base_salary: number;
      allowances: number;
      deductions: number;
      bonus: number;
      working_days: number;
      present_days: number;
      leaves_taken: number;
      notes: string;
    }>
  ) => {
    const { data, error } = await supabase
      .from('salary_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update salary status (HR only)
   */
  updateSalaryStatus: async (
    recordId: string,
    status: SalaryStatus,
    approvedBy?: string
  ) => {
    const updates: any = { status };
    
    if (status === 'approved' || status === 'paid') {
      updates.approved_by = approvedBy;
    }
    
    if (status === 'paid') {
      updates.payment_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('salary_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete salary record (HR only)
   */
  deleteSalaryRecord: async (recordId: string) => {
    const { error } = await supabase
      .from('salary_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;
  },
};
