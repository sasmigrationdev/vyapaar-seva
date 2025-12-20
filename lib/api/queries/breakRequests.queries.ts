import { supabase } from '@/lib/supabase/client';
import { BreakRequest } from '@/lib/types';

/**
 * Break Request Query Functions - Real-Time Check-in/Check-out Style
 *
 * New Flow:
 * 1. Employee requests to start break (only reason needed)
 * 2. HR approves break start
 * 3. Employee ends break when returning
 * 4. Break is marked as completed
 */

export const breakRequestQueries = {
  /**
   * Get user's active break (currently ongoing)
   */
  getActiveBreak: async (userId: string): Promise<BreakRequest | null> => {
    const { data, error } = await supabase
      .from('break_requests')
      .select(`
        *,
        user:users!break_requests_user_id_fkey(full_name, employee_id),
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get today's break for a user (all statuses)
   */
  getTodayBreaks: async (userId: string): Promise<BreakRequest[]> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('break_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('request_date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all break requests for the current user (employee view)
   */
  getMyBreakRequests: async (
    userId: string,
    filters?: {
      status?: 'pending_start' | 'active' | 'completed' | 'rejected' | 'cancelled';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<BreakRequest[]> => {
    let query = supabase
      .from('break_requests')
      .select(`
        *,
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `)
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('request_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('request_date', filters.endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get pending START approval requests (HR view)
   * Only shows breaks waiting for HR to approve the start
   */
  getPendingBreakRequests: async (organizationId?: string): Promise<BreakRequest[]> => {
    // First get all user IDs from the organization
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
        .from('break_requests')
        .select(`
          *,
          user:users!break_requests_user_id_fkey(full_name, employee_id, organization_id),
          attendance_record:attendance_records(date, check_in_time, check_out_time)
        `)
        .eq('status', 'pending_start')
        .in('user_id', userIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } else {
      const { data, error } = await supabase
        .from('break_requests')
        .select(`
          *,
          user:users!break_requests_user_id_fkey(full_name, employee_id, organization_id),
          attendance_record:attendance_records(date, check_in_time, check_out_time)
        `)
        .eq('status', 'pending_start')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  },

  /**
   * Get all active (ongoing) breaks across organization (HR view)
   */
  getAllActiveBreaks: async (organizationId?: string): Promise<BreakRequest[]> => {
    let query = supabase
      .from('break_requests')
      .select(`
        *,
        user:users!break_requests_user_id_fkey(full_name, employee_id, organization_id),
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `)
      .eq('is_active', true);

    if (organizationId) {
      const { data: orgUsers, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organizationId);

      if (userError) throw userError;

      const userIds = orgUsers?.map(u => u.id) || [];
      if (userIds.length === 0) return [];

      query = query.in('user_id', userIds);
    }

    const { data, error } = await query.order('actual_start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all break requests (HR view with filters)
   */
  getAllBreakRequests: async (filters?: {
    status?: 'pending_start' | 'active' | 'completed' | 'rejected' | 'cancelled';
    userId?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<BreakRequest[]> => {
    // First get user IDs if filtering by organization
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
      .from('break_requests')
      .select(`
        *,
        user:users!break_requests_user_id_fkey(full_name, employee_id, organization_id),
        reviewer:users!break_requests_reviewed_by_fkey(full_name),
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte('request_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('request_date', filters.endDate);
    }

    if (userIds) {
      query = query.in('user_id', userIds);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get break requests for a specific attendance record
   */
  getBreakRequestsByAttendance: async (
    attendanceRecordId: string
  ): Promise<BreakRequest[]> => {
    const { data, error } = await supabase
      .from('break_requests')
      .select('*')
      .eq('attendance_record_id', attendanceRecordId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single break request by ID
   */
  getBreakRequestById: async (id: string): Promise<BreakRequest | null> => {
    const { data, error } = await supabase
      .from('break_requests')
      .select(`
        *,
        user:users!break_requests_user_id_fkey(full_name, employee_id, phone),
        reviewer:users!break_requests_reviewed_by_fkey(full_name),
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Check if user can start a new break
   * Validates: checked in, no active break, no pending break
   */
  canStartBreak: async (
    userId: string,
    attendanceRecordId: string
  ): Promise<{ canStart: boolean; reason?: string }> => {
    // Check for active break
    const { data: activeBreak, error: activeError } = await supabase
      .from('break_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (activeError && activeError.code !== 'PGRST116') throw activeError;

    if (activeBreak) {
      return {
        canStart: false,
        reason: 'You already have an active break. Please end it first.',
      };
    }

    // Check for pending start approval
    const { data: pendingBreak, error: pendingError } = await supabase
      .from('break_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('attendance_record_id', attendanceRecordId)
      .eq('status', 'pending_start')
      .single();

    if (pendingError && pendingError.code !== 'PGRST116') throw pendingError;

    if (pendingBreak) {
      return {
        canStart: false,
        reason: 'You have a pending break request. Wait for HR approval.',
      };
    }

    // Check if checked in
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('check_in_time, check_out_time')
      .eq('id', attendanceRecordId)
      .single();

    if (attendanceError) throw attendanceError;

    if (!attendance.check_in_time) {
      return {
        canStart: false,
        reason: 'You must check in first before starting a break.',
      };
    }

    if (attendance.check_out_time) {
      return {
        canStart: false,
        reason: 'You have already checked out for the day.',
      };
    }

    return { canStart: true };
  },

  /**
   * Get break requests by month and year for a specific user
   */
  getBreaksByMonth: async (
    userId: string,
    month: number,
    year: number
  ): Promise<BreakRequest[]> => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('break_requests')
      .select(`
        *,
        user:users!break_requests_user_id_fkey(full_name, employee_id),
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `)
      .eq('user_id', userId)
      .gte('request_date', startDate)
      .lte('request_date', endDate)
      .order('request_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all breaks by month and year (HR view - all employees)
   */
  getAllBreaksByMonth: async (
    month: number,
    year: number,
    organizationId?: string
  ): Promise<BreakRequest[]> => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

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
        return [];
      }
    }

    let query = supabase
      .from('break_requests')
      .select(`
        *,
        user:users!break_requests_user_id_fkey(full_name, employee_id, organization_id),
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `)
      .gte('request_date', startDate)
      .lte('request_date', endDate);

    if (userIds) {
      query = query.in('user_id', userIds);
    }

    const { data, error } = await query.order('request_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get break requests for a specific date (HR view)
   */
  getBreaksByDate: async (date: string, organizationId?: string): Promise<BreakRequest[]> => {
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
        return [];
      }
    }

    let query = supabase
      .from('break_requests')
      .select(`
        *,
        user:users!break_requests_user_id_fkey(full_name, employee_id, organization_id),
        attendance_record:attendance_records(date, check_in_time, check_out_time)
      `)
      .eq('request_date', date);

    if (userIds) {
      query = query.in('user_id', userIds);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get break summary for a user by month
   */
  getBreakSummaryByMonth: async (
    userId: string,
    month: number,
    year: number
  ): Promise<{
    totalBreaks: number;
    completedBreaks: number;
    activeBreaks: number;
    pendingBreaks: number;
    rejectedBreaks: number;
    totalBreakMinutes: number;
  }> => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('break_requests')
      .select('*')
      .eq('user_id', userId)
      .gte('request_date', startDate)
      .lte('request_date', endDate);

    if (error) throw error;

    const completed = data?.filter((br) => br.status === 'completed') || [];
    const active = data?.filter((br) => br.status === 'active') || [];
    const pending = data?.filter((br) => br.status === 'pending_start') || [];
    const rejected = data?.filter((br) => br.status === 'rejected') || [];

    const totalBreakMinutes = completed.reduce(
      (sum, br) => sum + (br.duration_minutes || 0),
      0
    );

    return {
      totalBreaks: data?.length || 0,
      completedBreaks: completed.length,
      activeBreaks: active.length,
      pendingBreaks: pending.length,
      rejectedBreaks: rejected.length,
      totalBreakMinutes,
    };
  },
};
