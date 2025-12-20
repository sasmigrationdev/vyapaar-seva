import { supabase } from '@/lib/supabase/client';
import { WeekDay } from '@/lib/types';

export const salaryHistoryMutations = {
  /**
   * Update employee salary using the database function
   * This creates a salary history entry and optionally applies the change immediately
   */
  updateEmployeeSalary: async (params: {
    userId: string;
    newBaseSalary: number;
    newWorkingDays: WeekDay[];
    newDailyHours: number;
    changedBy: string;
    changeReason?: string;
    notes?: string;
    effectiveFrom?: string; // If not provided, defaults to first day of next month
  }) => {
    const { data, error } = await supabase.rpc('update_employee_salary', {
      p_user_id: params.userId,
      p_new_base_salary: params.newBaseSalary,
      p_new_working_days: params.newWorkingDays,
      p_new_daily_hours: params.newDailyHours,
      p_changed_by: params.changedBy,
      p_change_reason: params.changeReason,
      p_notes: params.notes,
      p_effective_from: params.effectiveFrom,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Apply all pending salary changes
   * This is typically called by a cron job or manually by admin
   */
  applyPendingSalaryChanges: async () => {
    const { data, error } = await supabase.rpc('apply_pending_salary_changes');

    if (error) throw error;
    return data;
  },

  /**
   * Delete a salary history entry (HR only)
   * Only allowed if the change hasn't been applied yet
   */
  deleteSalaryHistory: async (historyId: string) => {
    const { error } = await supabase
      .from('salary_history')
      .delete()
      .eq('id', historyId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Update salary history entry notes
   */
  updateSalaryHistoryNotes: async (historyId: string, notes: string) => {
    const { data, error } = await supabase
      .from('salary_history')
      .update({ notes })
      .eq('id', historyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
