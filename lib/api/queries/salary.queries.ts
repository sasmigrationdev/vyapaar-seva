import { supabase } from '@/lib/supabase/client';
import { SalaryRecord, SalaryWithUser } from '@/lib/types';

export const salaryQueries = {
  /**
   * Get salary records for a user
   */
  getUserSalaryRecords: async (userId: string, limit?: number): Promise<SalaryRecord[]> => {
    let query = supabase
      .from('salary_records')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['approved', 'paid'])
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    // Add computed fields for compatibility
    const records = (data || []).map((record: any) => ({
      ...record,
      month_year: `${new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' })} ${record.year}`,
      days_worked: record.present_days,
      paid_date: record.payment_date,
    }));

    return records;
  },

  /**
   * Get latest salary record for a user
   */
  getLatestSalaryRecord: async (userId: string): Promise<SalaryRecord | null> => {
    const { data, error } = await supabase
      .from('salary_records')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['approved', 'paid'])
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return null;

    // Add computed fields for compatibility
    return {
      ...data,
      month_year: `${new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long' })} ${data.year}`,
      days_worked: data.present_days,
      paid_date: data.payment_date,
    } as any;
  },

  /**
   * Get salary record by month and year
   */
  getSalaryByMonthYear: async (
    userId: string,
    month: number,
    year: number
  ): Promise<SalaryRecord | null> => {
    const { data, error } = await supabase
      .from('salary_records')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return null;

    // Add computed fields for compatibility
    return {
      ...data,
      month_year: `${new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long' })} ${data.year}`,
      days_worked: data.present_days,
      paid_date: data.payment_date,
    } as any;
  },

  // HR queries
  /**
   * Get all salary records (HR only)
   */
  getAllSalaryRecords: async (filters?: {
    month?: number;
    year?: number;
    status?: string;
    userId?: string;
  }): Promise<SalaryWithUser[]> => {
    let query = supabase
      .from('salary_records')
      .select(`
        *,
        users!user_id(full_name, employee_id, department)
      `);

    if (filters?.month) query = query.eq('month', filters.month);
    if (filters?.year) query = query.eq('year', filters.year);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.userId) query = query.eq('user_id', filters.userId);

    const { data, error } = await query
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;

    // Add computed fields for compatibility
    const records = (data || []).map((record: any) => ({
      ...record,
      month_year: `${new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' })} ${record.year}`,
      days_worked: record.present_days,
      paid_date: record.payment_date,
    }));

    return records as SalaryWithUser[];
  },

  /**
   * Get salary record by ID (HR only)
   */
  getSalaryRecordById: async (recordId: string): Promise<SalaryWithUser | null> => {
    const { data, error } = await supabase
      .from('salary_records')
      .select(`
        *,
        users!user_id(full_name, employee_id, department, designation)
      `)
      .eq('id', recordId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return null;

    // Add computed fields for compatibility
    return {
      ...data,
      month_year: `${new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long' })} ${data.year}`,
      days_worked: data.present_days,
      paid_date: data.payment_date,
    } as SalaryWithUser;
  },

  /**
   * Get pending salary records (HR only)
   */
  getPendingSalaryRecords: async (): Promise<SalaryWithUser[]> => {
    const { data, error } = await supabase
      .from('salary_records')
      .select(`
        *,
        users!user_id(full_name, employee_id, department)
      `)
      .in('status', ['draft', 'pending'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Add computed fields for compatibility
    const records = (data || []).map((record: any) => ({
      ...record,
      month_year: `${new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' })} ${record.year}`,
      days_worked: record.present_days,
      paid_date: record.payment_date,
    }));

    return records as SalaryWithUser[];
  },

  /**
   * Get salary statistics (HR only)
   */
  getSalaryStats: async (month: number, year: number) => {
    const { data, error } = await supabase
      .from('salary_records')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (error) throw error;

    const records = data || [];
    const totalSalary = records.reduce((sum, r) => sum + (r.total_salary || 0), 0);
    const paidSalary = records
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (r.total_salary || 0), 0);
    const pendingCount = records.filter(r => r.status !== 'paid').length;

    return {
      totalRecords: records.length,
      totalSalary,
      paidSalary,
      pendingSalary: totalSalary - paidSalary,
      pendingCount,
      paidCount: records.filter(r => r.status === 'paid').length,
    };
  },
};
