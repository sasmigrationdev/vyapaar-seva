import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { payslipDownloadQueries } from '@/lib/api/queries/payslipDownload.queries';
import { PayslipDownload } from '@/lib/types';

/**
 * Query keys for payslip download queries
 */
export const payslipDownloadKeys = {
  all: ['payslipDownloads'] as const,
  user: (userId: string) => [...payslipDownloadKeys.all, userId] as const,
};

/**
 * Hook to fetch all payslip download records for a user
 */
export const usePayslipDownloads = (
  userId: string,
  options?: Omit<UseQueryOptions<PayslipDownload[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payslipDownloadKeys.user(userId),
    queryFn: () => payslipDownloadQueries.getUserDownloads(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
    ...options,
  });
};
