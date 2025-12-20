import { attendanceKeys } from "@/hooks/queries/useAttendance";
import { breakRequestKeys } from "@/hooks/queries/useBreakRequests";
import { earningsKeys } from "@/hooks/queries/useEarnings";
import { breakRequestMutations } from "@/lib/api/mutations/breakRequests.mutations";
import { notificationMutations } from "@/lib/api/mutations/notification.mutations";
import { organizationQueries } from "@/lib/api/queries/organization.queries";
import { userQueries } from "@/lib/api/queries/user.queries";
import { BreakRequest } from "@/lib/types";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Break Request Mutation Hooks - Real-Time Check-in/Check-out Style
 */

/**
 * Hook for creating a break request (employee requests to START break)
 * Status: 'pending_start'
 */
export const useCreateBreakRequest = (
  userId: string,
  organizationId?: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      attendanceRecordId: string;
      requestDate: string;
      requestedStartTime: string;
      reason: string;
      notes?: string;
      wifiSsid?: string;
      wifiVerified?: boolean;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.createBreakRequest({
        userId,
        ...params,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.my(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.todayBreaks(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.canStart(userId, variables.attendanceRecordId),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.pending()
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.byAttendance(data.attendance_record_id),
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
              title: 'New Break Request',
              message: `${employee.full_name} has requested a break: ${variables.reason}`,
              type: 'attendance',
              relatedId: data.id,
              relatedType: 'break_request',
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
 * Hook for HR approving a break START
 * Status: 'pending_start' -> 'active'
 */
export const useApproveBreakStart = (
  reviewedBy: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      breakRequestId: string;
      reviewerNotes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.approveBreakStart({
        ...params,
        reviewedBy,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate all break queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.all }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.active(data.user_id),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.todayBreaks(data.user_id),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.my(data.user_id),
        }),
      ]);

      // Create notification for employee (non-blocking)
      try {
        await notificationMutations.createNotification({
          userId: data.user_id,
          title: 'Break Approved',
          message: `Your break request has been approved${variables.reviewerNotes ? `: ${variables.reviewerNotes}` : ''}`,
          type: 'attendance',
          relatedId: data.id,
          relatedType: 'break_request',
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
 * Hook for employee ending their active break
 * Status: 'active' -> 'completed'
 */
export const useEndBreak = (
  userId: string,
  organizationId?: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      breakRequestId: string;
      notes?: string;
      wifiSsid?: string;
      wifiVerified?: boolean;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.endBreak({
        ...params,
        userId,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate all break queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.all }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.active(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.todayBreaks(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.my(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.today(data.user_id),
        }),
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
      ]);

      // Invalidate monthly summary
      const requestDate = new Date(data.request_date);
      await queryClient.invalidateQueries({
        queryKey: attendanceKeys.monthlySummary(
          data.user_id,
          requestDate.getMonth(),
          requestDate.getFullYear()
        ),
      });

      // Create notification for HR (non-blocking)
      if (organizationId) {
        try {
          const hrUserId = await organizationQueries.getOrganizationHR(organizationId);
          const employee = await userQueries.getUserById(userId);

          if (hrUserId && employee) {
            await notificationMutations.createNotification({
              userId: hrUserId,
              title: 'Break Ended',
              message: `${employee.full_name} has ended their break`,
              type: 'attendance',
              relatedId: data.id,
              relatedType: 'break_request',
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
 * Hook for HR manually ending a break for an employee
 */
export const useHREndBreak = (
  reviewedBy: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      breakRequestId: string;
      endTime: string;
      reviewerNotes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.hrEndBreak({
        ...params,
        reviewedBy,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate all break queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.all }),
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.today(data.user_id),
        }),
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
      ]);

      // Invalidate monthly summary
      const requestDate = new Date(data.request_date);
      await queryClient.invalidateQueries({
        queryKey: attendanceKeys.monthlySummary(
          data.user_id,
          requestDate.getMonth(),
          requestDate.getFullYear()
        ),
      });

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
 * Hook for rejecting a break START request (HR)
 * Status: 'pending_start' -> 'rejected'
 */
export const useRejectBreakRequest = (
  reviewedBy: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      breakRequestId: string;
      reviewerNotes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.rejectBreakRequest({
        ...params,
        reviewedBy,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate all break request queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.all }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.my(data.user_id),
        }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.todayBreaks(data.user_id),
        }),
      ]);

      // Create notification for employee (non-blocking)
      try {
        await notificationMutations.createNotification({
          userId: data.user_id,
          title: 'Break Request Rejected',
          message: `Your break request has been rejected${variables.reviewerNotes ? `: ${variables.reviewerNotes}` : ''}`,
          type: 'attendance',
          relatedId: data.id,
          relatedType: 'break_request',
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
 * Hook for cancelling a break request (employee)
 * Status: 'pending_start' -> 'cancelled'
 */
export const useCancelBreakRequest = (
  userId: string,
  organizationId?: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      breakRequestId: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.cancelBreakRequest({
        ...params,
        userId,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate user's break requests
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.my(userId) }),
        queryClient.invalidateQueries({
          queryKey: breakRequestKeys.todayBreaks(userId),
        }),
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.pending() }),
      ]);

      // Create notification for HR (non-blocking)
      if (organizationId) {
        try {
          const hrUserId = await organizationQueries.getOrganizationHR(organizationId);
          const employee = await userQueries.getUserById(userId);

          if (hrUserId && employee) {
            await notificationMutations.createNotification({
              userId: hrUserId,
              title: 'Break Request Cancelled',
              message: `${employee.full_name} has cancelled their break request`,
              type: 'attendance',
              relatedId: data.id,
              relatedType: 'break_request',
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
 * Hook for HR to manually add a completed break for an employee
 * Used for backdating breaks or manual entry
 * Status: 'completed' (auto-approved)
 */
export const useHRAddManualBreak = (
  addedBy: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      userId: string;
      attendanceRecordId: string;
      requestDate: string;
      startTime: string;
      endTime: string;
      reason?: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.hrAddManualBreak({
        ...params,
        addedBy,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate monthly summary for the affected date
      const requestDate = new Date(data.request_date);
      const month = requestDate.getMonth();
      const year = requestDate.getFullYear();
      
      // Invalidate all break request queries and related data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.all }),
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
        queryClient.invalidateQueries({
          queryKey: earningsKeys.currentMonth(data.user_id),
        }),
      ]);

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
 * Hook for HR to update a completed break's times
 * Used for correcting break times
 */
export const useHRUpdateBreak = (
  updatedBy: string,
  options?: UseMutationOptions<
    BreakRequest,
    Error,
    {
      breakRequestId: string;
      startTime: string;
      endTime: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.hrUpdateBreak({
        ...params,
        updatedBy,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate monthly summary for the affected date
      const requestDate = new Date(data.request_date);
      const month = requestDate.getMonth();
      const year = requestDate.getFullYear();
      
      // Invalidate all break request queries and related data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.all }),
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
        queryClient.invalidateQueries({
          queryKey: earningsKeys.currentMonth(data.user_id),
        }),
      ]);

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
 * Hook for HR to remove/delete a break
 * Removes from both break_requests and attendance_records
 * Also updates total_hours and monthly earnings via database triggers
 */
export const useRemoveBreak = (
  removedBy: string,
  options?: UseMutationOptions<
    void,
    Error,
    {
      breakRequestId: string;
      userId?: string;
      requestDate?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      breakRequestMutations.removeBreak({
        breakRequestId: params.breakRequestId,
        removedBy,
      }),
    onSuccess: async (data, variables, context) => {
      // Invalidate all break request queries
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: breakRequestKeys.all }),
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
        queryClient.invalidateQueries({ queryKey: earningsKeys.all }),
      ];

      if (variables.userId) {
        // Invalidate user-specific queries
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: attendanceKeys.today(variables.userId),
          }),
          queryClient.invalidateQueries({
            queryKey: breakRequestKeys.my(variables.userId),
          }),
          queryClient.invalidateQueries({
            queryKey: breakRequestKeys.todayBreaks(variables.userId),
          }),
          queryClient.invalidateQueries({
            queryKey: earningsKeys.allUser(variables.userId),
          }),
          queryClient.invalidateQueries({
            queryKey: earningsKeys.currentMonth(variables.userId),
          })
        );

        if (variables.requestDate) {
          const date = new Date(variables.requestDate);
          const month = date.getMonth();
          const year = date.getFullYear();
          
          invalidations.push(
            queryClient.invalidateQueries({
              queryKey: attendanceKeys.monthlySummary(
                variables.userId,
                month,
                year
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: earningsKeys.byMonth(variables.userId, month, year),
            }),
            queryClient.invalidateQueries({
              queryKey: breakRequestKeys.allByMonth(month, year),
            }),
            queryClient.invalidateQueries({
              queryKey: breakRequestKeys.byDate(variables.requestDate),
            })
          );
        }
      }

      await Promise.all(invalidations);

      if (options?.onSuccess) {
        return options.onSuccess(data, variables, context);
      }
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
