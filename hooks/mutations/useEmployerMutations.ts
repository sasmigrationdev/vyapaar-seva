import { employerRequestKeys } from "@/hooks/queries/useEmployerRequests";
import { employmentHistoryKeys } from "@/hooks/queries/useEmploymentHistory";
import { userKeys } from "@/hooks/queries/useUser";
import { employerMutations } from "@/lib/api/mutations/employer.mutations";
import { notificationMutations } from "@/lib/api/mutations/notification.mutations";
import { organizationQueries } from "@/lib/api/queries/organization.queries";
import { userQueries } from "@/lib/api/queries/user.queries";
import { supabase } from "@/lib/supabase/client";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Hook for registering as employer
 */
export const useRegisterEmployer = (
  options?: UseMutationOptions<
    { organizationId: string | undefined; employerCode: string | undefined },
    Error,
    {
      authUserId: string;
      fullName: string;
      email: string;
      organizationName: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => employerMutations.registerEmployer(params),
    onSuccess: (data, variables) => {
      // Invalidate user profile queries
      queryClient.invalidateQueries({
        queryKey: userKeys.byId(variables.authUserId),
      });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    ...options,
  });
};

/**
 * Hook for requesting to join organization
 */
export const useRequestJoinOrganization = (
  employeeId: string,
  options?: UseMutationOptions<
    { requestId: string | undefined },
    Error,
    {
      organizationId: string;
      message?: string;
    },
    {
      previousValue: boolean | undefined;
      queryKey: ReturnType<typeof employerRequestKeys.hasPending>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      employerMutations.requestJoinOrganization({
        employeeId,
        ...params,
      }),
    onMutate: async (
      variables
    ): Promise<{
      previousValue: boolean | undefined;
      queryKey: ReturnType<typeof employerRequestKeys.hasPending>;
    }> => {
      // Cancel any outgoing refetches for this specific hasPending query
      const queryKey = employerRequestKeys.hasPending(
        employeeId,
        variables.organizationId
      );
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousValue = queryClient.getQueryData<boolean>(queryKey);

      // Optimistically update to true (pending request exists)
      queryClient.setQueryData<boolean>(queryKey, true);

      // Return context with previous value for rollback
      return { previousValue, queryKey };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, rollback to the previous value
      if (context?.previousValue !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousValue);
      }
    },
    onSuccess: async (data, variables) => {
      // Invalidate employee's request list
      queryClient.invalidateQueries({
        queryKey: employerRequestKeys.byEmployee(employeeId),
      });

      // Invalidate organization's pending requests
      queryClient.invalidateQueries({
        queryKey: employerRequestKeys.pending(variables.organizationId),
      });

      // Refetch the specific hasPending query to confirm server state
      queryClient.invalidateQueries({
        queryKey: employerRequestKeys.hasPending(
          employeeId,
          variables.organizationId
        ),
        refetchType: "active",
      });

      // Invalidate ALL has pending checks for this employee
      queryClient.invalidateQueries({
        queryKey: [...employerRequestKeys.all, "has-pending", employeeId],
        refetchType: "active",
      });

      // Create notification for HR (non-blocking)
      try {
        const hrUserId = await organizationQueries.getOrganizationHR(variables.organizationId);
        const employee = await userQueries.getUserById(employeeId);

        if (hrUserId && employee) {
          await notificationMutations.createNotification({
            userId: hrUserId,
            title: 'New Join Request',
            message: `${employee.full_name} has requested to join your organization`,
            type: 'system',
            relatedId: data.requestId,
            relatedType: 'join_request',
          });
        }
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, undefined);
      }
    },
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for approving join request
 */
export const useApproveJoinRequest = (
  options?: UseMutationOptions<
    { status: string | undefined },
    Error,
    {
      requestId: string;
      reviewerId: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => employerMutations.approveJoinRequest(params),
    onSuccess: async (_, variables) => {
      // Invalidate all request-related queries
      queryClient.invalidateQueries({ queryKey: employerRequestKeys.all });

      // Invalidate employment history
      queryClient.invalidateQueries({ queryKey: employmentHistoryKeys.all });

      // Invalidate user queries (organization_id changed)
      queryClient.invalidateQueries({ queryKey: userKeys.all });

      // Create notification for employee (non-blocking)
      try {
        // Get the request to find the employee_id
        const { data: request } = await supabase
          .from('employer_employee_requests')
          .select('employee_id')
          .eq('id', variables.requestId)
          .single();

        if (request?.employee_id) {
          await notificationMutations.createNotification({
            userId: request.employee_id,
            title: 'Join Request Approved',
            message: `Your request to join the organization has been approved${variables.notes ? `: ${variables.notes}` : ''}`,
            type: 'system',
            relatedId: variables.requestId,
            relatedType: 'join_request',
          });
        }
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    },
    ...options,
  });
};

