import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { financialQueries } from '@/lib/api/queries/financial.queries';
import { FinancialCategory, FinancialTransaction, MonthlySummary } from '@/lib/types/financial.types';

/**
 * Query keys
 */
export const financialKeys = {
  all: ['financial'] as const,
  categories: (orgId: string, type?: 'income' | 'expense') =>
    [...financialKeys.all, 'categories', orgId, type] as const,
  transactions: (orgId: string, filters?: object) =>
    [...financialKeys.all, 'transactions', orgId, filters] as const,
  balance: (orgId: string) =>
    [...financialKeys.all, 'balance', orgId] as const,
  summary: (orgId: string, month: number, year: number) =>
    [...financialKeys.all, 'summary', orgId, month, year] as const,
  transaction: (id: string) =>
    [...financialKeys.all, 'transaction', id] as const,
};

/**
 * Get categories
 */
export const useCategories = (
  organizationId: string,
  type?: 'income' | 'expense',
  options?: Omit<UseQueryOptions<FinancialCategory[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: financialKeys.categories(organizationId, type),
    queryFn: () => financialQueries.getCategories(organizationId, type),
    staleTime: 0,
    ...options,
  });
};

/**
 * Get transactions
 */
export const useTransactions = (
  organizationId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'income' | 'expense';
    categoryId?: string;
  },
  options?: Omit<UseQueryOptions<FinancialTransaction[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: financialKeys.transactions(organizationId, filters),
    queryFn: () => financialQueries.getTransactions(organizationId, filters),
    staleTime: 0,
    ...options,
  });
};

/**
 * Get current balance
 */
export const useCurrentBalance = (
  organizationId: string,
  options?: Omit<UseQueryOptions<number>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: financialKeys.balance(organizationId),
    queryFn: () => financialQueries.getCurrentBalance(organizationId),
    staleTime: 0,
    ...options,
  });
};

/**
 * Get monthly summary
 */
export const useMonthlySummary = (
  organizationId: string,
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<MonthlySummary>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: financialKeys.summary(organizationId, month, year),
    queryFn: () => financialQueries.getMonthlySummary(organizationId, month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * Get transaction by ID
 */
export const useTransaction = (
  id: string,
  options?: Omit<UseQueryOptions<FinancialTransaction>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: financialKeys.transaction(id),
    queryFn: () => financialQueries.getTransactionById(id),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};
