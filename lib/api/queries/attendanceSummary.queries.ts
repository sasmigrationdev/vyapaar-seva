import { supabase } from '@/lib/supabase/client';
import { AttendancePeriodSummary, OrganizationAttendanceSummary, YearFilter, MonthFilter } from '@/lib/types';

/**
 * Get date range for a given year/month filter
 */
const getDateRange = (year: YearFilter, month: MonthFilter): { startDate: string; endDate: string } | null => {
  if (year === 'all') {
    // For all years, we don't filter by date range
    return null;
  }

  if (month === 'all') {
    // Full year
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];
    return { startDate, endDate };
  }

  // Specific month
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { startDate, endDate };
};

/**
 * Calculate expected working days for a period based on user's working_days configuration
 */
const calculateExpectedWorkingDays = (
  workingDays: string[] | null,
  startDate: string,
  endDate: string
): number => {
  if (!workingDays || workingDays.length === 0) {
    // Default to Monday-Saturday (6 days)
    workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  }

  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const workingDayNumbers = workingDays.map(day => dayMap[day.toLowerCase()]);

  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (workingDayNumbers.includes(d.getDay())) {
      count++;
    }
  }

  return count;
};

export const attendanceSummaryQueries = {
  /**
   * Get comprehensive attendance summary for an employee
   */
  getUserPeriodSummary: async (params: {
    userId: string;
    year: YearFilter;
    month: MonthFilter;
  }): Promise<AttendancePeriodSummary> => {
    const { userId, year, month } = params;
    const dateRange = getDateRange(year, month);

    // Get user's working days configuration
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('working_days, daily_working_hours')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') throw userError;

    // Build attendance query
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('total_hours, overtime_hours, is_valid_day, date')
      .eq('user_id', userId);

    if (dateRange) {
      attendanceQuery = attendanceQuery
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);
    }

    // Build leaves query
    let leavesQuery = supabase
      .from('leave_requests')
      .select('start_date, end_date, leave_type')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (dateRange) {
      // Check for leaves that overlap with the date range
      leavesQuery = leavesQuery
        .lte('start_date', dateRange.endDate)
        .gte('end_date', dateRange.startDate);
    }

    // Build overtime query
    let overtimeQuery = supabase
      .from('overtime_requests')
      .select('approved_hours, request_date')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (dateRange) {
      overtimeQuery = overtimeQuery
        .gte('request_date', dateRange.startDate)
        .lte('request_date', dateRange.endDate);
    }

    // Execute all queries in parallel
    const [attendanceResult, leavesResult, overtimeResult] = await Promise.all([
      attendanceQuery,
      leavesQuery,
      overtimeQuery,
    ]);

    if (attendanceResult.error) throw attendanceResult.error;
    if (leavesResult.error) throw leavesResult.error;
    if (overtimeResult.error) throw overtimeResult.error;

    const attendanceRecords = attendanceResult.data || [];
    const leaveRequests = leavesResult.data || [];
    const overtimeRequests = overtimeResult.data || [];

    // Calculate total working hours (excluding overtime that's already counted in total_hours)
    const totalWorkingHours = attendanceRecords.reduce(
      (sum, r) => sum + ((r.total_hours || 0) - (r.overtime_hours || 0)),
      0
    );

    // Calculate days attended
    const daysAttended = attendanceRecords.filter(r => r.is_valid_day).length;

    // Calculate approved leave days
    let approvedLeaveDays = 0;
    for (const leave of leaveRequests) {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      approvedLeaveDays += diffDays;
    }

    // Calculate approved overtime hours
    const approvedOvertimeHours = overtimeRequests.reduce(
      (sum, r) => sum + (r.approved_hours || 0),
      0
    );

    // Calculate expected working days
    let expectedWorkingDays = 0;
    if (dateRange) {
      expectedWorkingDays = calculateExpectedWorkingDays(
        userData?.working_days || null,
        dateRange.startDate,
        dateRange.endDate
      );
    } else {
      // For "all years", calculate based on actual attendance date range
      if (attendanceRecords.length > 0) {
        const dates = attendanceRecords.map(r => r.date).sort();
        expectedWorkingDays = calculateExpectedWorkingDays(
          userData?.working_days || null,
          dates[0],
          dates[dates.length - 1]
        );
      }
    }

    // Calculate absent days (expected - attended - leaves)
    const absentDays = Math.max(0, expectedWorkingDays - daysAttended - approvedLeaveDays);

    // Calculate attendance percentage
    const attendancePercentage = expectedWorkingDays > 0
      ? Math.round((daysAttended / expectedWorkingDays) * 100)
      : 0;

    return {
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      expectedWorkingDays,
      daysAttended,
      approvedLeaveDays,
      absentDays,
      approvedOvertimeHours: Math.round(approvedOvertimeHours * 100) / 100,
      attendancePercentage,
    };
  },

  /**
   * Get organization-level attendance summary (for HR)
   */
  getOrganizationPeriodSummary: async (params: {
    organizationId: string;
    year: YearFilter;
    month: MonthFilter;
  }): Promise<OrganizationAttendanceSummary> => {
    const { organizationId, year, month } = params;
    const dateRange = getDateRange(year, month);

    // Get currently employed users for this organization
    const { data: employmentData, error: employmentError } = await supabase
      .from('employer_employee_history')
      .select('employee_id')
      .eq('organization_id', organizationId)
      .is('left_at', null);

    if (employmentError) throw employmentError;

    const employeeIds = (employmentData || []).map(e => e.employee_id);
    const employeeCount = employeeIds.length;

    if (employeeCount === 0) {
      return {
        totalWorkingHours: 0,
        expectedWorkingDays: 0,
        daysAttended: 0,
        approvedLeaveDays: 0,
        absentDays: 0,
        approvedOvertimeHours: 0,
        attendancePercentage: 0,
        employeeCount: 0,
      };
    }

    // Build attendance query
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('total_hours, overtime_hours, is_valid_day, user_id, date')
      .in('user_id', employeeIds);

    if (dateRange) {
      attendanceQuery = attendanceQuery
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);
    }

    // Build leaves query
    let leavesQuery = supabase
      .from('leave_requests')
      .select('start_date, end_date, user_id')
      .in('user_id', employeeIds)
      .eq('status', 'approved');

    if (dateRange) {
      leavesQuery = leavesQuery
        .lte('start_date', dateRange.endDate)
        .gte('end_date', dateRange.startDate);
    }

    // Build overtime query
    let overtimeQuery = supabase
      .from('overtime_requests')
      .select('approved_hours, user_id, request_date')
      .in('user_id', employeeIds)
      .eq('status', 'approved');

    if (dateRange) {
      overtimeQuery = overtimeQuery
        .gte('request_date', dateRange.startDate)
        .lte('request_date', dateRange.endDate);
    }

    // Execute all queries in parallel
    const [attendanceResult, leavesResult, overtimeResult] = await Promise.all([
      attendanceQuery,
      leavesQuery,
      overtimeQuery,
    ]);

    if (attendanceResult.error) throw attendanceResult.error;
    if (leavesResult.error) throw leavesResult.error;
    if (overtimeResult.error) throw overtimeResult.error;

    const attendanceRecords = attendanceResult.data || [];
    const leaveRequests = leavesResult.data || [];
    const overtimeRequests = overtimeResult.data || [];

    // Calculate totals
    const totalWorkingHours = attendanceRecords.reduce(
      (sum, r) => sum + ((r.total_hours || 0) - (r.overtime_hours || 0)),
      0
    );

    const daysAttended = attendanceRecords.filter(r => r.is_valid_day).length;

    let approvedLeaveDays = 0;
    for (const leave of leaveRequests) {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      approvedLeaveDays += diffDays;
    }

    const approvedOvertimeHours = overtimeRequests.reduce(
      (sum, r) => sum + (r.approved_hours || 0),
      0
    );

    // Calculate expected working days (average across all employees, assuming 6-day week)
    let expectedWorkingDays = 0;
    if (dateRange) {
      const daysInPeriod = calculateExpectedWorkingDays(
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        dateRange.startDate,
        dateRange.endDate
      );
      expectedWorkingDays = daysInPeriod * employeeCount;
    }

    const absentDays = Math.max(0, expectedWorkingDays - daysAttended - approvedLeaveDays);

    const attendancePercentage = expectedWorkingDays > 0
      ? Math.round((daysAttended / expectedWorkingDays) * 100)
      : 0;

    return {
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      expectedWorkingDays,
      daysAttended,
      approvedLeaveDays,
      absentDays,
      approvedOvertimeHours: Math.round(approvedOvertimeHours * 100) / 100,
      attendancePercentage,
      employeeCount,
    };
  },

  /**
   * Get the first attendance date for a user (to determine year range)
   */
  getFirstAttendanceDate: async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.date || null;
  },

  /**
   * Get the first attendance date for an organization (to determine year range)
   */
  getOrganizationFirstAttendanceDate: async (organizationId: string): Promise<string | null> => {
    // Get employee IDs
    const { data: employmentData, error: employmentError } = await supabase
      .from('employer_employee_history')
      .select('employee_id')
      .eq('organization_id', organizationId);

    if (employmentError) throw employmentError;

    const employeeIds = (employmentData || []).map(e => e.employee_id);
    if (employeeIds.length === 0) return null;

    const { data, error } = await supabase
      .from('attendance_records')
      .select('date')
      .in('user_id', employeeIds)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.date || null;
  },
};
