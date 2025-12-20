import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { payrollQueries } from '@/lib/api/queries/payroll.queries';
import type {
  PayrollPeriod,
  PayrollPeriodWithStats,
  PayrollSalaryRecord,
  PaymentTransaction,
  BulkPaymentBatch,
  PayrollPeriodStats,
} from '@/lib/types/payroll';

/**
 * Query keys for payroll-related queries (HR only)
 */
export const payrollKeys = {
  all: ['payroll'] as const,
  periods: () => [...payrollKeys.all, 'periods'] as const,
  periodsList: (filters?: object) => [...payrollKeys.periods(), 'list', filters] as const,
  periodDetail: (id: string) => [...payrollKeys.periods(), 'detail', id] as const,
  periodByMonthYear: (orgId: string, month: number, year: number) =>
    [...payrollKeys.periods(), 'month-year', orgId, month, year] as const,
  periodStats: (id: string) => [...payrollKeys.periods(), 'stats', id] as const,

  salaries: () => [...payrollKeys.all, 'salaries'] as const,
  salariesByPeriod: (periodId: string) => [...payrollKeys.salaries(), 'period', periodId] as const,
  salariesByStatus: (periodId: string, status: string) =>
    [...payrollKeys.salaries(), 'period', periodId, 'status', status] as const,

  transactions: () => [...payrollKeys.all, 'transactions'] as const,
  transactionsList: (filters?: object) => [...payrollKeys.transactions(), 'list', filters] as const,

  batches: () => [...payrollKeys.all, 'batches'] as const,
  batchesByPeriod: (periodId: string) => [...payrollKeys.batches(), 'period', periodId] as const,
  batchDetail: (id: string) => [...payrollKeys.batches(), 'detail', id] as const,
};

/**
 * HR: Hook to get payroll periods with optional filters
 */
export const usePayrollPeriods = (
  filters?: {
    organizationId?: string;
    status?: string;
    year?: number;
  },
  options?: Omit<UseQueryOptions<PayrollPeriod[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.periodsList(filters),
    queryFn: () => payrollQueries.getPayrollPeriods(filters),
    staleTime: 1000 * 60 * 3, // 3 minutes
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * HR: Hook to get specific payroll period by ID
 */
export const usePayrollPeriodById = (
  periodId: string,
  options?: Omit<UseQueryOptions<PayrollPeriodWithStats | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.periodDetail(periodId),
    queryFn: () => payrollQueries.getPayrollPeriodById(periodId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!periodId,
    ...options,
  });
};

/**
 * HR: Hook to get payroll period by month/year
 */
export const usePayrollPeriodByMonthYear = (
  organizationId: string,
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<PayrollPeriod | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.periodByMonthYear(organizationId, month, year),
    queryFn: () => payrollQueries.getPayrollPeriodByMonthYear(organizationId, month, year),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!organizationId && !!month && !!year,
    ...options,
  });
};

/**
 * HR: Hook to get salary records for a payroll period
 */
export const useSalaryRecordsByPeriod = (
  payrollPeriodId: string,
  options?: Omit<UseQueryOptions<PayrollSalaryRecord[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.salariesByPeriod(payrollPeriodId),
    queryFn: () => payrollQueries.getSalaryRecordsByPeriod(payrollPeriodId),
    staleTime: 0, // Always fresh for active editing
    refetchOnWindowFocus: true,
    enabled: !!payrollPeriodId,
    ...options,
  });
};

/**
 * HR: Hook to get salary records by payment status
 */
export const useSalaryRecordsByPaymentStatus = (
  payrollPeriodId: string,
  paymentStatus: string,
  options?: Omit<UseQueryOptions<PayrollSalaryRecord[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.salariesByStatus(payrollPeriodId, paymentStatus),
    queryFn: () => payrollQueries.getSalaryRecordsByPaymentStatus(payrollPeriodId, paymentStatus),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!payrollPeriodId && !!paymentStatus,
    ...options,
  });
};

/**
 * HR: Hook to get payment statistics for a payroll period
 */
export const usePayrollPeriodStats = (
  periodId: string,
  options?: Omit<UseQueryOptions<PayrollPeriodStats>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.periodStats(periodId),
    queryFn: () => payrollQueries.getPayrollPeriodStats(periodId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    enabled: !!periodId,
    ...options,
  });
};

/**
 * HR: Hook to get payment transactions
 */
export const usePaymentTransactions = (
  filters?: {
    salaryRecordId?: string;
    payrollPeriodId?: string;
    status?: string;
  },
  options?: Omit<UseQueryOptions<PaymentTransaction[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.transactionsList(filters),
    queryFn: () => payrollQueries.getPaymentTransactions(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * HR: Hook to get bulk payment batches for a payroll period
 */
export const useBulkPaymentBatches = (
  payrollPeriodId: string,
  options?: Omit<UseQueryOptions<BulkPaymentBatch[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.batchesByPeriod(payrollPeriodId),
    queryFn: () => payrollQueries.getBulkPaymentBatches(payrollPeriodId),
    staleTime: 1000 * 60 * 3, // 3 minutes
    enabled: !!payrollPeriodId,
    ...options,
  });
};

/**
 * HR: Hook to get bulk payment batch by ID
 */
export const useBulkPaymentBatchById = (
  batchId: string,
  options?: Omit<UseQueryOptions<BulkPaymentBatch | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: payrollKeys.batchDetail(batchId),
    queryFn: () => payrollQueries.getBulkPaymentBatchById(batchId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!batchId,
    ...options,
  });
};

/**
 * HR: Hook to check if payroll period exists for month/year
 */
export const useCheckPayrollPeriodExists = (
  organizationId: string,
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: [...payrollKeys.periods(), 'exists', organizationId, month, year],
    queryFn: () => payrollQueries.checkPayrollPeriodExists(organizationId, month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!organizationId && !!month && !!year,
    ...options,
  });
};

// Convenience aliases
export const usePayrollPeriod = usePayrollPeriodById;
export const usePayrollStats = usePayrollPeriodStats;
export const usePeriodSalaries = useSalaryRecordsByPeriod;
export const useBulkBatches = useBulkPaymentBatches;
