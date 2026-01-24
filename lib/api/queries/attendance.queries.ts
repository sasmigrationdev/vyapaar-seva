import { supabase } from '@/lib/supabase/client';
import { AttendanceRecord, AttendanceWithUser } from '@/lib/types';

export const attendanceQueries = {
  /**
   * Fetch today's attendance record for a user
   */
  getTodayAttendance: async (userId: string): Promise<AttendanceRecord | null> => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Fetch attendance records for a date range
   */
  getAttendanceByDateRange: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch all attendance records for a user (no date filter)
   */
  getAllAttendanceForUser: async (userId: string): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get available years for a user's attendance records
   */
  getAvailableYears: async (userId: string): Promise<number[]> => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Extract unique years from dates
    const years = new Set<number>();
    (data || []).forEach(record => {
      const year = new Date(record.date).getFullYear();
      years.add(year);
    });

    return Array.from(years).sort((a, b) => b - a); // Sort descending
  },

  /**
   * Fetch monthly attendance summary
   */
  getMonthlyAttendanceSummary: async (userId: string, month: number, year: number) => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    return {
      records: data || [],
      totalDays: data?.length || 0,
      validDays: data?.filter(r => r.is_valid_day).length || 0,
      totalHours: data?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0,
      avgHours: data?.length 
        ? (data.reduce((sum, r) => sum + (r.total_hours || 0), 0) / data.length)
        : 0,
    };
  },

  /**
   * Get attendance record by ID
   */
  getAttendanceById: async (recordId: string): Promise<AttendanceRecord | null> => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // HR queries
  /**
   * Get all attendance records (HR only)
   */
  getAllAttendanceRecords: async (filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    date?: string;
    organizationId?: string;
  }): Promise<AttendanceWithUser[]> => {
    // If organizationId is provided, filter at database level
    if (filters?.organizationId) {
      // First, get currently employed users for this organization
      const { data: employmentData, error: employmentError } = await supabase
        .from('employer_employee_history')
        .select('employee_id')
        .eq('organization_id', filters.organizationId)
        .is('left_at', null);

      if (employmentError) throw employmentError;

      const employeeIds = (employmentData || []).map(e => e.employee_id);

      // If no employees, return empty array
      if (employeeIds.length === 0) return [];

      // Query attendance records for these employees only
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          user:users!attendance_records_user_id_fkey(full_name, employee_id, organization_id)
        `)
        .in('user_id', employeeIds);

      if (filters?.startDate) query = query.gte('date', filters.startDate);
      if (filters?.endDate) query = query.lte('date', filters.endDate);
      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.date) query = query.eq('date', filters.date);

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;

      return (data || []) as AttendanceWithUser[];
    }

    // If no organizationId, return all attendance records (fallback)
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        user:users!attendance_records_user_id_fkey(full_name, employee_id, organization_id)
      `);

    if (filters?.startDate) query = query.gte('date', filters.startDate);
    if (filters?.endDate) query = query.lte('date', filters.endDate);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.date) query = query.eq('date', filters.date);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;

    return (data || []) as AttendanceWithUser[];
  },

  /**
   * Get today's attendance for all employees (HR only)
   */
  getTodayAllAttendance: async (): Promise<AttendanceWithUser[]> => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        user:users!attendance_records_user_id_fkey(full_name, employee_id, department)
      `)
      .eq('date', todayDate)
      .order('check_in_time', { ascending: true });

    if (error) throw error;
    return (data || []) as AttendanceWithUser[];
  },

  /**
   * Get attendance statistics for a date range (HR only)
   */
  getAttendanceStats: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    const records = data || [];
    const totalRecords = records.length;
    const validRecords = records.filter(r => r.is_valid_day).length;
    const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);
    const avgHours = totalRecords > 0 ? totalHours / totalRecords : 0;

    // Get unique users who marked attendance
    const uniqueUsers = new Set(records.map(r => r.user_id));

    return {
      totalRecords,
      validRecords,
      totalHours,
      avgHours,
      uniqueUsers: uniqueUsers.size,
    };
  },

  /**
   * Get current week attendance records for a user (current month only)
   * Week starts on Monday and ends on Sunday
   * Only returns valid completed days in current month (checked out, met daily hours requirement)
   */
  getCurrentWeekAttendance: async (userId: string): Promise<AttendanceRecord[]> => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Current month boundaries
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    // Week boundaries
    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    // Use the later start date and earlier end date to get intersection
    const startDate = weekStart > monthStart ? weekStart : monthStart;
    const endDate = weekEnd < monthEnd ? weekEnd : monthEnd;

    // Get user's daily working hours requirement
    const { data: user } = await supabase
      .from('users')
      .select('daily_working_hours')
      .eq('id', userId)
      .single();

    const requiredHours = user?.daily_working_hours || 8;

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .not('check_out_time', 'is', null) // Must have checked out
      .gte('total_hours', requiredHours) // Must meet or exceed required daily hours
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get current week attendance for all users (HR only, current month only)
   * Returns a map of userId -> attendance count for the current week in current month
   * Only counts valid completed days (checked out, met daily hours requirement)
   */
  getCurrentWeekAttendanceForAll: async (organizationId?: string): Promise<Record<string, number>> => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Current month boundaries
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    // Week boundaries
    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    // Use the later start date and earlier end date to get intersection
    const startDate = weekStart > monthStart ? weekStart : monthStart;
    const endDate = weekEnd < monthEnd ? weekEnd : monthEnd;

    // Get currently employed users if organizationId is provided
    let employeeIds: string[] | undefined;
    if (organizationId) {
      const { data: employmentData, error: employmentError } = await supabase
        .from('employer_employee_history')
        .select('employee_id')
        .eq('organization_id', organizationId)
        .is('left_at', null);

      if (employmentError) throw employmentError;
      employeeIds = (employmentData || []).map(e => e.employee_id);

      // If no employees, return empty map
      if (employeeIds.length === 0) return {};
    }

    // Get attendance records joined with user's daily working hours
    let query = supabase
      .from('attendance_records')
      .select(`
        user_id,
        date,
        check_out_time,
        total_hours,
        users!inner(daily_working_hours)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .not('check_out_time', 'is', null); // Must have checked out

    // Filter by employee IDs if organization filter is applied
    if (employeeIds) {
      query = query.in('user_id', employeeIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Count valid attendance days per user (where hours >= required hours)
    const attendanceMap: Record<string, number> = {};
    (data || []).forEach((record: any) => {
      const requiredHours = record.users?.daily_working_hours || 8;
      const totalHours = Number(record.total_hours || 0);

      // Only count if employee met or exceeded their daily hour requirement
      if (totalHours >= requiredHours) {
        attendanceMap[record.user_id] = (attendanceMap[record.user_id] || 0) + 1;
      }
    });

    return attendanceMap;
  },

  /**
   * Get all employees with attendance status for a date range (HR only)
   * Shows all employees including those who didn't check in (absent)
   * Excludes HR and admin users
   */
  getAllEmployeesAttendance: async (filters?: {
    startDate?: string;
    endDate?: string;
    date?: string;
    organizationId?: string;
  }) => {
    let targetDate = filters?.date;

    if (!targetDate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      targetDate = `${year}-${month}-${day}`;
    }

    // First, get all currently employed users for this organization (excluding HR and admin)
    let employees: any[] = [];
    
    if (filters?.organizationId) {
      // Get employees through employment history (current employees only)
      const { data: employmentData, error: employmentError } = await supabase
        .from('employer_employee_history')
        .select(`
          employee_id,
          employee:users!employee_id(
            id,
            full_name,
            employee_id,
            department,
            email,
            role
          )
        `)
        .eq('organization_id', filters.organizationId)
        .is('left_at', null)
        .order('employee(full_name)', { ascending: true });

      if (employmentError) throw employmentError;

      // Extract employee data and filter out HR/admin
      employees = (employmentData || [])
        .map(e => (e as any).employee)
        .filter(e => e && e.id && e.role === 'employee'); // Only include employees, exclude HR and admin
    } else {
      // Fallback: get all active employees (when no organization filter)
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select('id, full_name, employee_id, department, email')
        .eq('role', 'employee')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (employeesError) throw employeesError;
      employees = employeesData || [];
    }

    // Then get attendance records for the date with break requests
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        break_requests:break_requests(*)
      `)
      .eq('date', targetDate);

    if (attendanceError) throw attendanceError;

    // Create a map of attendance records by user_id
    const attendanceMap = new Map(
      (attendanceRecords || []).map(record => [record.user_id, record])
    );

    // Combine employees with their attendance records
    const result = (employees || []).map(employee => {
      const attendanceRecord = attendanceMap.get(employee.id);

      if (attendanceRecord) {
        // Employee has attendance record
        return {
          ...attendanceRecord,
          user: {
            full_name: employee.full_name,
            employee_id: employee.employee_id,
            department: employee.department,
          },
          break_requests: (attendanceRecord as any).break_requests || [],
        };
      } else {
        // Employee is absent - create a placeholder record
        return {
          id: `absent-${employee.id}-${targetDate}`,
          user_id: employee.id,
          date: targetDate,
          check_in_time: null,
          check_out_time: null,
          total_hours: null,
          is_valid_day: false,
          marked_by: null,
          marked_by_role: null,
          check_in_method: null,
          notes: null,
          created_at: null,
          updated_at: null,
          user: {
            full_name: employee.full_name,
            employee_id: employee.employee_id,
            department: employee.department,
          },
        };
      }
    });

    return result as AttendanceWithUser[];
  },
};
