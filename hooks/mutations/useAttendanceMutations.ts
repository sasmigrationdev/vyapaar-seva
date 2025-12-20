import { attendanceMutations } from "@/lib/api/mutations/attendance.mutations";
import { notificationMutations } from "@/lib/api/mutations/notification.mutations";
import { AttendanceBreak, AttendanceRecord } from "@/lib/types";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Hook for checking in
 */
export const useCheckIn = (
  userId: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    { notes?: string; wifiInfo?: { ssid: string | null; verified: boolean } }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notes, wifiInfo }) =>
      attendanceMutations.checkIn(userId, notes, wifiInfo),
    onSuccess: async (data, variables, context, mutation) => {
      // Call user callback immediately so UI can update
      options?.onSuccess?.(data, variables, context, mutation);

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate queries - this marks them as stale and refetches active ones
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["earnings"] }),
      ]);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for checking out
 */
export const useCheckOut = (
  userId: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    {
      recordId: string;
      notes?: string;
      breaks?: AttendanceBreak[];
      wifiInfo?: { ssid: string | null; verified: boolean };
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, notes, breaks, wifiInfo }) =>
      attendanceMutations.checkOut(recordId, notes, breaks, wifiInfo),
    onSuccess: async (data, variables, context, mutation) => {
      // Call user callback immediately so UI can update
      options?.onSuccess?.(data, variables, context, mutation);

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate queries - this marks them as stale and refetches active ones
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["earnings"] }),
      ]);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook for marking attendance
 */
export const useMarkAttendance = (
  markedBy: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    {
      userId: string;
      date: string;
      checkInTime: string;
      checkOutTime?: string;
      notes?: string;
      breaks?: AttendanceBreak[];
      bypassWiFi?: boolean;
      bypassReason?: string;
      overtimeHours?: number;
      overtimeReason?: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      attendanceMutations.markAttendance({ ...params, markedBy }),
    onSuccess: async (data, variables, context, mutation) => {
      // Call user callback immediately so UI can close/update
      options?.onSuccess?.(data, variables, context, mutation);

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate queries - this marks them as stale and refetches active ones
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["earnings"] }),
      ]);

      // Create notification for employee (non-blocking)
      try {
        await notificationMutations.createNotification({
          userId: variables.userId,
          title: 'Attendance Marked',
          message: `Your attendance for ${variables.date} has been marked by HR`,
          type: 'attendance',
          relatedId: data.id,
          relatedType: 'attendance_record',
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for updating attendance
 */
export const useUpdateAttendance = (
  userId: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    {
      recordId: string;
      updates: Partial<{
        check_in_time: string;
        check_out_time: string;
        notes: string;
        is_valid_day: boolean;
        breaks: AttendanceBreak[];
        overtime_hours: number;
        overtime_reason: string;
      }>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, updates }) =>
      attendanceMutations.updateAttendance(recordId, updates),
    onSuccess: async (data, variables, context, mutation) => {
      // Call user callback immediately so UI can close/update
      options?.onSuccess?.(data, variables, context, mutation);

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate queries - this marks them as stale and refetches active ones
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["earnings"] }),
      ]);

      // Create notification for employee (non-blocking)
      // Only notify if HR updated someone else's attendance (not self-update)
      if (data.user_id && data.user_id !== userId) {
        try {
          await notificationMutations.createNotification({
            userId: data.user_id,
            title: 'Attendance Updated',
            message: `Your attendance record for ${data.date} has been updated by HR`,
            type: 'attendance',
            relatedId: data.id,
            relatedType: 'attendance_record',
          });
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      }
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * HR: Hook for deleting attendance
 */
export const useDeleteAttendance = (
  options?: UseMutationOptions<void, Error, { recordId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId }) =>
      attendanceMutations.deleteAttendance(recordId),
    onSuccess: async (data, variables, context, mutation) => {
      // Call user callback immediately so UI can close/update
      options?.onSuccess?.(data, variables, context, mutation);

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate queries - this marks them as stale and refetches active ones
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["earnings"] }),
      ]);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};

/**
 * Hook for updating breaks on an attendance record
 * Can be used by employees to manage their own breaks
 */
export const useUpdateBreaks = (
  userId: string,
  options?: UseMutationOptions<
    AttendanceRecord,
    Error,
    {
      recordId: string;
      breaks: AttendanceBreak[];
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, breaks }) =>
      attendanceMutations.updateBreaks(recordId, breaks),
    onSuccess: async (data, variables, context, mutation) => {
      // Call user callback immediately so UI can update
      options?.onSuccess?.(data, variables, context, mutation);

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate queries - this marks them as stale and refetches active ones
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["earnings"] }),
      ]);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
};
