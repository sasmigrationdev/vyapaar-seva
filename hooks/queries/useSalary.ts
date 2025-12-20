import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { salaryQueries } from '@/lib/api/queries/salary.queries';
import { SalaryRecord, SalaryWithUser } from '@/lib/types';

/**
 * Query keys for salary-related queries
 */
export const salaryKeys = {
  all: ['salary'] as const,
  list: (userId: string, limit?: number) => [...salaryKeys.all, 'list', userId, limit] as const,
  latest: (userId: string) => [...salaryKeys.all, 'latest', userId] as const,
  byMonthYear: (userId: string, month: number, year: number) =>
    [...salaryKeys.all, 'month', userId, month, year] as const,
  byId: (id: string) => [...salaryKeys.all, 'detail', id] as const,
  hrAll: (filters?: object) => [...salaryKeys.all, 'hr', 'all', filters] as const,
  hrPending: () => [...salaryKeys.all, 'hr', 'pending'] as const,
  hrStats: (month: number, year: number) => [...salaryKeys.all, 'hr', 'stats', month, year] as const,
};

/**
 * Hook to get user salary records
 */
export const useUserSalaryRecords = (
  userId: string,
  limit?: number,
  options?: Omit<UseQueryOptions<SalaryRecord[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: salaryKeys.list(userId, limit),
    queryFn: () => salaryQueries.getUserSalaryRecords(userId, limit),
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

/**
 * Hook to get latest salary record
 */
export const useLatestSalaryRecord = (
  userId: string,
  options?: Omit<UseQueryOptions<SalaryRecord | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: salaryKeys.latest(userId),
    queryFn: () => salaryQueries.getLatestSalaryRecord(userId),
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

/**
 * Hook to get salary by month and year
 */
export const useSalaryByMonthYear = (
  userId: string,
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<SalaryRecord | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: salaryKeys.byMonthYear(userId, month, year),
    queryFn: () => salaryQueries.getSalaryByMonthYear(userId, month, year),
    staleTime: 1000 * 60 * 15,
    ...options,
  });
};

/**
 * HR: Hook to get all salary records
 */
export const useAllSalaryRecords = (
  filters?: {
    month?: number;
    year?: number;
    status?: string;
    userId?: string;
  },
  options?: Omit<UseQueryOptions<SalaryWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: salaryKeys.hrAll(filters),
    queryFn: () => salaryQueries.getAllSalaryRecords(filters),
    staleTime: 0, // Always refetch on invalidation
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * HR: Hook to get salary record by ID
 */
export const useSalaryRecordById = (
  recordId: string,
  options?: Omit<UseQueryOptions<SalaryWithUser | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: salaryKeys.byId(recordId),
    queryFn: () => salaryQueries.getSalaryRecordById(recordId),
    staleTime: 1000 * 60 * 10,
    enabled: !!recordId,
    ...options,
  });
};

/**
 * HR: Hook to get pending salary records
 */
export const usePendingSalaryRecords = (
  options?: Omit<UseQueryOptions<SalaryWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: salaryKeys.hrPending(),
    queryFn: () => salaryQueries.getPendingSalaryRecords(),
    staleTime: 1000 * 60 * 3,
    ...options,
  });
};

/**
 * HR: Hook to get salary statistics
 */
export const useSalaryStats = (
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<{
    totalRecords: number;
    totalSalary: number;
    paidSalary: number;
    pendingSalary: number;
    pendingCount: number;
    paidCount: number;
  }>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: salaryKeys.hrStats(month, year),
    queryFn: () => salaryQueries.getSalaryStats(month, year),
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

// Aliases for consistency
export const useSalaryRecords = useUserSalaryRecords;
export const useLatestSalary = useLatestSalaryRecord;
export const useHRAllSalaries = useAllSalaryRecords;
export const useHRPendingSalaries = usePendingSalaryRecords;
