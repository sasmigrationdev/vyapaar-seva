import { supabase } from '@/lib/supabase/client';
import { SalaryHistory, SalaryHistoryWithUser } from '@/lib/types';

export const salaryHistoryQueries = {
  /**
   * Get salary history for a specific user
   */
  getSalaryHistoryByUserId: async (userId: string): Promise<SalaryHistoryWithUser[]> => {
    const { data, error } = await supabase
      .from('salary_history')
      .select(`
        *,
        user:users!salary_history_user_id_fkey(full_name, employee_id),
        changedBy:users!salary_history_changed_by_fkey(full_name)
      `)
      .eq('user_id', userId)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SalaryHistoryWithUser[];
  },

  /**
   * Get pending salary changes (effective date in the future)
   */
  getPendingSalaryChanges: async (userId: string): Promise<SalaryHistory | null> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('salary_history')
      .select('*')
      .eq('user_id', userId)
      .gt('effective_from', today)
      .order('effective_from', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get all salary history (HR only)
   */
  getAllSalaryHistory: async (filters?: {
    userId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<SalaryHistoryWithUser[]> => {
    let query = supabase
      .from('salary_history')
      .select(`
        *,
        user:users!salary_history_user_id_fkey(full_name, employee_id),
        changedBy:users!salary_history_changed_by_fkey(full_name)
      `);

    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.fromDate) query = query.gte('effective_from', filters.fromDate);
    if (filters?.toDate) query = query.lte('effective_from', filters.toDate);

    const { data, error } = await query
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SalaryHistoryWithUser[];
  },

  /**
   * Get latest salary history entry for a user
   */
  getLatestSalaryHistory: async (userId: string): Promise<SalaryHistory | null> => {
    const { data, error } = await supabase
      .from('salary_history')
      .select('*')
      .eq('user_id', userId)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
