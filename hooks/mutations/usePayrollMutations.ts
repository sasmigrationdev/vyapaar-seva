import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { payrollMutations } from '@/lib/api/mutations/payroll.mutations';
import { notificationMutations } from '@/lib/api/mutations/notification.mutations';
import { payrollKeys } from '@/hooks/queries/usePayroll';
import { salaryKeys } from '@/hooks/queries/useSalary';
import { supabase } from '@/lib/supabase/client';
import type {
  PayrollPeriod,
  PayrollPeriodStatus,
  PayrollSalaryRecord,
  PaymentTransaction,
} from '@/lib/types/payroll';

/**
 * HR: Hook to create a new payroll period
 */
export const useCreatePayrollPeriod = (
  options?: UseMutationOptions<
    PayrollPeriod,
    Error,
    {
      organizationId: string;
      month: number;
      year: number;
      startDate: string;
      endDate: string;
      initiatedBy: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => payrollMutations.createPayrollPeriod(params),
    onSuccess: async (data, variables, context) => {
      // Invalidate payroll periods list
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.periods(),
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.periods(),
        type: 'active',
      });

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to generate salary records for a payroll period
 */
export const useGeneratePayrollRecords = (
  options?: UseMutationOptions<
    { success: boolean; recordsCreated: number; errors: string[] },
    Error,
    {
      payrollPeriodId: string;
      organizationId: string;
      month: number;
      year: number;
      createdBy: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => payrollMutations.generatePayrollRecords(params),
    onSuccess: async (data, variables, context) => {
      // Invalidate payroll-related queries
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.all,
        refetchType: 'all',
      });

      // Invalidate salary queries
      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.periodDetail(variables.payrollPeriodId),
        type: 'active',
      });

      await queryClient.refetchQueries({
        queryKey: payrollKeys.salariesByPeriod(variables.payrollPeriodId),
        type: 'active',
      });

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to update payroll period status
 */
export const useUpdatePayrollPeriodStatus = (
  options?: UseMutationOptions<
    PayrollPeriod,
    Error,
    {
      periodId: string;
      status: PayrollPeriodStatus;
      userId: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ periodId, status, userId }) =>
      payrollMutations.updatePayrollPeriodStatus(periodId, status, userId),
    onSuccess: async (data, variables, context) => {
      // Invalidate specific period and all periods list
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.periodDetail(variables.periodId),
        refetchType: 'all',
      });

      await queryClient.invalidateQueries({
        queryKey: payrollKeys.periods(),
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.periodDetail(variables.periodId),
        type: 'active',
      });

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to mark salary as paid
 */
export const useMarkSalaryAsPaid = (
  options?: UseMutationOptions<
    PayrollSalaryRecord,
    Error,
    {
      salaryRecordId: string;
      paymentMethod: string;
      paymentReference?: string;
      paidBy: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => payrollMutations.markSalaryAsPaid(params as any),
    onSuccess: async (data, variables, context) => {
      // Invalidate all payroll and salary queries
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.all,
        refetchType: 'all',
      });

      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.all,
        type: 'active',
      });

      await queryClient.refetchQueries({
        queryKey: salaryKeys.all,
        type: 'active',
      });

      // Create notification for employee (non-blocking)
      if (data.user_id) {
        try {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          const monthName = monthNames[data.month - 1] || '';

          await notificationMutations.createNotification({
            userId: data.user_id,
            title: 'Salary Paid',
            message: `Your salary for ${monthName} ${data.year} has been paid via ${variables.paymentMethod}`,
            type: 'salary',
            relatedId: data.id,
            relatedType: 'salary_record',
          });
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      }

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to bulk mark salaries as paid
 */
export const useBulkMarkSalariesPaid = (
  options?: UseMutationOptions<
    {
      success: number;
      failed: number;
      batchId: string;
      errors: Array<{ recordId: string; error: string }>;
    },
    Error,
    {
      salaryRecordIds: string[];
      payrollPeriodId: string;
      paymentMethod: string;
      paidBy: string;
      batchName: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => payrollMutations.bulkMarkSalariesPaid(params as any),
    onSuccess: async (data, variables, context) => {
      // Invalidate all related queries
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.all,
        refetchType: 'all',
      });

      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.periodDetail(variables.payrollPeriodId),
        type: 'active',
      });

      await queryClient.refetchQueries({
        queryKey: payrollKeys.salariesByPeriod(variables.payrollPeriodId),
        type: 'active',
      });

      await queryClient.refetchQueries({
        queryKey: payrollKeys.batchesByPeriod(variables.payrollPeriodId),
        type: 'active',
      });

      // Create notifications for all employees whose salaries were paid (non-blocking)
      if (data.success > 0) {
        try {
          // Fetch salary records to get user_ids
          const { data: salaryRecords } = await supabase
            .from('salary_records')
            .select('id, user_id, month, year')
            .in('id', variables.salaryRecordIds);

          if (salaryRecords && salaryRecords.length > 0) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];

            // Create notifications for each employee
            await Promise.all(
              salaryRecords.map(async (record) => {
                const monthName = monthNames[record.month - 1] || '';
                return notificationMutations.createNotification({
                  userId: record.user_id,
                  title: 'Salary Paid',
                  message: `Your salary for ${monthName} ${record.year} has been paid`,
                  type: 'salary',
                  relatedId: record.id,
                  relatedType: 'salary_record',
                });
              })
            );
          }
        } catch (error) {
          console.error('Failed to create notifications:', error);
        }
      }

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to update salary record
 */
