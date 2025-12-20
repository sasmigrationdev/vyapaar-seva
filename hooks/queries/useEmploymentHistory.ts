import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { employerQueries } from '@/lib/api/queries/employer.queries';
import { EmploymentHistory } from '@/lib/types';

/**
 * Query keys for employment history-related queries
 */
export const employmentHistoryKeys = {
  all: ['employment-history', 'v2'] as const, // v2: Added employer_name field to fix nested join issue
  byEmployee: (employeeId: string) =>
    [...employmentHistoryKeys.all, 'employee', employeeId] as const,
  current: (employeeId: string) =>
    [...employmentHistoryKeys.all, 'current', employeeId] as const,
  byOrg: (orgId: string, includeLeft?: boolean) =>
    [...employmentHistoryKeys.all, 'org', orgId, includeLeft] as const,
};

/**
 * Hook to fetch employment history for an employee
 */
export const useEmploymentHistory = (
  employeeId: string,
  options?: UseQueryOptions<EmploymentHistory[]>
) => {
  return useQuery({
    queryKey: employmentHistoryKeys.byEmployee(employeeId),
    queryFn: () => employerQueries.getEmploymentHistory(employeeId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!employeeId,
    ...options,
  });
};

/**
 * Hook to fetch current employment for an employee
 */
export const useCurrentEmployment = (
  employeeId: string,
  options?: UseQueryOptions<EmploymentHistory | null>
) => {
  return useQuery({
    queryKey: employmentHistoryKeys.current(employeeId),
    queryFn: () => employerQueries.getCurrentEmployment(employeeId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!employeeId,
    ...options,
  });
};

/**
 * Hook to fetch employment history for an organization (HR view)
 */
export const useOrganizationEmploymentHistory = (
  organizationId: string,
  includeLeft: boolean = false,
  options?: UseQueryOptions<EmploymentHistory[]>
) => {
  return useQuery({
    queryKey: employmentHistoryKeys.byOrg(organizationId, includeLeft),
    queryFn: () => employerQueries.getOrganizationEmploymentHistory(organizationId, includeLeft),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!organizationId,
    ...options,
  });
};
