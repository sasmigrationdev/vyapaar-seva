import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/types';

export const userQueries = {
  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get all users (HR/Admin only)
   */
  getAllUsers: async (filters?: {
    role?: string;
    department?: string;
    isActive?: boolean;
    organizationId?: string;
  }): Promise<User[]> => {
    // If organizationId is provided, filter by current employment relationship
    if (filters?.organizationId) {
      // First, get all currently employed users for this organization
      const { data: employmentData, error: employmentError } = await supabase
        .from('employer_employee_history')
        .select('employee_id')
        .eq('organization_id', filters.organizationId)
        .is('left_at', null);

      if (employmentError) throw employmentError;

      const employeeIds = (employmentData || []).map(e => e.employee_id);

      // If no employees found, return empty array
      if (employeeIds.length === 0) return [];

      // Now query users with these IDs
      let query = supabase
        .from('users')
        .select('*')
        .in('id', employeeIds)
        .order('full_name', { ascending: true });

      if (filters?.role) query = query.eq('role', filters.role);
      if (filters?.department) query = query.eq('department', filters.department);
      if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    // If no organizationId, use old logic
    let query = supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (filters?.role) query = query.eq('role', filters.role);
    if (filters?.department) query = query.eq('department', filters.department);
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

    const { data, error} = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get employees by department
   */
  getEmployeesByDepartment: async (department: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('department', department)
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Search users by name or employee ID
   */
  searchUsers: async (searchTerm: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%`)
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .limit(20);

    if (error) throw error;
    return data || [];
  },
};
