import { supabase } from '@/lib/supabase/client';
import { EmployeeMonthlyEarnings } from '@/lib/types';

export const earningsQueries = {
  /**
   * Get current month earnings for a user
   */
  getCurrentMonthEarnings: async (userId: string): Promise<EmployeeMonthlyEarnings | null> => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed for database
    const year = now.getFullYear();

    const { data, error } = await supabase
      .from('employee_monthly_earnings')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get earnings by month and year
   */
  getEarningsByMonth: async (
    userId: string,
    month: number, // 1-indexed
    year: number
  ): Promise<EmployeeMonthlyEarnings | null> => {
    const { data, error } = await supabase
      .from('employee_monthly_earnings')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get all earnings for a user
   */
  getAllUserEarnings: async (userId: string): Promise<EmployeeMonthlyEarnings[]> => {
    const { data, error } = await supabase
      .from('employee_monthly_earnings')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // HR queries
  /**
   * Get current month earnings for all employees (HR only)
   */
  getAllCurrentMonthEarnings: async (organizationId?: string): Promise<EmployeeMonthlyEarnings[]> => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (organizationId) {
      // First, get currently employed users for this organization
      const { data: employmentData, error: employmentError } = await supabase
        .from('employer_employee_history')
        .select('employee_id')
        .eq('organization_id', organizationId)
        .is('left_at', null);

      if (employmentError) throw employmentError;

      const employeeIds = (employmentData || []).map(e => e.employee_id);

      // If no employees, return empty array
      if (employeeIds.length === 0) return [];

      // Query earnings for these employees
      const { data, error } = await supabase
        .from('employee_monthly_earnings')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .in('user_id', employeeIds)
        .order('earned_salary', { ascending: false });

      if (error) throw error;
      return data || [];
    }

    // If no organizationId, return all earnings
    const { data, error } = await supabase
      .from('employee_monthly_earnings')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('earned_salary', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get earnings for a specific month for all employees (HR only)
   */
  getAllEarningsByMonth: async (
    month: number,
    year: number
  ): Promise<EmployeeMonthlyEarnings[]> => {
    const { data, error } = await supabase
      .from('employee_monthly_earnings')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('earned_salary', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get earnings statistics for HR dashboard
   */
  getEarningsStats: async (month: number, year: number) => {
    const { data, error } = await supabase
      .from('employee_monthly_earnings')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (error) throw error;

    const earnings = data || [];
    const totalEarned = earnings.reduce((sum, e) => sum + (e.earned_salary || 0), 0);
    const totalHoursWorked = earnings.reduce((sum, e) => sum + (e.total_hours_worked || 0), 0);
    const totalExpectedHours = earnings.reduce((sum, e) => sum + (e.expected_hours || 0), 0);

    return {
      totalEmployees: earnings.length,
      totalEarned,
      totalHoursWorked,
      totalExpectedHours,
      avgHoursWorked: earnings.length > 0 ? totalHoursWorked / earnings.length : 0,
      avgEarned: earnings.length > 0 ? totalEarned / earnings.length : 0,
    };
  },
};
