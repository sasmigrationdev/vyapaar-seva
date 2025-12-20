import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { leaveMutations } from '@/lib/api/mutations/leave.mutations';
import { leaveKeys } from '@/hooks/queries/useLeave';
import { LeaveRequest, LeaveType } from '@/lib/types';

export const useCreateLeaveRequest = (
  userId: string,
  organizationId?: string,
  options?: UseMutationOptions<LeaveRequest, Error, {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => leaveMutations.createLeaveRequest({ ...params, userId }),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate and refetch leave queries immediately
      await queryClient.invalidateQueries({
        queryKey: leaveKeys.list(userId),
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({
        queryKey: leaveKeys.upcoming(userId),
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({
        queryKey: leaveKeys.hrPending(),
        refetchType: 'all'
      });

      // Force refetch active queries
      await queryClient.refetchQueries({
        queryKey: leaveKeys.list(userId),
        type: 'active'
      });

      // Note: HR notification is handled by database trigger (notify_leave_request)

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

export const useReviewLeaveRequest = (
  options?: UseMutationOptions<LeaveRequest, Error, {
    requestId: string;
    status: 'approved' | 'rejected';
    reviewedBy: string;
    reviewerNotes?: string;
  }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, status, reviewedBy, reviewerNotes }) =>
      leaveMutations.reviewLeaveRequest(requestId, status, reviewedBy, reviewerNotes),
    onSuccess: async (data, variables, context, mutation) => {
      // Invalidate and refetch ALL leave queries immediately
      await queryClient.invalidateQueries({
        queryKey: leaveKeys.all,
        refetchType: 'all'
      });

      // Force refetch all active leave queries
      await queryClient.refetchQueries({
        queryKey: leaveKeys.all,
        type: 'active'
      });

      // Note: Employee notification is handled by database trigger (notify_leave_request)

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, mutation);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
