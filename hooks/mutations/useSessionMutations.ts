import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { sessionQueries } from '@/lib/api/queries/session.queries';
import { sessionKeys } from '@/hooks/queries/useSessions';

/**
 * Hook to sign out from current device
 */
export const useSignOutCurrentDevice = (
  options?: UseMutationOptions<void, Error, void>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionQueries.signOutCurrentDevice,
    onSuccess: () => {
      // Invalidate all queries on sign out
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
    ...options,
  });
};

/**
 * Hook to sign out from all devices
 */
export const useSignOutAllDevices = (
  options?: UseMutationOptions<void, Error, void>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionQueries.signOutAllDevices,
    onSuccess: () => {
      // Invalidate all queries on sign out
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
    ...options,
  });
};

/**
 * Hook to revoke a specific session (HR only)
 */
export const useRevokeSession = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => sessionQueries.revokeSession(sessionId),
    onSuccess: () => {
      // Refetch session list after revoking
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
      queryClient.invalidateQueries({ queryKey: sessionKeys.count() });
    },
    ...options,
  });
};

