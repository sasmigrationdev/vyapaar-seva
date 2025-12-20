import { attendanceKeys } from '@/hooks/queries/useAttendance';
import { overtimeRequestKeys } from '@/hooks/queries/useOvertimeRequests';
import { earningsKeys } from '@/hooks/queries/useEarnings';
import { overtimeRequestMutations } from '@/lib/api/mutations/overtimeRequests.mutations';
import { notificationMutations } from '@/lib/api/mutations/notification.mutations';
import { organizationQueries } from '@/lib/api/queries/organization.queries';
import { userQueries } from '@/lib/api/queries/user.queries';
import { OvertimeRequest } from '@/lib/types';
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query';

/**
 * Hook for creating overtime request (employee submits)
 */
export const useCreateOvertimeRequest = (
  userId: string,
  organizationId?: string,
  options?: UseMutationOptions<
    OvertimeRequest,
    Error,
    {
      attendanceRecordId: string;
      requestDate: string;
      requestedHours: number;
      reason?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      overtimeRequestMutations.createOvertimeRequest({
        userId,
        ...params,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate relevant queries
      // Use partial key matching to invalidate all 'my' queries regardless of filters
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...overtimeRequestKeys.all, 'my', userId],
        }),
        queryClient.invalidateQueries({
          queryKey: overtimeRequestKeys.byAttendance(variables.attendanceRecordId),
        }),
        queryClient.invalidateQueries({
          queryKey: overtimeRequestKeys.pending(organizationId || ''),
        }),
        queryClient.invalidateQueries({
          queryKey: overtimeRequestKeys.pendingCount(organizationId || ''),
        }),
      ]);

      // Create notification for HR (non-blocking)
      if (organizationId) {
        try {
          const hrUserId = await organizationQueries.getOrganizationHR(organizationId);
          const employee = await userQueries.getUserById(userId);

          if (hrUserId && employee) {
            await notificationMutations.createNotification({
              userId: hrUserId,
              title: 'New Overtime Request',
              message: `${employee.full_name} has requested ${variables.requestedHours}h overtime${variables.reason ? `: ${variables.reason}` : ''}`,
              type: 'attendance',
              relatedId: data.id,
              relatedType: 'overtime_request',
            });
          }
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      }

      if (options?.onSuccess) {
        return options.onSuccess(data, variables, context);
      }
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for approving overtime request (HR)
 */
export const useApproveOvertimeRequest = (
  reviewedBy: string,
  options?: UseMutationOptions<
    OvertimeRequest,
    Error,
    {
      overtimeRequestId: string;
      approvedHours: number;
      reviewerNotes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      overtimeRequestMutations.approveOvertimeRequest({
        ...params,
        reviewedBy,
      }),
    onSuccess: async (data, variables, context) => {
      const requestDate = new Date(data.request_date);
      const month = requestDate.getMonth();
      const year = requestDate.getFullYear();

      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: overtimeRequestKeys.all }),
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.today(data.user_id),
        }),
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.monthlySummary(data.user_id, month, year),
        }),
        queryClient.invalidateQueries({ queryKey: earningsKeys.all }),
        queryClient.invalidateQueries({
          queryKey: earningsKeys.byMonth(data.user_id, month, year),
        }),
      ]);

      // Notify employee (non-blocking)
      try {
        await notificationMutations.createNotification({
          userId: data.user_id,
          title: 'Overtime Approved',
          message: `Your overtime request for ${variables.approvedHours}h has been approved${variables.reviewerNotes ? `: ${variables.reviewerNotes}` : ''}`,
          type: 'attendance',
          relatedId: data.id,
          relatedType: 'overtime_request',
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      if (options?.onSuccess) {
        return options.onSuccess(data, variables, context);
      }
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for rejecting overtime request (HR)
 */
export const useRejectOvertimeRequest = (
  reviewedBy: string,
  options?: UseMutationOptions<
    OvertimeRequest,
    Error,
    {
      overtimeRequestId: string;
      reviewerNotes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      overtimeRequestMutations.rejectOvertimeRequest({
        ...params,
        reviewedBy,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: overtimeRequestKeys.all }),
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.today(data.user_id),
        }),
      ]);

      // Notify employee (non-blocking)
      try {
        await notificationMutations.createNotification({
          userId: data.user_id,
          title: 'Overtime Request Rejected',
          message: `Your overtime request has been rejected${variables.reviewerNotes ? `: ${variables.reviewerNotes}` : ''}`,
          type: 'attendance',
          relatedId: data.id,
          relatedType: 'overtime_request',
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      if (options?.onSuccess) {
        return options.onSuccess(data, variables, context);
      }
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
