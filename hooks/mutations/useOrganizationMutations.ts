import { attendanceKeys } from "@/hooks/queries/useAttendance";
import { earningsKeys } from "@/hooks/queries/useEarnings";
import { leaveKeys } from "@/hooks/queries/useLeave";
import { organizationKeys } from "@/hooks/queries/useOrganization";
import { salaryKeys } from "@/hooks/queries/useSalary";
import { userKeys } from "@/hooks/queries/useUser";
import { organizationMutations } from "@/lib/api/mutations/organization.mutations";
import { Organization, User } from "@/lib/types";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Hook for creating a new employee
 */
export const useCreateEmployee = (
  organizationId: string,
  options?: UseMutationOptions<
    { authUser: any; user: User },
    Error,
    {
      email: string;
      password?: string;
      fullName: string;
      phone?: string;
      department?: string;
      designation?: string;
      role?: "employee" | "hr" | "admin";
      dateOfJoining?: string;
      baseSalary?: number;
      workingDays?: string[];
      dailyWorkingHours?: number;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
      branchName?: string;
      aadhaarNumber?: string;
      dateOfBirth?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      organizationMutations.createEmployee({
        ...params,
        organizationId,
      } as any),
    ...options,
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate all queries to ensure complete refresh across the app
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
        queryClient.invalidateQueries({ queryKey: salaryKeys.all }),
        queryClient.invalidateQueries({ queryKey: earningsKeys.all }),
        queryClient.invalidateQueries({ queryKey: leaveKeys.all }),
      ]);

      // Call the custom onSuccess callback if provided
      if (options?.onSuccess) {
        await options.onSuccess(data, variables, context, mutation);
      }
    },
  });
};

/**
 * Hook for updating employee details
 */
export const useUpdateEmployee = (
  organizationId: string,
  options?: UseMutationOptions<
    User,
    Error,
    {
      userId: string;
      updates: Partial<{
        full_name: string;
        phone: string;
        department: string;
        designation: string;
        role: "employee" | "hr" | "admin";
        date_of_joining: string;
        is_active: boolean;
      }>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }) =>
      organizationMutations.updateEmployee(userId, updates),
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      // Invalidate specific user
      queryClient.invalidateQueries({
        queryKey: userKeys.byId(variables.userId),
      });
      // Invalidate employees list
      queryClient.invalidateQueries({
        queryKey: organizationKeys.employees(organizationId),
      });
      // Invalidate all users
      queryClient.invalidateQueries({
        queryKey: userKeys.all,
      });

      // Call the custom onSuccess callback if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
  });
};

/**
 * Hook for deactivating an employee
 */
export const useDeactivateEmployee = (
  organizationId: string,
  options?: UseMutationOptions<User, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      organizationMutations.deactivateEmployee(userId),
    ...options,
    onSuccess: (data, userId, context, mutation) => {
      queryClient.invalidateQueries({
        queryKey: userKeys.byId(userId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.employees(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.stats(organizationId),
      });

      // Call the custom onSuccess callback if provided
      options?.onSuccess?.(data, userId, context, mutation);
    },
  });
};

/**
 * Hook for reactivating an employee
 */
export const useReactivateEmployee = (
  organizationId: string,
  options?: UseMutationOptions<User, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      organizationMutations.reactivateEmployee(userId),
    ...options,
    onSuccess: (data, userId, context, mutation) => {
      queryClient.invalidateQueries({
        queryKey: userKeys.byId(userId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.employees(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.stats(organizationId),
      });

      // Call the custom onSuccess callback if provided
      options?.onSuccess?.(data, userId, context, mutation);
    },
  });
};

/**
 * Hook for updating organization details
 */
export const useUpdateOrganization = (
  options?: UseMutationOptions<
    Organization,
    Error,
    {
      organizationId: string;
      updates: Partial<{
        name: string;
        description: string;
        is_active: boolean;
      }>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, updates }) =>
      organizationMutations.updateOrganization(organizationId, updates),
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({
        queryKey: organizationKeys.byId(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.current(),
      });

      // Call the custom onSuccess callback if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
  });
};
