import { breakRequestQueries } from "@/lib/api/queries/breakRequests.queries";
import { BreakRequest, BreakStatus } from "@/lib/types";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

/**
 * Query keys for break request-related queries (Real-Time System)
 */
export const breakRequestKeys = {
  all: ["breakRequests"] as const,
  active: (userId: string) =>
    [...breakRequestKeys.all, "active", userId] as const,
  todayBreaks: (userId: string) =>
    [...breakRequestKeys.all, "today", userId] as const,
  my: (userId: string, filters?: object) =>
    [...breakRequestKeys.all, "my", userId, filters] as const,
  pending: (organizationId?: string) =>
    [...breakRequestKeys.all, "pending", organizationId] as const,
  allActive: (organizationId?: string) =>
    [...breakRequestKeys.all, "allActive", organizationId] as const,
  allRequests: (filters?: object) =>
    [...breakRequestKeys.all, "list", filters] as const,
  byAttendance: (attendanceRecordId: string) =>
    [...breakRequestKeys.all, "attendance", attendanceRecordId] as const,
  detail: (id: string) => [...breakRequestKeys.all, "detail", id] as const,
  canStart: (userId: string, attendanceRecordId: string) =>
    [...breakRequestKeys.all, "canStart", userId, attendanceRecordId] as const,
  byMonth: (userId: string, month: number, year: number) =>
    [...breakRequestKeys.all, "byMonth", userId, month, year] as const,
  allByMonth: (month: number, year: number, organizationId?: string) =>
    [
      ...breakRequestKeys.all,
      "allByMonth",
      month,
      year,
      organizationId,
    ] as const,
  byDate: (date: string, organizationId?: string) =>
    [...breakRequestKeys.all, "byDate", date, organizationId] as const,
  summaryByMonth: (userId: string, month: number, year: number) =>
    [...breakRequestKeys.all, "summary", userId, month, year] as const,
};

/**
 * Hook to fetch user's active (ongoing) break
 * Polls frequently for real-time updates
 */
export const useActiveBreak = (
  userId: string,
  options?: Omit<UseQueryOptions<BreakRequest | null>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.active(userId),
    queryFn: () => breakRequestQueries.getActiveBreak(userId),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute for timer updates
    enabled: !!userId,
    ...options,
  });
};

/**
 * Hook to fetch today's breaks for a user (all statuses)
 */
export const useTodayBreaks = (
  userId: string,
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.todayBreaks(userId),
    queryFn: () => breakRequestQueries.getTodayBreaks(userId),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!userId,
    ...options,
  });
};

/**
 * Hook to fetch current user's break requests with filters
 */
export const useMyBreakRequests = (
  userId: string,
  filters?: {
    status?: BreakStatus;
    startDate?: string;
    endDate?: string;
  },
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.my(userId, filters),
    queryFn: () => breakRequestQueries.getMyBreakRequests(userId, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!userId,
    ...options,
  });
};

/**
 * Hook to fetch pending START approval requests (HR view)
 */
export const usePendingBreakRequests = (
  organizationId?: string,
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.pending(organizationId),
    queryFn: () => breakRequestQueries.getPendingBreakRequests(organizationId),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to fetch all active (ongoing) breaks across organization (HR view)
 */
export const useAllActiveBreaks = (
  organizationId?: string,
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.allActive(organizationId),
    queryFn: () => breakRequestQueries.getAllActiveBreaks(organizationId),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to fetch all break requests with filters (HR view)
 */
export const useAllBreakRequests = (
  filters?: {
    status?: BreakStatus;
    userId?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  },
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.allRequests(filters),
    queryFn: () => breakRequestQueries.getAllBreakRequests(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!filters?.organizationId,
    ...options,
  });
};

/**
 * Hook to fetch break requests for a specific attendance record
 */
export const useBreakRequestsByAttendance = (
  attendanceRecordId: string,
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.byAttendance(attendanceRecordId),
    queryFn: () =>
      breakRequestQueries.getBreakRequestsByAttendance(attendanceRecordId),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!attendanceRecordId,
    ...options,
  });
};

/**
 * Hook to fetch a single break request by ID
 */
export const useBreakRequestById = (
  id: string,
  options?: Omit<UseQueryOptions<BreakRequest | null>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.detail(id),
    queryFn: () => breakRequestQueries.getBreakRequestById(id),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!id,
    ...options,
  });
};

/**
 * Hook to check if user can start a new break
 * Validates: checked in, no active break, no pending break
 */
export const useCanStartBreak = (
  userId: string,
  attendanceRecordId: string,
  options?: Omit<
    UseQueryOptions<{ canStart: boolean; reason?: string }>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: breakRequestKeys.canStart(userId, attendanceRecordId),
    queryFn: () =>
      breakRequestQueries.canStartBreak(userId, attendanceRecordId),
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!userId && !!attendanceRecordId,
    ...options,
  });
};

/**
 * Hook to fetch break requests by month for a specific user
 */
export const useBreaksByMonth = (
  userId: string,
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.byMonth(userId, month, year),
    queryFn: () => breakRequestQueries.getBreaksByMonth(userId, month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
    ...options,
  });
};

/**
 * Hook to fetch all breaks by month (HR view)
 */
export const useAllBreaksByMonth = (
  month: number,
  year: number,
  organizationId?: string,
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.allByMonth(month, year, organizationId),
    queryFn: () =>
      breakRequestQueries.getAllBreaksByMonth(month, year, organizationId),
    staleTime: 1000 * 60 * 3, // 3 minutes
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to fetch breaks by specific date (HR view)
 */
export const useBreaksByDate = (
  date: string,
  organizationId?: string,
  options?: Omit<UseQueryOptions<BreakRequest[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: breakRequestKeys.byDate(date, organizationId),
    queryFn: () => breakRequestQueries.getBreaksByDate(date, organizationId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!date && !!organizationId,
    ...options,
  });
};

/**
 * Hook to fetch break summary by month for a user
 */
export const useBreakSummaryByMonth = (
  userId: string,
  month: number,
  year: number,
  options?: Omit<
    UseQueryOptions<{
      totalBreaks: number;
      completedBreaks: number;
      activeBreaks: number;
      pendingBreaks: number;
      rejectedBreaks: number;
      totalBreakMinutes: number;
    }>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: breakRequestKeys.summaryByMonth(userId, month, year),
    queryFn: () =>
      breakRequestQueries.getBreakSummaryByMonth(userId, month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
    ...options,
  });
};
