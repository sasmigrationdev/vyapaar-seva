import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { attendanceSummaryQueries } from '@/lib/api/queries/attendanceSummary.queries';
import { AttendancePeriodSummary, OrganizationAttendanceSummary, YearFilter, MonthFilter } from '@/lib/types';

/**
 * Query keys for attendance summary queries
 */
export const attendanceSummaryKeys = {
  all: ['attendanceSummary'] as const,
  user: (userId: string, year: YearFilter, month: MonthFilter) =>
    [...attendanceSummaryKeys.all, 'user', userId, year, month] as const,
  org: (orgId: string, year: YearFilter, month: MonthFilter) =>
    [...attendanceSummaryKeys.all, 'org', orgId, year, month] as const,
  firstDate: (userId: string) =>
    [...attendanceSummaryKeys.all, 'firstDate', userId] as const,
  orgFirstDate: (orgId: string) =>
    [...attendanceSummaryKeys.all, 'orgFirstDate', orgId] as const,
};

/**
 * Hook to fetch user's attendance summary for a period
 */
export const useUserAttendanceSummary = (
  userId: string,
  year: YearFilter,
  month: MonthFilter,
  options?: Omit<UseQueryOptions<AttendancePeriodSummary>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceSummaryKeys.user(userId, year, month),
    queryFn: () => attendanceSummaryQueries.getUserPeriodSummary({ userId, year, month }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
    ...options,
  });
};

/**
 * Hook to fetch organization's attendance summary for a period (HR)
 */
export const useOrgAttendanceSummary = (
  organizationId: string,
  year: YearFilter,
  month: MonthFilter,
  options?: Omit<UseQueryOptions<OrganizationAttendanceSummary>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceSummaryKeys.org(organizationId, year, month),
    queryFn: () => attendanceSummaryQueries.getOrganizationPeriodSummary({ organizationId, year, month }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to fetch user's first attendance date (for year range)
 */
export const useFirstAttendanceDate = (
  userId: string,
  options?: Omit<UseQueryOptions<string | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceSummaryKeys.firstDate(userId),
    queryFn: () => attendanceSummaryQueries.getFirstAttendanceDate(userId),
    staleTime: 1000 * 60 * 30, // 30 minutes - rarely changes
    enabled: !!userId,
    ...options,
  });
};

/**
 * Hook to fetch organization's first attendance date (for year range, HR)
 */
export const useOrgFirstAttendanceDate = (
  organizationId: string,
  options?: Omit<UseQueryOptions<string | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: attendanceSummaryKeys.orgFirstDate(organizationId),
    queryFn: () => attendanceSummaryQueries.getOrganizationFirstAttendanceDate(organizationId),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!organizationId,
    ...options,
  });
};
