import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { attendanceQueries } from '@/lib/api/queries/attendance.queries';
import { AttendanceRecord, AttendanceWithUser } from '@/lib/types';

/**
 * Query keys for attendance-related queries
 */
export const attendanceKeys = {
  all: ['attendance'] as const,
  today: (userId: string) => [...attendanceKeys.all, 'today', userId] as const,
  byDateRange: (userId: string, startDate: string, endDate: string) =>
    [...attendanceKeys.all, 'range', userId, startDate, endDate] as const,
  monthlySummary: (userId: string, month: number, year: number) =>
    [...attendanceKeys.all, 'monthly', userId, month, year] as const,
  currentWeek: (userId: string) => [...attendanceKeys.all, 'current-week', userId] as const,
  byId: (id: string) => [...attendanceKeys.all, 'detail', id] as const,
  hrAll: (filters?: object) => [...attendanceKeys.all, 'hr', 'all', filters] as const,
  hrToday: () => [...attendanceKeys.all, 'hr', 'today'] as const,
  hrCurrentWeekAll: () => [...attendanceKeys.all, 'hr', 'current-week-all'] as const,
  hrStats: (startDate: string, endDate: string) =>
    [...attendanceKeys.all, 'hr', 'stats', startDate, endDate] as const,
};

/**
 * Hook to fetch today's attendance record
 */
export const useTodayAttendance = (
  userId: string,
  options?: Omit<UseQueryOptions<AttendanceRecord | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.today(userId),
    queryFn: () => attendanceQueries.getTodayAttendance(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch attendance records by date range
 */
export const useAttendanceByDateRange = (
  userId: string,
  startDate: string,
  endDate: string,
  options?: Omit<UseQueryOptions<AttendanceRecord[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.byDateRange(userId, startDate, endDate),
    queryFn: () => attendanceQueries.getAttendanceByDateRange(userId, startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch monthly attendance summary
 */
export const useMonthlyAttendanceSummary = (
  userId: string,
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<{
    records: AttendanceRecord[];
    totalDays: number;
    validDays: number;
    totalHours: number;
    avgHours: number;
  }>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.monthlySummary(userId, month, year),
    queryFn: () => attendanceQueries.getMonthlyAttendanceSummary(userId, month, year),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * Hook to fetch attendance by ID
 */
export const useAttendanceById = (
  recordId: string,
  options?: Omit<UseQueryOptions<AttendanceRecord | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.byId(recordId),
    queryFn: () => attendanceQueries.getAttendanceById(recordId),
    staleTime: 1000 * 60 * 5,
    enabled: !!recordId,
    ...options,
  });
};

/**
 * Hook to fetch current week attendance records
 */
export const useCurrentWeekAttendance = (
  userId: string,
  options?: Omit<UseQueryOptions<AttendanceRecord[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.currentWeek(userId),
    queryFn: () => attendanceQueries.getCurrentWeekAttendance(userId),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Always refetch when component mounts
    ...options,
  });
};

/**
 * HR: Hook to fetch current week attendance for all users
 * Returns a map of userId -> attendance count
 */
export const useCurrentWeekAttendanceForAll = (
  organizationId?: string,
  options?: Omit<UseQueryOptions<Record<string, number>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: [...attendanceKeys.hrCurrentWeekAll(), organizationId],
    queryFn: () => attendanceQueries.getCurrentWeekAttendanceForAll(organizationId),
    staleTime: 0, // Always consider data stale to prevent showing cached data
    gcTime: 0, // Don't cache data to prevent cross-org data leakage
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchInterval: 1000 * 60 * 10,
    ...options,
  });
};

/**
 * HR: Hook to fetch all attendance records
 */
export const useAllAttendanceRecords = (
  filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    date?: string;
    organizationId?: string;
  },
  options?: Omit<UseQueryOptions<AttendanceWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.hrAll(filters),
    queryFn: () => attendanceQueries.getAllAttendanceRecords(filters),
    staleTime: 1000 * 60 * 3,
    ...options,
  });
};

/**
 * HR: Hook to fetch today's attendance for all employees
 */
export const useTodayAllAttendance = (
  options?: Omit<UseQueryOptions<AttendanceWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.hrToday(),
    queryFn: () => attendanceQueries.getTodayAllAttendance(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * HR: Hook to fetch attendance statistics
 */
export const useAttendanceStats = (
  startDate: string,
  endDate: string,
  options?: Omit<UseQueryOptions<{
    totalRecords: number;
    validRecords: number;
    totalHours: number;
    avgHours: number;
    uniqueUsers: number;
  }>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceKeys.hrStats(startDate, endDate),
    queryFn: () => attendanceQueries.getAttendanceStats(startDate, endDate),
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

/**
 * HR: Hook to fetch all employees with attendance status (including absent)
 */
export const useAllEmployeesAttendance = (
  filters?: {
    startDate?: string;
    endDate?: string;
    date?: string;
    organizationId?: string;
  },
  options?: Omit<UseQueryOptions<AttendanceWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: [...attendanceKeys.all, 'hr', 'all-employees', filters],
    queryFn: () => attendanceQueries.getAllEmployeesAttendance(filters),
    staleTime: 0, // Always consider data stale to prevent showing cached data
    gcTime: 0, // Don't cache data to prevent cross-org data leakage
    refetchOnMount: 'always', // Always refetch when component mounts
    ...options,
  });
};

// Aliases for HR hooks
export const useHRTodayAttendance = useTodayAllAttendance;
export const useHRAllAttendanceRecords = useAllAttendanceRecords;
export const useHRAllEmployeesAttendance = useAllEmployeesAttendance;
