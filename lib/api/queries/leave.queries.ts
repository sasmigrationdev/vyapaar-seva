import { supabase } from '@/lib/supabase/client';
import { LeaveRequest, LeaveRequestWithUser } from '@/lib/types';

export const leaveQueries = {
  /**
   * Get leave requests for a user
   */
  getUserLeaveRequests: async (userId: string): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get upcoming leave requests for a user
   */
  getUpcomingLeaves: async (userId: string): Promise<LeaveRequest[]> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .gte('end_date', today)
      .in('status', ['pending', 'approved'])
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get leave request by ID
   */
  getLeaveRequestById: async (requestId: string): Promise<LeaveRequest | null> => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get leave balance for a user (simplified - can be enhanced)
   */
  getLeaveBalance: async (userId: string, year: number) => {
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('end_date', endDate);

    if (error) throw error;

    const leaves = data || [];
    const casualLeaves = leaves
      .filter(l => l.leave_type === 'casual')
      .reduce((sum, l) => sum + (l.total_days || 0), 0);
    const sickLeaves = leaves
      .filter(l => l.leave_type === 'sick')
      .reduce((sum, l) => sum + (l.total_days || 0), 0);
    const earnedLeaves = leaves
      .filter(l => l.leave_type === 'earned')
      .reduce((sum, l) => sum + (l.total_days || 0), 0);

    // Assuming standard leave policy
    const totalCasual = 12;
    const totalSick = 12;
    const totalEarned = 15;

    return {
      casual: { used: casualLeaves, total: totalCasual, remaining: totalCasual - casualLeaves },
      sick: { used: sickLeaves, total: totalSick, remaining: totalSick - sickLeaves },
      earned: { used: earnedLeaves, total: totalEarned, remaining: totalEarned - earnedLeaves },
    };
  },

  // HR queries
  /**
   * Get all leave requests (HR only)
   */
  getAllLeaveRequests: async (filters?: {
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<LeaveRequestWithUser[]> => {
    // Get user IDs if filtering by organization
    let userIds: string[] | undefined;
    if (filters?.organizationId) {
      const { data: orgUsers, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', filters.organizationId);

      if (userError) throw userError;
      userIds = orgUsers?.map(u => u.id) || [];

      if (userIds.length === 0) {
        return [];
      }
    }

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        users!user_id(full_name, employee_id, department, organization_id)
      `);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.startDate) query = query.gte('start_date', filters.startDate);
    if (filters?.endDate) query = query.lte('end_date', filters.endDate);
    if (userIds) query = query.in('user_id', userIds);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as LeaveRequestWithUser[];
  },

  /**
   * Get pending leave requests (HR only)
   */
  getPendingLeaveRequests: async (organizationId?: string): Promise<LeaveRequestWithUser[]> => {
    // Get user IDs if filtering by organization
    if (organizationId) {
      const { data: orgUsers, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organizationId);

      if (userError) throw userError;

      const userIds = orgUsers?.map(u => u.id) || [];

      if (userIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          users!user_id(full_name, employee_id, department, organization_id)
        `)
        .eq('status', 'pending')
        .in('user_id', userIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as LeaveRequestWithUser[];
    } else {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          users!user_id(full_name, employee_id, department, organization_id)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as LeaveRequestWithUser[];
    }
  },

  /**
   * Get leave statistics (HR only)
   */
  getLeaveStats: async (startDate: string, endDate: string, organizationId?: string) => {
    // Get user IDs if filtering by organization
    let userIds: string[] | undefined;
    if (organizationId) {
      const { data: orgUsers, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organizationId);

      if (userError) throw userError;
      userIds = orgUsers?.map(u => u.id) || [];

      if (userIds.length === 0) {
        return {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          totalDays: 0,
        };
      }
    }

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        users!user_id(organization_id)
      `)
      .gte('start_date', startDate)
      .lte('end_date', endDate);

    if (userIds) {
      query = query.in('user_id', userIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    const requests = data || [];
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalDays = requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.total_days || 0), 0);

    return {
      total: requests.length,
      pending,
      approved,
      rejected,
      totalDays,
    };
  },
};
