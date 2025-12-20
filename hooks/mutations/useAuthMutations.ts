import { authMutations } from "@/lib/api/mutations/auth.mutations";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { router } from "expo-router";

/**
 * Hook for signing up (legacy - kept for backward compatibility)
 */
export const useSignUp = (
  options?: UseMutationOptions<
    any,
    Error,
    {
      email: string;
      password: string;
      fullName: string;
      employeeId: string;
      phone?: string;
      role?: string;
    }
  >
) => {
  return useMutation({
    mutationFn: (params) => authMutations.signUp(params),
    ...options,
  });
};

/**
 * Hook for signing up as employer
 */
export const useSignUpAsEmployer = (
  options?: UseMutationOptions<
    {
      authData: any;
      employerData: {
        organizationId: string | undefined;
        employerCode: string | undefined;
      };
    },
    Error,
    {
      email: string;
      password: string;
      fullName: string;
      organizationName: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => authMutations.signUpAsEmployer(params),
    onSuccess: () => {
      // Invalidate all queries on successful signup
      queryClient.invalidateQueries();
    },
    ...options,
  });
};

/**
 * Hook for signing up as employee
 */
export const useSignUpAsEmployee = (
  options?: UseMutationOptions<
    any,
    Error,
    {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => authMutations.signUpAsEmployee(params),
    onSuccess: () => {
      // Invalidate all queries on successful signup
      queryClient.invalidateQueries();
    },
    ...options,
  });
};

/**
 * Hook for signing in
 */
export const useSignIn = (
  options?: UseMutationOptions<any, Error, { email: string; password: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }) => authMutations.signIn(email, password),
    onSuccess: () => {
      // Invalidate all queries on sign in
      queryClient.invalidateQueries();
    },
    ...options,
  });
};

/**
 * Hook for signing out
 */
export const useSignOut = (options?: UseMutationOptions<void, Error, void>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authMutations.signOut();
      // Small delay to ensure auth state change propagates
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    onSuccess: () => {
      // Clear all queries on sign out
      queryClient.clear();
      // Navigate to login after clearing
      router.replace("/auth/login");
    },
    ...options,
  });
};

/**
 * Hook for resetting password
 */
export const useResetPassword = (
  options?: UseMutationOptions<void, Error, { email: string }>
) => {
  return useMutation({
    mutationFn: ({ email }) => authMutations.resetPassword(email),
    ...options,
  });
};

/**
 * Hook for updating password
 */
export const useUpdatePassword = (
  options?: UseMutationOptions<void, Error, { newPassword: string }>
) => {
  return useMutation({
    mutationFn: ({ newPassword }) => authMutations.updatePassword(newPassword),
    ...options,
  });
};
