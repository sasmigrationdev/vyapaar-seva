import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { notificationMutations } from '@/lib/api/mutations/notification.mutations';
import { notificationKeys } from '@/hooks/queries/useNotification';
import { Notification } from '@/lib/types';

/**
 * Hook for creating notifications
 */
export const useCreateNotification = (
  options?: UseMutationOptions<Notification, Error, {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string;
    relatedType?: string;
  }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => notificationMutations.createNotification(params),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate the recipient's notification queries
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.list(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(variables.userId),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unread(variables.userId),
      });

      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for marking notification as read
 */
export const useMarkAsRead = (
  userId: string,
  options?: UseMutationOptions<Notification, Error, { notificationId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId }) => notificationMutations.markAsRead(notificationId),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate notification queries
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.list(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unread(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.byId(variables.notificationId),
      });

      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for marking all notifications as read
 */
export const useMarkAllAsRead = (
  userId: string,
  options?: UseMutationOptions<void, Error, void>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationMutations.markAllAsRead(userId),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate all notification queries for this user
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });

      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for deleting a notification
 */
export const useDeleteNotification = (
  userId: string,
  options?: UseMutationOptions<void, Error, { notificationId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId }) => notificationMutations.deleteNotification(notificationId),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate notification queries
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.list(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unread(userId),
      });

      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
