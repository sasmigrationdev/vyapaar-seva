import { salaryKeys } from "@/hooks/queries/useSalary";
import { salaryMutations } from "@/lib/api/mutations/salary.mutations";
import { SalaryRecord, SalaryStatus } from "@/lib/types";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

export const useCreateSalaryRecord = (
  options?: UseMutationOptions<SalaryRecord, Error, any>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => salaryMutations.createSalaryRecord(params),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate and refetch ALL attendance, salary, and earnings queries
      await queryClient.invalidateQueries({
        queryKey: ["attendance"],
        refetchType: "all",
      });

      await queryClient.invalidateQueries({
        queryKey: ["salary"],
        refetchType: "all",
      });

      await queryClient.invalidateQueries({
        queryKey: ["earnings"],
        refetchType: "all",
      });

      // Force refetch all active queries
      await queryClient.refetchQueries({
        queryKey: ["attendance"],
        type: "active",
      });

      await queryClient.refetchQueries({
        queryKey: ["salary"],
        type: "active",
      });

      await queryClient.refetchQueries({
        queryKey: ["earnings"],
        type: "active",
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

export const useUpdateSalaryRecord = (
  options?: UseMutationOptions<
    SalaryRecord,
    Error,
    { recordId: string; updates: any }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, updates }) =>
      salaryMutations.updateSalaryRecord(recordId, updates),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate and refetch ALL attendance, salary, and earnings queries
      await queryClient.invalidateQueries({
        queryKey: ["attendance"],
        refetchType: "all",
      });

      await queryClient.invalidateQueries({
        queryKey: ["salary"],
        refetchType: "all",
      });

      await queryClient.invalidateQueries({
        queryKey: ["earnings"],
        refetchType: "all",
      });

      // Force refetch all active queries
      await queryClient.refetchQueries({
        queryKey: ["attendance"],
        type: "active",
      });

      await queryClient.refetchQueries({
        queryKey: ["salary"],
        type: "active",
      });

      await queryClient.refetchQueries({
        queryKey: ["earnings"],
        type: "active",
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

export const useUpdateSalaryStatus = (
  options?: UseMutationOptions<
    SalaryRecord,
    Error,
    { recordId: string; status: SalaryStatus; approvedBy?: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, status, approvedBy }) =>
      salaryMutations.updateSalaryStatus(recordId, status, approvedBy),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate and refetch ALL salary queries immediately
      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: "all",
      });

      // Force refetch all active salary queries
      await queryClient.refetchQueries({
        queryKey: salaryKeys.all,
        type: "active",
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
