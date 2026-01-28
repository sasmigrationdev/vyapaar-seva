import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { payslipDownloadMutations } from '@/lib/api/mutations/payslipDownload.mutations';
import { payslipDownloadKeys } from '@/hooks/queries/usePayslipDownloads';
import { PayslipDownload } from '@/lib/types';

/**
 * Hook for recording a payslip download
 */
export const useRecordPayslipDownload = (
  userId: string,
  options?: Omit<
    UseMutationOptions<PayslipDownload, Error, { month: number; year: number }>,
    'mutationFn'
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      payslipDownloadMutations.recordDownload(userId, month, year),
    onSuccess: () => {
      // Invalidate the user's payslip downloads query
      queryClient.invalidateQueries({ queryKey: payslipDownloadKeys.user(userId) });
    },
    ...options,
  });
};
