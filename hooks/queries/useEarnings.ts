import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { earningsQueries } from '@/lib/api/queries/earnings.queries';
import { EmployeeMonthlyEarnings } from '@/lib/types';

export const earningsKeys = {
  all: ['earnings'] as const,
  currentMonth: (userId: string) => [...earningsKeys.all, 'current', userId] as const,
  byMonth: (userId: string, month: number, year: number) =>
    [...earningsKeys.all, 'month', userId, month, year] as const,
  allUser: (userId: string) => [...earningsKeys.all, 'user', userId] as const,
  hrAll: () => [...earningsKeys.all, 'hr', 'all'] as const,
  hrByMonth: (month: number, year: number) => [...earningsKeys.all, 'hr', month, year] as const,
  hrStats: (month: number, year: number) => [...earningsKeys.all, 'hr', 'stats', month, year] as const,
};

/**
 * Get current month earnings for a user
 */
export const useCurrentMonthEarnings = (
  userId: string,
  options?: UseQueryOptions<EmployeeMonthlyEarnings | null>
) => {
  return useQuery({
    queryKey: earningsKeys.currentMonth(userId),
    queryFn: () => earningsQueries.getCurrentMonthEarnings(userId),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Always refetch when component mounts
    ...options,
  });
};

/**
 * Get earnings by specific month and year
 */
export const useEarningsByMonth = (
  userId: string,
  month: number,
  year: number,
  options?: UseQueryOptions<EmployeeMonthlyEarnings | null>
) => {
  return useQuery({
    queryKey: earningsKeys.byMonth(userId, month, year),
    queryFn: () => earningsQueries.getEarningsByMonth(userId, month, year),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * Get all earnings history for a user
 */
export const useAllUserEarnings = (
  userId: string,
  options?: UseQueryOptions<EmployeeMonthlyEarnings[]>
) => {
  return useQuery({
    queryKey: earningsKeys.allUser(userId),
    queryFn: () => earningsQueries.getAllUserEarnings(userId),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * HR: Get all current month earnings
 */
export const useAllCurrentMonthEarnings = (
  organizationId?: string,
  options?: UseQueryOptions<EmployeeMonthlyEarnings[]>
) => {
  return useQuery({
    queryKey: [...earningsKeys.hrAll(), organizationId],
    queryFn: () => earningsQueries.getAllCurrentMonthEarnings(organizationId),
    staleTime: 0, // Always consider data stale to prevent showing cached data
    gcTime: 0, // Don't cache data to prevent cross-org data leakage
    refetchOnMount: 'always', // Always refetch when component mounts
    ...options,
  });
};

/**
 * HR: Get all earnings by specific month
 */
export const useAllEarningsByMonth = (
  month: number,
  year: number,
  options?: UseQueryOptions<EmployeeMonthlyEarnings[]>
) => {
  return useQuery({
    queryKey: earningsKeys.hrByMonth(month, year),
    queryFn: () => earningsQueries.getAllEarningsByMonth(month, year),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * HR: Get earnings statistics
 */
export const useEarningsStats = (
  month: number,
  year: number,
  options?: UseQueryOptions<{
    totalEmployees: number;
    totalEarned: number;
    totalHoursWorked: number;
    totalExpectedHours: number;
    avgHoursWorked: number;
    avgEarned: number;
  }>
) => {
  return useQuery({
    queryKey: earningsKeys.hrStats(month, year),
    queryFn: () => earningsQueries.getEarningsStats(month, year),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};
