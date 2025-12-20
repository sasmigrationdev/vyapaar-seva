import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { sessionQueries, SessionInfo } from '@/lib/api/queries/session.queries';

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
  current: () => [...sessionKeys.all, 'current'] as const,
  count: () => [...sessionKeys.all, 'count'] as const,
};

/**
 * Hook to get all active sessions (HR only - uses Edge Function)
 */
export const useAllSessions = (
  options?: Omit<UseQueryOptions<SessionInfo[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: sessionQueries.getAllSessions,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
    ...options,
  });
};

/**
 * Hook to get current session information
 */
export const useCurrentSession = (
  options?: Omit<UseQueryOptions<SessionInfo | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: sessionQueries.getCurrentSession,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * Hook to get active session count
 */
export const useSessionCount = (
  options?: Omit<UseQueryOptions<number>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: sessionKeys.count(),
    queryFn: sessionQueries.getSessionCount,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
    ...options,
  });
};

