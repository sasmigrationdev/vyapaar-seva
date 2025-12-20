import { overtimeRequestQueries } from '@/lib/api/queries/overtimeRequests.queries';
import { OvertimeRequest, OvertimeRequestStatus, OvertimeRequestWithUser } from '@/lib/types';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

/**
 * Query keys for overtime request-related queries
 */
export const overtimeRequestKeys = {
  all: ['overtimeRequests'] as const,
  byAttendance: (attendanceRecordId: string) =>
    [...overtimeRequestKeys.all, 'attendance', attendanceRecordId] as const,
  my: (userId: string, filters?: object) =>
    [...overtimeRequestKeys.all, 'my', userId, filters] as const,
  pending: (organizationId: string) =>
    [...overtimeRequestKeys.all, 'pending', organizationId] as const,
  pendingCount: (organizationId: string) =>
    [...overtimeRequestKeys.all, 'pendingCount', organizationId] as const,
  allRequests: (filters?: object) =>
    [...overtimeRequestKeys.all, 'list', filters] as const,
  detail: (id: string) => [...overtimeRequestKeys.all, 'detail', id] as const,
};

/**
 * Hook to fetch overtime request by attendance record ID
 */
export const useOvertimeRequestByAttendance = (
  attendanceRecordId: string,
  options?: Omit<UseQueryOptions<OvertimeRequestWithUser | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: overtimeRequestKeys.byAttendance(attendanceRecordId),
    queryFn: () => overtimeRequestQueries.getByAttendanceRecordId(attendanceRecordId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!attendanceRecordId,
    ...options,
  });
};

/**
 * Hook to fetch user's overtime requests
 */
export const useMyOvertimeRequests = (
  userId: string,
  filters?: {
    status?: OvertimeRequestStatus;
    startDate?: string;
    endDate?: string;
  },
  options?: Omit<UseQueryOptions<OvertimeRequestWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: overtimeRequestKeys.my(userId, filters),
    queryFn: () => overtimeRequestQueries.getMyOvertimeRequests(userId, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!userId,
    ...options,
  });
};

/**
 * Hook to fetch pending overtime requests (HR view)
 */
export const usePendingOvertimeRequests = (
  organizationId: string,
  options?: Omit<UseQueryOptions<OvertimeRequestWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: overtimeRequestKeys.pending(organizationId),
    queryFn: () => overtimeRequestQueries.getPendingOvertimeRequests(organizationId),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to fetch pending overtime count (for HR badge)
 */
export const usePendingOvertimeCount = (
  organizationId: string,
  options?: Omit<UseQueryOptions<number>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: overtimeRequestKeys.pendingCount(organizationId),
    queryFn: () => overtimeRequestQueries.getPendingOvertimeCount(organizationId),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to fetch all overtime requests with filters (HR view)
 */
export const useAllOvertimeRequests = (
  filters?: {
    status?: OvertimeRequestStatus;
    userId?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  },
  options?: Omit<UseQueryOptions<OvertimeRequestWithUser[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: overtimeRequestKeys.allRequests(filters),
    queryFn: () => overtimeRequestQueries.getAllOvertimeRequests(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!filters?.organizationId,
    ...options,
  });
};

/**
 * Hook to fetch a single overtime request by ID
 */
export const useOvertimeRequestById = (
  id: string,
  options?: Omit<UseQueryOptions<OvertimeRequestWithUser | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: overtimeRequestKeys.detail(id),
    queryFn: () => overtimeRequestQueries.getOvertimeRequestById(id),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!id,
    ...options,
  });
};
