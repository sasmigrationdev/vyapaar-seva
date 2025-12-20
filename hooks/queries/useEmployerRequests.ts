import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { employerQueries } from '@/lib/api/queries/employer.queries';
import { EmployerEmployeeRequest, EmployerSearchResult, RequestStatus } from '@/lib/types';

/**
 * Query keys for employer requests-related queries
 */
export const employerRequestKeys = {
  all: ['employer-requests'] as const,
  pending: (orgId: string) => [...employerRequestKeys.all, 'pending', orgId] as const,
  byOrg: (orgId: string, filters?: { status?: RequestStatus }) =>
    [...employerRequestKeys.all, 'org', orgId, filters] as const,
  byEmployee: (employeeId: string) =>
    [...employerRequestKeys.all, 'employee', employeeId] as const,
  detail: (requestId: string) => [...employerRequestKeys.all, 'detail', requestId] as const,
  search: (query: string) => [...employerRequestKeys.all, 'search', query] as const,
  employerDetails: (orgId: string) => [...employerRequestKeys.all, 'employer-details', orgId] as const,
  hasPending: (employeeId: string, orgId: string) =>
    [...employerRequestKeys.all, 'has-pending', employeeId, orgId] as const,
  isEmployed: (employeeId: string) =>
    [...employerRequestKeys.all, 'is-employed', employeeId] as const,
};

/**
 * Hook to fetch pending join requests for an organization (HR view)
 */
export const usePendingJoinRequests = (
  organizationId: string,
  options?: UseQueryOptions<EmployerEmployeeRequest[]>
) => {
  return useQuery({
    queryKey: employerRequestKeys.pending(organizationId),
    queryFn: () => employerQueries.getPendingJoinRequests(organizationId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch all join requests for an organization with filters
 */
export const useAllJoinRequests = (
  organizationId: string,
  filters?: { status?: RequestStatus; employeeId?: string },
  options?: UseQueryOptions<EmployerEmployeeRequest[]>
) => {
  // Stabilize filters to prevent React Compiler cache size issues
  const stableFilters = useMemo(() => filters, [filters?.status, filters?.employeeId]);
  
  return useQuery({
    queryKey: employerRequestKeys.byOrg(organizationId, stableFilters),
    queryFn: () => employerQueries.getAllJoinRequests(organizationId, stableFilters),
    staleTime: 1000 * 60 * 3, // 3 minutes
    ...options,
  });
};

/**
 * Hook to fetch employee's own join requests
 */
export const useEmployeeJoinRequests = (
  employeeId: string,
  options?: UseQueryOptions<EmployerEmployeeRequest[]>
) => {
  return useQuery({
    queryKey: employerRequestKeys.byEmployee(employeeId),
    queryFn: () => employerQueries.getEmployeeJoinRequests(employeeId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch a specific join request by ID
 */
export const useJoinRequestById = (
  requestId: string,
  options?: UseQueryOptions<EmployerEmployeeRequest | null>
) => {
  return useQuery({
    queryKey: employerRequestKeys.detail(requestId),
    queryFn: () => employerQueries.getJoinRequestById(requestId),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
};

/**
 * Hook to search employers by code, name, email, or organization
 */
export const useSearchEmployers = (
  searchQuery: string,
  limit: number = 20,
  employeeId?: string,
  options?: UseQueryOptions<EmployerSearchResult[]>
) => {
  // Stabilize employeeId to prevent React Compiler cache size issues
  const stableEmployeeId = useMemo(() => employeeId, [employeeId]);
  
  return useQuery({
    queryKey: [...employerRequestKeys.search(searchQuery), stableEmployeeId],
    queryFn: () => employerQueries.searchEmployers(searchQuery, limit, stableEmployeeId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: searchQuery.length >= 2, // Only search when query is at least 2 characters
    ...options,
  });
};

/**
 * Hook to get employer details by organization ID
 */
export const useEmployerDetails = (
  organizationId: string,
  options?: UseQueryOptions<{ organization: any; employer: any } | null>
) => {
  return useQuery({
    queryKey: employerRequestKeys.employerDetails(organizationId),
    queryFn: () => employerQueries.getEmployerDetails(organizationId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to check if employee has pending request for an organization
 */
export const useHasPendingRequest = (
  employeeId: string,
  organizationId: string,
  options?: UseQueryOptions<boolean>
) => {
  return useQuery({
    queryKey: employerRequestKeys.hasPending(employeeId, organizationId),
    queryFn: () => employerQueries.hasPendingRequest(employeeId, organizationId),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!employeeId && !!organizationId,
    ...options,
  });
};

/**
 * Hook to check if employee is currently employed
 */
export const useIsCurrentlyEmployed = (
  employeeId: string,
  options?: UseQueryOptions<boolean>
) => {
  return useQuery({
    queryKey: employerRequestKeys.isEmployed(employeeId),
    queryFn: () => employerQueries.isCurrentlyEmployed(employeeId),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!employeeId,
    ...options,
  });
};