/**
 * Hook for rejecting join request
 */
export const useRejectJoinRequest = (
  options?: UseMutationOptions<
    { status: string | undefined },
    Error,
    {
      requestId: string;
      reviewerId: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => employerMutations.rejectJoinRequest(params),
    onSuccess: async (_, variables) => {
      // Invalidate all request-related queries
      queryClient.invalidateQueries({ queryKey: employerRequestKeys.all });

      // Create notification for employee (non-blocking)
      try {
        // Get the request to find the employee_id
        const { data: request } = await supabase
          .from('employer_employee_requests')
          .select('employee_id')
          .eq('id', variables.requestId)
          .single();

        if (request?.employee_id) {
          await notificationMutations.createNotification({
            userId: request.employee_id,
            title: 'Join Request Rejected',
            message: `Your request to join the organization has been rejected${variables.notes ? `: ${variables.notes}` : ''}`,
            type: 'system',
            relatedId: variables.requestId,
            relatedType: 'join_request',
          });
        }
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    },
    ...options,
  });
};

/**
 * Hook for cancelling join request
 */
export const useCancelJoinRequest = (
  employeeId: string,
  options?: UseMutationOptions<any, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      employerMutations.cancelJoinRequest(requestId),
    onSuccess: () => {
      // Invalidate employee's request list
      queryClient.invalidateQueries({
        queryKey: employerRequestKeys.byEmployee(employeeId),
      });
    },
    ...options,
  });
};

/**
 * Hook for leaving organization
 */
export const useLeaveOrganization = (
  employeeId: string,
  organizationId?: string,
  options?: UseMutationOptions<
    { historyId: string | undefined },
    Error,
    { reason?: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      employerMutations.leaveOrganization({
        employeeId,
        ...params,
      }),
    onSuccess: async (data, variables) => {
      // Invalidate employment history
      queryClient.invalidateQueries({
        queryKey: employmentHistoryKeys.byEmployee(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employmentHistoryKeys.current(employeeId),
      });

      // Invalidate user profile (organization_id cleared)
      queryClient.invalidateQueries({ queryKey: userKeys.byId(employeeId) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });

      // Invalidate is employed check
      queryClient.invalidateQueries({
        queryKey: employerRequestKeys.isEmployed(employeeId),
      });

      // Create notification for HR (non-blocking)
      if (organizationId) {
        try {
          const hrUserId = await organizationQueries.getOrganizationHR(organizationId);
          const employee = await userQueries.getUserById(employeeId);

          if (hrUserId && employee) {
            await notificationMutations.createNotification({
              userId: hrUserId,
              title: 'Employee Left Organization',
              message: `${employee.full_name} has left the organization${variables.reason ? `: ${variables.reason}` : ''}`,
              type: 'system',
              relatedId: data.historyId,
              relatedType: 'employment_history',
            });
          }
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      }
    },
    ...options,
  });
};

/**
 * Hook for updating organization
 */
export const useUpdateOrganization = (
  organizationId: string,
  options?: UseMutationOptions<
    any,
    Error,
    {
      name?: string;
      description?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) =>
      employerMutations.updateOrganization({
        organizationId,
        updates,
      }),
    onSuccess: () => {
      // Invalidate employer details
      queryClient.invalidateQueries({
        queryKey: employerRequestKeys.employerDetails(organizationId),
      });
    },
    ...options,
  });
};

/**
 * Hook for terminating employee (HR action)
 */
export const useTerminateEmployee = (
  options?: UseMutationOptions<
    any,
    Error,
    {
      employeeId: string;
      organizationId: string;
      terminatedBy: string;
      reason?: string;
      notes?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => employerMutations.terminateEmployee(params),
    onSuccess: (_, variables) => {
      // Invalidate employment history
      queryClient.invalidateQueries({
        queryKey: employmentHistoryKeys.byEmployee(variables.employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employmentHistoryKeys.byOrg(variables.organizationId),
      });

      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    ...options,
  });
};
