import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { userQueries } from '@/lib/api/queries/user.queries';

/**
 * Query keys for user settings
 */
export const userSettingsKeys = {
  all: ['userSettings'] as const,
  autoCheckin: (userId: string) => [...userSettingsKeys.all, 'autoCheckin', userId] as const,
};

/**
 * Hook to fetch user's auto check-in setting
 */
export const useAutoCheckinSetting = (
  userId: string,
  options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userSettingsKeys.autoCheckin(userId),
    queryFn: () => userQueries.getAutoCheckinSetting(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
    ...options,
  });
};
