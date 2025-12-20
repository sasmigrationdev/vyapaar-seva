import { supabase } from '@/lib/supabase/client';
import { OvertimeRequest, OvertimeRequestStatus, OvertimeRequestWithUser } from '@/lib/types';

export const overtimeRequestQueries = {
  /**
   * Get overtime request by attendance record ID
   */
  getByAttendanceRecordId: async (attendanceRecordId: string): Promise<OvertimeRequestWithUser | null> => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .select(`
        *,
        user:users!overtime_requests_user_id_fkey(full_name, employee_id, organization_id),
        attendance_record:attendance_records!overtime_requests_attendance_record_id_fkey(date, check_in_time, check_out_time, total_hours)
      `)
      .eq('attendance_record_id', attendanceRecordId)
      .maybeSingle();

    if (error) throw error;
    return data as OvertimeRequestWithUser | null;
  },

  /**
   * Get user's overtime requests
   */
  getMyOvertimeRequests: async (
    userId: string,
    filters?: {
      status?: OvertimeRequestStatus;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<OvertimeRequestWithUser[]> => {
    let query = supabase
      .from('overtime_requests')
      .select(`
        *,
        attendance_record:attendance_records!overtime_requests_attendance_record_id_fkey(date, check_in_time, check_out_time, total_hours)
      `)
      .eq('user_id', userId);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.startDate) query = query.gte('request_date', filters.startDate);
    if (filters?.endDate) query = query.lte('request_date', filters.endDate);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as OvertimeRequestWithUser[];
  },

  /**
   * Get pending overtime requests (HR view)
   */
  getPendingOvertimeRequests: async (organizationId: string): Promise<OvertimeRequestWithUser[]> => {
    if (!organizationId) return [];

    // First get user IDs from organization
    const { data: orgUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId);

    if (userError) throw userError;
    const userIds = orgUsers?.map(u => u.id) || [];
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from('overtime_requests')
      .select(`
        *,
        user:users!overtime_requests_user_id_fkey(full_name, employee_id, organization_id),
        attendance_record:attendance_records!overtime_requests_attendance_record_id_fkey(date, check_in_time, check_out_time, total_hours)
      `)
      .eq('status', 'pending')
      .in('user_id', userIds)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as OvertimeRequestWithUser[];
  },

  /**
   * Get all overtime requests (HR view with filters)
   */
  getAllOvertimeRequests: async (filters?: {
    status?: OvertimeRequestStatus;
    userId?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }): Promise<OvertimeRequestWithUser[]> => {
    // Get user IDs if filtering by organization
    let userIds: string[] | undefined;
    if (filters?.organizationId) {
      const { data: orgUsers, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', filters.organizationId);

      if (userError) throw userError;
      userIds = orgUsers?.map(u => u.id) || [];
      if (userIds.length === 0) return [];
    }

    let query = supabase
      .from('overtime_requests')
      .select(`
        *,
        user:users!overtime_requests_user_id_fkey(full_name, employee_id, organization_id),
        reviewer:users!overtime_requests_reviewed_by_fkey(full_name),
        attendance_record:attendance_records!overtime_requests_attendance_record_id_fkey(date, check_in_time, check_out_time, total_hours)
      `);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.startDate) query = query.gte('request_date', filters.startDate);
    if (filters?.endDate) query = query.lte('request_date', filters.endDate);
    if (userIds) query = query.in('user_id', userIds);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as OvertimeRequestWithUser[];
  },

  /**
   * Get overtime request by ID
   */
  getOvertimeRequestById: async (id: string): Promise<OvertimeRequestWithUser | null> => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .select(`
        *,
        user:users!overtime_requests_user_id_fkey(full_name, employee_id, organization_id),
        reviewer:users!overtime_requests_reviewed_by_fkey(full_name),
        attendance_record:attendance_records!overtime_requests_attendance_record_id_fkey(date, check_in_time, check_out_time, total_hours)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as OvertimeRequestWithUser | null;
  },

  /**
   * Get pending overtime count for HR badge
   */
  getPendingOvertimeCount: async (organizationId: string): Promise<number> => {
    if (!organizationId) return 0;

    const { data: orgUsers } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId);

    const userIds = orgUsers?.map(u => u.id) || [];
    if (userIds.length === 0) return 0;

    const { count, error } = await supabase
      .from('overtime_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('user_id', userIds);

    if (error) throw error;
    return count || 0;
  },
};
