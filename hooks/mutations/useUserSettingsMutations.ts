import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { userMutations } from '@/lib/api/mutations/user.mutations';
import { userSettingsKeys } from '@/hooks/queries/useUserSettings';

/**
 * Hook for updating auto check-in setting
 */
export const useUpdateAutoCheckinSetting = (
  userId: string,
  options?: UseMutationOptions<boolean, Error, boolean>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) =>
      userMutations.updateAutoCheckinSetting(userId, enabled),
    onSuccess: (data) => {
      // Update the cache with the new value
      queryClient.setQueryData(userSettingsKeys.autoCheckin(userId), data);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
    ...options,
  });
};
