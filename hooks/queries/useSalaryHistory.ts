import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { salaryHistoryQueries } from '@/lib/api/queries/salaryHistory.queries';
import { SalaryHistory, SalaryHistoryWithUser } from '@/lib/types';

/**
 * Query keys for salary history-related queries
 */
export const salaryHistoryKeys = {
  all: ['salaryHistory'] as const,
  byUser: (userId: string) => [...salaryHistoryKeys.all, 'user', userId] as const,
  pending: (userId: string) => [...salaryHistoryKeys.all, 'pending', userId] as const,
  latest: (userId: string) => [...salaryHistoryKeys.all, 'latest', userId] as const,
  hrAll: (filters?: object) => [...salaryHistoryKeys.all, 'hr', filters] as const,
};

/**
 * Hook to fetch salary history for a specific user
 */
export const useSalaryHistoryByUserId = (
  userId: string,
  options?: UseQueryOptions<SalaryHistoryWithUser[]>
) => {
  return useQuery({
    queryKey: salaryHistoryKeys.byUser(userId),
    queryFn: () => salaryHistoryQueries.getSalaryHistoryByUserId(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch pending salary changes for a user
 */
export const usePendingSalaryChanges = (
  userId: string,
  options?: UseQueryOptions<SalaryHistory | null>
) => {
  return useQuery({
    queryKey: salaryHistoryKeys.pending(userId),
    queryFn: () => salaryHistoryQueries.getPendingSalaryChanges(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch latest salary history entry for a user
 */
export const useLatestSalaryHistory = (
  userId: string,
  options?: UseQueryOptions<SalaryHistory | null>
) => {
  return useQuery({
    queryKey: salaryHistoryKeys.latest(userId),
    queryFn: () => salaryHistoryQueries.getLatestSalaryHistory(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * HR: Hook to fetch all salary history with optional filters
 */
export const useAllSalaryHistory = (
  filters?: {
    userId?: string;
    fromDate?: string;
    toDate?: string;
  },
  options?: UseQueryOptions<SalaryHistoryWithUser[]>
) => {
  return useQuery({
    queryKey: salaryHistoryKeys.hrAll(filters),
    queryFn: () => salaryHistoryQueries.getAllSalaryHistory(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};
