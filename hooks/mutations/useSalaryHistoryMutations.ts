import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { salaryHistoryMutations } from '@/lib/api/mutations/salaryHistory.mutations';
import { salaryHistoryKeys } from '@/hooks/queries/useSalaryHistory';
import { userKeys } from '@/hooks/queries/useUser';
import { WeekDay } from '@/lib/types';

/**
 * Hook for updating employee salary with history tracking
 */
export const useUpdateEmployeeSalary = (
  options?: UseMutationOptions<
    any,
    Error,
    {
      userId: string;
      newBaseSalary: number;
      newWorkingDays: WeekDay[];
      newDailyHours: number;
      changedBy: string;
      changeReason?: string;
      notes?: string;
      effectiveFrom?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => salaryHistoryMutations.updateEmployeeSalary(params),
    onSuccess: async (data, variables) => {
      // Refetch salary history queries for immediate update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: salaryHistoryKeys.byUser(variables.userId) }),
        queryClient.refetchQueries({ queryKey: salaryHistoryKeys.pending(variables.userId) }),
        queryClient.refetchQueries({ queryKey: salaryHistoryKeys.latest(variables.userId) }),
      ]);

      // Always refetch user queries since salary changes are now applied instantly
      await Promise.all([
        queryClient.refetchQueries({ queryKey: userKeys.byId(variables.userId) }),
        queryClient.refetchQueries({ queryKey: userKeys.list() }),
        queryClient.refetchQueries({ queryKey: userKeys.current() }),
      ]);
    },
    ...options,
  });
};

/**
 * Hook for applying pending salary changes
 */
export const useApplyPendingSalaryChanges = (
  options?: UseMutationOptions<any, Error, void>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => salaryHistoryMutations.applyPendingSalaryChanges(),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: salaryHistoryKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    ...options,
  });
};

/**
 * Hook for deleting salary history entry
 */
export const useDeleteSalaryHistory = (
  userId: string,
  options?: UseMutationOptions<any, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (historyId: string) => salaryHistoryMutations.deleteSalaryHistory(historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryHistoryKeys.byUser(userId) });
      queryClient.invalidateQueries({ queryKey: salaryHistoryKeys.pending(userId) });
    },
    ...options,
  });
};

/**
 * Hook for updating salary history notes
 */
export const useUpdateSalaryHistoryNotes = (
  userId: string,
  options?: UseMutationOptions<any, Error, { historyId: string; notes: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ historyId, notes }) =>
      salaryHistoryMutations.updateSalaryHistoryNotes(historyId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryHistoryKeys.byUser(userId) });
    },
    ...options,
  });
};
