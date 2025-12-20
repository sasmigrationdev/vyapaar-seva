import { supabase } from '@/lib/supabase/client';
import { Organization, User } from '@/lib/types';

export const organizationQueries = {
  /**
   * Get organization by ID
   */
  getOrganizationById: async (organizationId: string): Promise<Organization | null> => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get current user's organization
   */
  getCurrentUserOrganization: async (): Promise<Organization | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;
    if (!userData?.organization_id) return null;

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organization_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get all employees in an organization
   */
  getOrganizationEmployees: async (
    organizationId: string,
    filters?: {
      role?: string;
      department?: string;
      isActive?: boolean;
    }
  ): Promise<User[]> => {
    let query = supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true });

    if (filters?.role) query = query.eq('role', filters.role);
    if (filters?.department) query = query.eq('department', filters.department);
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get organization statistics
   */
  getOrganizationStats: async (organizationId: string) => {
    // Get total employees
    const { data: employees, error: empError } = await supabase
      .from('users')
      .select('id, role, is_active')
      .eq('organization_id', organizationId);

    if (empError) throw empError;

    const totalEmployees = employees?.length || 0;
    const activeEmployees = employees?.filter(e => e.is_active).length || 0;
    const hrCount = employees?.filter(e => e.role === 'hr' || e.role === 'admin').length || 0;
    const employeeCount = employees?.filter(e => e.role === 'employee').length || 0;

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttendance, error: attError } = await supabase
      .from('attendance_records')
      .select('id, user_id')
      .eq('date', today)
      .in('user_id', employees?.map(e => e.id) || []);

    if (attError) throw attError;

    const presentToday = todayAttendance?.length || 0;

    // Get pending leave requests
    const { data: pendingLeaves, error: leaveError } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('status', 'pending')
      .in('user_id', employees?.map(e => e.id) || []);

    if (leaveError) throw leaveError;

    return {
      totalEmployees,
      activeEmployees,
      hrCount,
      employeeCount,
      presentToday,
      absentToday: activeEmployees - presentToday,
      pendingLeaveRequests: pendingLeaves?.length || 0,
    };
  },

  /**
   * Get departments in an organization
   */
  getOrganizationDepartments: async (organizationId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('department')
      .eq('organization_id', organizationId)
      .not('department', 'is', null);

    if (error) throw error;

    // Get unique departments
    const departments = [...new Set(data?.map(u => u.department).filter(Boolean))];
    return departments as string[];
  },

  /**
   * Get HR/Owner user ID for an organization
   * Used to notify HR when employees submit requests
   */
  getOrganizationHR: async (organizationId: string): Promise<string | null> => {
    // Validate organizationId
    if (!organizationId || typeof organizationId !== 'string') {
      return null;
    }

    // Get the organization owner
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (orgError && orgError.code !== 'PGRST116') throw orgError;

    return org?.owner_id || null;
  },

  /**
   * Get next employee ID for organization
   */
  getNextEmployeeId: async (organizationId: string): Promise<string> => {
    const { data, error } = await supabase
      .from('users')
      .select('employee_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    // If no employees exist, start with EMP001
    if (!data || data.length === 0) {
      return 'EMP001';
    }

    // Extract number from last employee ID and increment
    const lastEmployeeId = data[0].employee_id || 'EMP000';
    const match = lastEmployeeId.match(/(\d+)$/);

    if (match) {
      const lastNumber = parseInt(match[1], 10);
      const nextNumber = lastNumber + 1;
      return `EMP${nextNumber.toString().padStart(3, '0')}`;
    }

    // Fallback if no number found
    return 'EMP001';
  },
};
