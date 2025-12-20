import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { organizationQueries } from '@/lib/api/queries/organization.queries';
import { Organization, User, OrganizationStats } from '@/lib/types';

/**
 * Query keys for organization-related queries
 */
export const organizationKeys = {
  all: ['organization'] as const,
  current: () => [...organizationKeys.all, 'current'] as const,
  byId: (id: string) => [...organizationKeys.all, 'detail', id] as const,
  employees: (id: string, filters?: object) => [...organizationKeys.all, 'employees', id, filters] as const,
  stats: (id: string) => [...organizationKeys.all, 'stats', id] as const,
  departments: (id: string) => [...organizationKeys.all, 'departments', id] as const,
  nextEmployeeId: (id: string) => [...organizationKeys.all, 'nextEmployeeId', id] as const,
};

/**
 * Hook to get organization by ID
 */
export const useOrganization = (
  organizationId: string,
  options?: Omit<UseQueryOptions<Organization | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: organizationKeys.byId(organizationId),
    queryFn: () => organizationQueries.getOrganizationById(organizationId),
    staleTime: 1000 * 60 * 10,
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to get current user's organization
 */
export const useCurrentOrganization = (
  options?: Omit<UseQueryOptions<Organization | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: organizationKeys.current(),
    queryFn: () => organizationQueries.getCurrentUserOrganization(),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * Hook to get organization employees
 */
export const useOrganizationEmployees = (
  organizationId: string,
  filters?: {
    role?: string;
    department?: string;
    isActive?: boolean;
  },
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: organizationKeys.employees(organizationId, filters),
    queryFn: () => organizationQueries.getOrganizationEmployees(organizationId, filters),
    staleTime: 1000 * 60 * 3,
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to get organization statistics
 */
export const useOrganizationStats = (
  organizationId: string,
  options?: Omit<UseQueryOptions<OrganizationStats>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: organizationKeys.stats(organizationId),
    queryFn: () => organizationQueries.getOrganizationStats(organizationId),
    staleTime: 1000 * 60 * 2,
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to get organization departments
 */
export const useOrganizationDepartments = (
  organizationId: string,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: organizationKeys.departments(organizationId),
    queryFn: () => organizationQueries.getOrganizationDepartments(organizationId),
    staleTime: 1000 * 60 * 10,
    enabled: !!organizationId,
    ...options,
  });
};

/**
 * Hook to get next employee ID for organization
 */
export const useNextEmployeeId = (
  organizationId: string,
  options?: Omit<UseQueryOptions<string>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: organizationKeys.nextEmployeeId(organizationId),
    queryFn: () => organizationQueries.getNextEmployeeId(organizationId),
    staleTime: 0, // Always fetch fresh to avoid duplicate IDs
    enabled: !!organizationId,
    ...options,
  });
};
