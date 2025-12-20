import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { notificationQueries } from '@/lib/api/queries/notification.queries';
import { Notification } from '@/lib/types';

/**
 * Query keys for notification-related queries
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string, limit?: number) => [...notificationKeys.all, 'list', userId, limit] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread-count', userId] as const,
  unread: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
  byId: (id: string) => [...notificationKeys.all, 'detail', id] as const,
};

/**
 * Hook to get user notifications
 */
export const useUserNotifications = (
  userId: string,
  limit?: number,
  options?: Omit<UseQueryOptions<Notification[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: notificationKeys.list(userId, limit),
    queryFn: () => notificationQueries.getUserNotifications(userId, limit),
    staleTime: 1000 * 60 * 2,
    ...options,
  });
};

/**
 * Hook to get unread notifications count
 */
export const useUnreadNotificationsCount = (
  userId: string,
  options?: Omit<UseQueryOptions<number>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: () => notificationQueries.getUnreadNotificationsCount(userId),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 3, // Refetch every 3 minutes
    ...options,
  });
};

/**
 * Hook to get unread notifications
 */
export const useUnreadNotifications = (
  userId: string,
  options?: Omit<UseQueryOptions<Notification[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: () => notificationQueries.getUnreadNotifications(userId),
    staleTime: 1000 * 60 * 2,
    ...options,
  });
};

/**
 * Hook to get notification by ID
 */
export const useNotificationById = (
  notificationId: string,
  options?: Omit<UseQueryOptions<Notification | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: notificationKeys.byId(notificationId),
    queryFn: () => notificationQueries.getNotificationById(notificationId),
    staleTime: 1000 * 60 * 5,
    enabled: !!notificationId,
    ...options,
  });
};
