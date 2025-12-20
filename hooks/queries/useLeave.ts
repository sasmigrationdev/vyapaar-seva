import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { leaveQueries } from '@/lib/api/queries/leave.queries';
import { LeaveRequest, LeaveRequestWithUser } from '@/lib/types';

/**
 * Query keys for leave-related queries
 */
export const leaveKeys = {
  all: ['leave'] as const,
  list: (userId: string) => [...leaveKeys.all, 'list', userId] as const,
  upcoming: (userId: string) => [...leaveKeys.all, 'upcoming', userId] as const,
  byId: (id: string) => [...leaveKeys.all, 'detail', id] as const,
  balance: (userId: string, year: number) => [...leaveKeys.all, 'balance', userId, year] as const,
  hrAll: (filters?: object) => [...leaveKeys.all, 'hr', 'all', filters] as const,
  hrPending: () => [...leaveKeys.all, 'hr', 'pending'] as const,
  hrStats: (startDate: string, endDate: string) => 
    [...leaveKeys.all, 'hr', 'stats', startDate, endDate] as const,
};

/**
 * Hook to get user leave requests
 */
export const useUserLeaveRequests = (
  userId: string,
  options?: Omit<UseQueryOptions<LeaveRequest[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: leaveKeys.list(userId),
    queryFn: () => leaveQueries.getUserLeaveRequests(userId),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * Hook to get upcoming leaves
 */
export const useUpcomingLeaves = (
  userId: string,
  options?: Omit<UseQueryOptions<LeaveRequest[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: leaveKeys.upcoming(userId),
    queryFn: () => leaveQueries.getUpcomingLeaves(userId),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * Hook to get leave request by ID
 */
export const useLeaveRequestById = (
  requestId: string,
  options?: Omit<UseQueryOptions<LeaveRequest | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: leaveKeys.byId(requestId),
    queryFn: () => leaveQueries.getLeaveRequestById(requestId),
    staleTime: 1000 * 60 * 10,
    enabled: !!requestId,
    ...options,
  });
};

/**
 * Hook to get leave balance
 */
export const useLeaveBalance = (
  userId: string,
  year: number,
  options?: Omit<UseQueryOptions<{
    casual: { used: number; total: number; remaining: number };
    sick: { used: number; total: number; remaining: number };
    earned: { used: number; total: number; remaining: number };
  }>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: leaveKeys.balance(userId, year),
    queryFn: () => leaveQueries.getLeaveBalance(userId, year),
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

/**
 * HR: Hook to get all leave requests
 */
export const useAllLeaveRequests = (
  filters?: {
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  },
  options?: Omit<UseQueryOptions<LeaveRequestWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: leaveKeys.hrAll(filters),
    queryFn: () => leaveQueries.getAllLeaveRequests(filters),
    staleTime: 0, // Always refetch on invalidation
    refetchOnWindowFocus: true,
    enabled: !!filters?.organizationId,
    ...options,
  });
};

/**
 * HR: Hook to get pending leave requests
 */
export const usePendingLeaveRequests = (
  organizationId?: string,
  options?: Omit<UseQueryOptions<LeaveRequestWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: [...leaveKeys.hrPending(), organizationId],
    queryFn: () => leaveQueries.getPendingLeaveRequests(organizationId),
    staleTime: 1000 * 60 * 2,
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * HR: Hook to get leave statistics
 */
export const useLeaveStats = (
  startDate: string,
  endDate: string,
  organizationId?: string,
  options?: Omit<UseQueryOptions<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalDays: number;
  }>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: [...leaveKeys.hrStats(startDate, endDate), organizationId],
    queryFn: () => leaveQueries.getLeaveStats(startDate, endDate, organizationId),
    staleTime: 1000 * 60 * 10,
    enabled: !!organizationId,
    ...options,
  });
};

// Aliases for consistency
export const useLeaveRequests = useUserLeaveRequests;
export const useHRAllLeaveRequests = useAllLeaveRequests;
export const useHRPendingLeaveRequests = usePendingLeaveRequests;
