import { attendanceKeys } from "@/hooks/queries/useAttendance";
import { earningsKeys } from "@/hooks/queries/useEarnings";
import { leaveKeys } from "@/hooks/queries/useLeave";
import { organizationKeys } from "@/hooks/queries/useOrganization";
import { salaryKeys } from "@/hooks/queries/useSalary";
import { userKeys } from "@/hooks/queries/useUser";
import { userMutations } from "@/lib/api/mutations/user.mutations";
import { User, UserRole } from "@/lib/types";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Hook for updating user profile
 */
export const useUpdateProfile = (
  userId: string,
  options?: UseMutationOptions<
    User,
    Error,
    Partial<{
      full_name: string;
      phone: string;
      department: string;
      designation: string;
      profile_picture_url: string;
      bank_name: string;
      account_number: string;
      ifsc_code: string;
      account_holder_name: string;
      branch_name: string;
      aadhaar_number: string;
      date_of_birth: string;
    }>
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => userMutations.updateProfile(userId, updates),
    onSuccess: async () => {
      // Use refetchQueries for immediate update instead of just invalidating
      await Promise.all([
        queryClient.refetchQueries({ queryKey: userKeys.byId(userId) }),
        queryClient.refetchQueries({ queryKey: userKeys.current() }),
        queryClient.refetchQueries({ queryKey: userKeys.list() }),
      ]);
    },
    ...options,
  });
};

/**
 * Hook for updating employee (HR only)
 */
export const useUpdateEmployee = (
  options?: UseMutationOptions<
    User,
    Error,
    {
      userId: string;
      updates: Partial<{
        full_name: string;
        email: string;
        phone: string;
        role: UserRole;
        department: string;
        designation: string;
        date_of_joining: string;
        is_active: boolean;
        bank_name: string;
        account_number: string;
        ifsc_code: string;
        account_holder_name: string;
        branch_name: string;
        aadhaar_number: string;
        date_of_birth: string;
      }>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }) =>
      userMutations.updateEmployee(userId, updates),
    onSuccess: async (_, variables) => {
      // Use refetchQueries for immediate update instead of just invalidating
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: userKeys.byId(variables.userId),
        }),
        queryClient.refetchQueries({ queryKey: userKeys.list() }),
        queryClient.refetchQueries({ queryKey: userKeys.current() }),
      ]);
    },
    ...options,
  });
};

/**
 * Hook for deactivating employee (HR only)
 */
export const useDeactivateEmployee = (
  options?: UseMutationOptions<User, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userMutations.deactivateEmployee(userId),
    onSuccess: (_, userId, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: userKeys.byId(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
    ...options,
  });
};

/**
 * Hook for activating employee (HR only)
 */
export const useActivateEmployee = (
  options?: UseMutationOptions<User, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userMutations.activateEmployee(userId),
    onSuccess: (_, userId, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: userKeys.byId(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
    ...options,
  });
};

/**
 * Hook for deleting employee and all related data (HR only)
 */
export const useDeleteEmployee = (
  options?: UseMutationOptions<any, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => {
      console.log(
        "🔄 [useDeleteEmployee] Mutation triggered for userId:",
        userId
      );
      return userMutations.deleteEmployee(userId);
    },
    onSuccess: async (data, userId, context, mutation) => {
      console.log("✅ [useDeleteEmployee] onSuccess called");
      console.log("✅ [useDeleteEmployee] Data:", data);
      console.log("✅ [useDeleteEmployee] UserId:", userId);

      console.log(
        "🔄 [useDeleteEmployee] Invalidating all queries for app reload..."
      );

      // Invalidate all queries to ensure complete refresh across the app
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
        queryClient.invalidateQueries({ queryKey: salaryKeys.all }),
        queryClient.invalidateQueries({ queryKey: earningsKeys.all }),
        queryClient.invalidateQueries({ queryKey: leaveKeys.all }),
      ]);

      console.log(
        "✅ [useDeleteEmployee] All queries invalidated - app will reload data"
      );

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        console.log(
          "🔄 [useDeleteEmployee] Calling custom onSuccess handler..."
        );
        await options.onSuccess(data, userId, context, mutation);
      }
    },
    onError: (error, userId, context, mutation) => {
      console.error("❌ [useDeleteEmployee] onError called");
      console.error("❌ [useDeleteEmployee] Error:", error);
      console.error("❌ [useDeleteEmployee] Error message:", error.message);
      console.error("❌ [useDeleteEmployee] UserId:", userId);

      if (options?.onError) {
        options.onError(error, userId, context, mutation);
      }
    },
    onSettled: (data, error, userId, context, mutation) => {
      console.log("🏁 [useDeleteEmployee] onSettled called");
      console.log("🏁 [useDeleteEmployee] Data:", data);
      console.log("🏁 [useDeleteEmployee] Error:", error);

      if (options?.onSettled) {
        options.onSettled(data, error, userId, context, mutation);
      }
    },
  });
};

/**
 * Hook for resetting password with old password verification
 */
export const useResetPassword = (
  options?: UseMutationOptions<
    any,
    Error,
    {
      email: string;
      oldPassword: string;
      newPassword: string;
    }
  >
) => {
  return useMutation({
    mutationFn: (params) => userMutations.resetPassword(params),
    ...options,
  });
};
