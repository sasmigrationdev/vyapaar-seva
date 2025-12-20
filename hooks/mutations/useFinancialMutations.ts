import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { financialMutations } from '@/lib/api/mutations/financial.mutations';
import { financialKeys } from '@/hooks/queries/useFinancial';
import { FinancialCategory, FinancialTransaction } from '@/lib/types/financial.types';

/**
 * Create category
 */
export const useCreateCategory = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialCategory,
    Error,
    {
      name: string;
      type: 'income' | 'expense';
      color?: string;
      icon?: string;
      createdBy: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      financialMutations.createCategory({ ...params, organizationId }),
    onSuccess: async (data, variables, context, mutation) => {
      // Wait for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Invalidate and refetch ALL financial queries
      await queryClient.invalidateQueries({
        queryKey: ['financial'],
        refetchType: 'all',
      });

      // Force immediate refetch of all active queries
      await queryClient.refetchQueries({
        queryKey: ['financial'],
        type: 'active',
      });

      // Reset query data to force refetch on next mount
      queryClient.resetQueries({
        queryKey: ['financial'],
        exact: false,
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Update category
 */
export const useUpdateCategory = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialCategory,
    Error,
    {
      categoryId: string;
      updates: {
        name?: string;
        color?: string;
        icon?: string;
      };
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, updates }) =>
      financialMutations.updateCategory(categoryId, updates),
    onSuccess: async (data, variables, context, mutation) => {
      // Wait for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Invalidate and refetch ALL financial queries
      await queryClient.invalidateQueries({
        queryKey: ['financial'],
        refetchType: 'all',
      });

      // Force immediate refetch of all active queries
      await queryClient.refetchQueries({
        queryKey: ['financial'],
        type: 'active',
      });

      // Reset query data to force refetch on next mount
      queryClient.resetQueries({
        queryKey: ['financial'],
        exact: false,
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Delete category
 */
export const useDeleteCategory = (
  organizationId: string,
  options?: UseMutationOptions<FinancialCategory, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) =>
      financialMutations.deleteCategory(categoryId),
    onSuccess: async (data, variables, context, mutation) => {
      // Wait for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Invalidate and refetch ALL financial queries
      await queryClient.invalidateQueries({
        queryKey: ['financial'],
        refetchType: 'all',
      });

      // Force immediate refetch of all active queries
      await queryClient.refetchQueries({
        queryKey: ['financial'],
        type: 'active',
      });

      // Reset query data to force refetch on next mount
      queryClient.resetQueries({
        queryKey: ['financial'],
        exact: false,
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Add transaction
 */
export const useAddTransaction = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialTransaction,
    Error,
    {
      type: 'income' | 'expense';
      amount: number;
      categoryId: string;
      transactionDate: string;
      description?: string;
      notes?: string;
      paymentMethod?: string;
      referenceNumber?: string;
      createdBy: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      financialMutations.addTransaction({ ...params, organizationId }),
    onSuccess: async (data, variables, context, mutation) => {
      // Wait for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Invalidate and refetch ALL financial queries
      await queryClient.invalidateQueries({
        queryKey: ['financial'],
        refetchType: 'all',
      });

      // Force immediate refetch of all active queries
      await queryClient.refetchQueries({
        queryKey: ['financial'],
        type: 'active',
      });

      // Reset query data to force refetch on next mount
      queryClient.resetQueries({
        queryKey: ['financial'],
        exact: false,
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Update transaction
 */
export const useUpdateTransaction = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialTransaction,
    Error,
    {
      transactionId: string;
      updates: {
        amount?: number;
        categoryId?: string;
        transactionDate?: string;
        description?: string;
        notes?: string;
        paymentMethod?: string;
        referenceNumber?: string;
      };
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, updates }) =>
      financialMutations.updateTransaction(transactionId, updates),
    onSuccess: async (data, variables, context, mutation) => {
      // Wait for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Invalidate and refetch ALL financial queries
      await queryClient.invalidateQueries({
        queryKey: ['financial'],
        refetchType: 'all',
      });

      // Force immediate refetch of all active queries
      await queryClient.refetchQueries({
        queryKey: ['financial'],
        type: 'active',
      });

      // Reset query data to force refetch on next mount
      queryClient.resetQueries({
        queryKey: ['financial'],
        exact: false,
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Delete transaction
 */
export const useDeleteTransaction = (
  organizationId: string,
  options?: UseMutationOptions<boolean, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      financialMutations.deleteTransaction(transactionId, organizationId),
    onSuccess: async (data, variables, context, mutation) => {
      // Wait for balance recalculation to complete (reduced since we now recalculate in mutation)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate and refetch ALL financial queries
      await queryClient.invalidateQueries({
        queryKey: ['financial'],
        refetchType: 'all',
      });

      // Force immediate refetch of all active queries
      await queryClient.refetchQueries({
        queryKey: ['financial'],
        type: 'active',
      });

      // Reset query data to force refetch on next mount
      queryClient.resetQueries({
        queryKey: ['financial'],
        exact: false,
      });

      // Wait a bit more to ensure UI receives updated data
      await new Promise(resolve => setTimeout(resolve, 200));

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