export const useUpdatePayrollSalaryRecord = (
  options?: UseMutationOptions<
    PayrollSalaryRecord,
    Error,
    {
      recordId: string;
      updates: Partial<{
        base_salary: number;
        allowances: number;
        deductions: number;
        bonus: number;
        notes: string;
      }>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, updates }) =>
      payrollMutations.updateSalaryRecord(recordId, updates),
    onSuccess: async (data, variables, context) => {
      // Invalidate payroll and salary queries
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.all,
        refetchType: 'all',
      });

      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.all,
        type: 'active',
      });

      // Create notification for employee (non-blocking)
      if (data.user_id) {
        try {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          const monthName = monthNames[data.month - 1] || '';

          await notificationMutations.createNotification({
            userId: data.user_id,
            title: 'Salary Record Updated',
            message: `Your salary record for ${monthName} ${data.year} has been updated`,
            type: 'salary',
            relatedId: data.id,
            relatedType: 'salary_record',
          });
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      }

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to revert payment
 */
export const useRevertPayment = (
  options?: UseMutationOptions<
    PayrollSalaryRecord,
    Error,
    {
      salaryRecordId: string;
      reason: string;
      revertedBy: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => payrollMutations.revertPayment(params),
    onSuccess: async (data, variables, context) => {
      // Invalidate all related queries
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.all,
        refetchType: 'all',
      });

      await queryClient.invalidateQueries({
        queryKey: salaryKeys.all,
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.all,
        type: 'active',
      });

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to create payment transaction
 */
export const useCreatePaymentTransaction = (
  options?: UseMutationOptions<
    PaymentTransaction,
    Error,
    {
      salaryRecordId: string;
      payrollPeriodId: string;
      amount: number;
      paymentMethod: string;
      referenceNumber?: string;
      bankName?: string;
      accountNumber?: string;
      processedBy: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => payrollMutations.createPaymentTransaction(params as any),
    onSuccess: async (data, variables, context) => {
      // Invalidate transactions queries
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.transactions(),
        refetchType: 'all',
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.transactionsList({ payrollPeriodId: variables.payrollPeriodId }),
        type: 'active',
      });

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook to delete payroll period (draft only)
 */
export const useDeletePayrollPeriod = (
  options?: UseMutationOptions<void, Error, { periodId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ periodId }) => payrollMutations.deletePayrollPeriod(periodId),
    onSuccess: async (data, variables, context) => {
      // Invalidate periods list
      await queryClient.invalidateQueries({
        queryKey: payrollKeys.periods(),
        refetchType: 'all',
      });

      // Remove specific period from cache
      queryClient.removeQueries({
        queryKey: payrollKeys.periodDetail(variables.periodId),
      });

      // Refetch active queries
      await queryClient.refetchQueries({
        queryKey: payrollKeys.periods(),
        type: 'active',
      });

      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
