import { supabase } from "@/lib/supabase/client";
import { Json } from "@/lib/supabase/types";
import { AttendanceBreak, BreakRequest } from "@/lib/types";
import {
  calculateBreakDuration,
  parseBreaks,
} from "@/lib/utils/attendance.utils";

/**
 * Break Request Mutation Functions - Real-Time Check-in/Check-out Style
 *
 * New Flow:
 * 1. createBreakRequest - Employee requests to start break (no end time)
 * 2. approveBreakStart - HR approves, break becomes active
 * 3. endBreak - Employee ends break when returning
 * 4. Break automatically marked as completed with duration calculated
 */

export const breakRequestMutations = {
  /**
   * Employee creates a break request (start only, no end time)
   * Status: 'pending_start'
   */
  createBreakRequest: async (params: {
    userId: string;
    attendanceRecordId: string;
    requestDate: string;
    requestedStartTime: string;
    reason: string;
    notes?: string;
    wifiSsid?: string;
    wifiVerified?: boolean;
  }): Promise<BreakRequest> => {
    const { data, error } = await supabase
      .from("break_requests")
      .insert({
        user_id: params.userId,
        attendance_record_id: params.attendanceRecordId,
        request_date: params.requestDate,
        requested_start_time: params.requestedStartTime,
        reason: params.reason,
        notes: params.notes,
        requested_by: params.userId,
        status: "pending_start",
        start_wifi_ssid: params.wifiSsid,
        start_wifi_verified: params.wifiVerified || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * HR approves a break START
   * Status: 'pending_start' -> 'active'
   * Sets actual_start_time and is_active = true
   */
  approveBreakStart: async (params: {
    breakRequestId: string;
    reviewedBy: string;
    reviewerNotes?: string;
  }): Promise<BreakRequest> => {
    const now = new Date().toISOString();

    // First, fetch the break request to get the requested_start_time
    const { data: breakRequest, error: fetchError } = await supabase
      .from("break_requests")
      .select("requested_start_time")
      .eq("id", params.breakRequestId)
      .single();

    if (fetchError) throw fetchError;
    if (!breakRequest) throw new Error("Break request not found");

    // Update break request to active status
    // Use requested_start_time as actual_start_time (not approval time)
    const { data, error } = await supabase
      .from("break_requests")
      .update({
        status: "active",
        is_active: true,
        actual_start_time: breakRequest.requested_start_time,
        reviewed_by: params.reviewedBy,
        reviewed_at: now,
        reviewer_notes: params.reviewerNotes,
      })
      .eq("id", params.breakRequestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Employee ends their active break
   * Status: 'active' -> 'completed'
   * Calculates duration and adds to attendance record
   */
  endBreak: async (params: {
    breakRequestId: string;
    userId: string;
    notes?: string;
    wifiSsid?: string;
    wifiVerified?: boolean;
  }): Promise<BreakRequest> => {
    const now = new Date().toISOString();

    // First, get the break request to calculate duration
    const { data: breakRequest, error: fetchError } = await supabase
      .from("break_requests")
      .select("*, attendance_record:attendance_records(*)")
      .eq("id", params.breakRequestId)
      .eq("user_id", params.userId) // Ensure user can only end their own break
      .eq("is_active", true)
      .single();

    if (fetchError) throw fetchError;
    if (!breakRequest) throw new Error("Active break not found");

    const attendanceRecord = breakRequest.attendance_record as any;
    if (!attendanceRecord) throw new Error("Attendance record not found");

    // Calculate duration
    const durationMinutes = calculateBreakDuration(
      breakRequest.actual_start_time!,
      now
    );

    // Parse existing breaks from attendance record
    const existingBreaks = parseBreaks(attendanceRecord.breaks);

    // Create new break object to add to attendance record
    const newBreak: AttendanceBreak = {
      start_time: breakRequest.actual_start_time!,
      end_time: now,
      duration_minutes: durationMinutes,
      notes: params.notes || breakRequest.notes || undefined,
    };

    // Add new break to existing breaks
    const updatedBreaks = [...existingBreaks, newBreak];

    // Update break request with end time
    // Note: is_active and status will be automatically set by the database trigger
    const { error: updateBreakError } = await supabase
      .from("break_requests")
      .update({
        actual_end_time: now,
        notes: params.notes || breakRequest.notes,
        end_wifi_ssid: params.wifiSsid,
        end_wifi_verified: params.wifiVerified || false,
      })
      .eq("id", params.breakRequestId);

    if (updateBreakError) throw updateBreakError;

    // Update attendance record with the completed break
    const { error: updateAttendanceError } = await supabase
      .from("attendance_records")
      .update({
        breaks: updatedBreaks as unknown as Json,
      })
      .eq("id", attendanceRecord.id);

    if (updateAttendanceError) throw updateAttendanceError;

    // Fetch and return updated break request
    const { data: updatedBreakRequest, error: finalFetchError } = await supabase
      .from("break_requests")
      .select("*")
      .eq("id", params.breakRequestId)
      .single();

    if (finalFetchError) throw finalFetchError;
    return updatedBreakRequest;
  },

  /**
   * HR manually ends a break for an employee
   * Used when employee forgets to end break or needs manual intervention
   */
  hrEndBreak: async (params: {
    breakRequestId: string;
    endTime: string;
    reviewedBy: string;
    reviewerNotes?: string;
  }): Promise<BreakRequest> => {
    // First, get the break request
    const { data: breakRequest, error: fetchError } = await supabase
      .from("break_requests")
      .select("*, attendance_record:attendance_records(*)")
      .eq("id", params.breakRequestId)
      .eq("is_active", true)
      .single();

    if (fetchError) throw fetchError;
    if (!breakRequest) throw new Error("Active break not found");

    const attendanceRecord = breakRequest.attendance_record as any;
    if (!attendanceRecord) throw new Error("Attendance record not found");

    // Calculate duration
    const durationMinutes = calculateBreakDuration(
      breakRequest.actual_start_time!,
      params.endTime
    );

    // Parse existing breaks
    const existingBreaks = parseBreaks(attendanceRecord.breaks);

    // Create new break object
    const newBreak: AttendanceBreak = {
      start_time: breakRequest.actual_start_time!,
      end_time: params.endTime,
      duration_minutes: durationMinutes,
      notes: params.reviewerNotes || breakRequest.notes || "Ended by HR",
    };

    // Add to breaks array
    const updatedBreaks = [...existingBreaks, newBreak];

    // Update break request
    // Note: is_active and status will be automatically set by the database trigger
    const { error: updateBreakError } = await supabase
      .from("break_requests")
      .update({
        actual_end_time: params.endTime,
        reviewed_by: params.reviewedBy,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: params.reviewerNotes || "Break ended by HR",
      })
      .eq("id", params.breakRequestId);

    if (updateBreakError) throw updateBreakError;

    // Update attendance record
    const { error: updateAttendanceError } = await supabase
      .from("attendance_records")
      .update({
        breaks: updatedBreaks as unknown as Json,
      })
      .eq("id", attendanceRecord.id);

    if (updateAttendanceError) throw updateAttendanceError;

    // Fetch and return updated break request
    const { data: updatedBreakRequest, error: finalFetchError } = await supabase
      .from("break_requests")
      .select("*")
      .eq("id", params.breakRequestId)
      .single();

    if (finalFetchError) throw finalFetchError;
    return updatedBreakRequest;
  },

  /**
   * HR rejects a break START request
   * Status: 'pending_start' -> 'rejected'
   */
  rejectBreakRequest: async (params: {
    breakRequestId: string;
    reviewedBy: string;
    reviewerNotes?: string;
  }): Promise<BreakRequest> => {
    const { data, error } = await supabase
      .from("break_requests")
      .update({
        status: "rejected",
        reviewed_by: params.reviewedBy,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: params.reviewerNotes,
      })
      .eq("id", params.breakRequestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Employee cancels their pending break request
   * Status: 'pending_start' -> 'cancelled'
   */
  cancelBreakRequest: async (params: {
    breakRequestId: string;
    userId: string;
  }): Promise<BreakRequest> => {
    const { data, error } = await supabase
      .from("break_requests")
      .update({
        status: "cancelled",
        reviewer_notes: "Cancelled by employee",
      })
      .eq("id", params.breakRequestId)
      .eq("user_id", params.userId) // Ensure user can only cancel their own request
      .eq("status", "pending_start") // Can only cancel pending requests
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * HR manually adds a completed break for an employee
   * Used for backdating breaks or manual entry
   * Status: 'completed' (auto-approved)
   */
  hrAddManualBreak: async (params: {
    userId: string;
    attendanceRecordId: string;
    requestDate: string;
    startTime: string;
    endTime: string;
    addedBy: string;
    reason?: string;
    notes?: string;
  }): Promise<BreakRequest> => {
    // Calculate duration
    const durationMinutes = calculateBreakDuration(
      params.startTime,
      params.endTime
    );

    // Get the attendance record to update breaks
    const { data: attendanceRecord, error: fetchError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("id", params.attendanceRecordId)
      .single();

    if (fetchError) throw fetchError;
    if (!attendanceRecord) throw new Error("Attendance record not found");

    // Parse existing breaks
    const existingBreaks = parseBreaks(attendanceRecord.breaks);

    // Create new break object
    const newBreak: AttendanceBreak = {
      start_time: params.startTime,
      end_time: params.endTime,
      duration_minutes: durationMinutes,
      notes: params.notes,
    };

    // Add new break to existing breaks
    const updatedBreaks = [...existingBreaks, newBreak];

    // Create the break request with completed status
    const { data: breakRequest, error: createError } = await supabase
      .from("break_requests")
      .insert({
        user_id: params.userId,
        attendance_record_id: params.attendanceRecordId,
        request_date: params.requestDate,
        requested_start_time: params.startTime,
        actual_start_time: params.startTime,
        actual_end_time: params.endTime,
        duration_minutes: durationMinutes,
        status: "completed",
        is_active: false,
        reason: params.reason || "Added by HR",
        notes: params.notes,
        requested_by: params.addedBy,
        reviewed_by: params.addedBy,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: "Break added manually by HR",
      })
      .select()
      .single();

    if (createError) throw createError;

    // Update attendance record with the new break
    const { error: updateAttendanceError } = await supabase
      .from("attendance_records")
      .update({
        breaks: updatedBreaks as unknown as Json,
      })
      .eq("id", params.attendanceRecordId);

    if (updateAttendanceError) throw updateAttendanceError;

    return breakRequest;
  },

  /**
   * HR updates a completed break's times
   * Used for correcting break times
   */
  hrUpdateBreak: async (params: {
    breakRequestId: string;
    startTime: string;
    endTime: string;
    notes?: string;
    updatedBy: string;
  }): Promise<BreakRequest> => {
    // Calculate new duration
    const durationMinutes = calculateBreakDuration(
      params.startTime,
      params.endTime
    );

    // Get the break request and attendance record
    const { data: breakRequest, error: fetchError } = await supabase
      .from("break_requests")
      .select("*, attendance_record:attendance_records(*)")
      .eq("id", params.breakRequestId)
      .single();

    if (fetchError) throw fetchError;
    if (!breakRequest) throw new Error("Break request not found");

    const attendanceRecord = breakRequest.attendance_record as any;
    if (!attendanceRecord) throw new Error("Attendance record not found");

    // Parse existing breaks from attendance record
    const existingBreaks = parseBreaks(attendanceRecord.breaks);

    // Find and update the break in the breaks array
    const oldStartTime = breakRequest.actual_start_time;
    const oldEndTime = breakRequest.actual_end_time;

    const updatedBreaks = existingBreaks.map((br) => {
      // Match the break by its start and end times
      if (br.start_time === oldStartTime && br.end_time === oldEndTime) {
        return {
          start_time: params.startTime,
          end_time: params.endTime,
          duration_minutes: durationMinutes,
          notes: params.notes || br.notes,
        };
      }
      return br;
    });

    // Update break request
    const { error: updateBreakError } = await supabase
      .from("break_requests")
      .update({
        actual_start_time: params.startTime,
        actual_end_time: params.endTime,
        duration_minutes: durationMinutes,
        notes: params.notes || breakRequest.notes,
        reviewer_notes: `Updated by HR at ${new Date().toISOString()}`,
        reviewed_by: params.updatedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", params.breakRequestId);

    if (updateBreakError) throw updateBreakError;

    // Update attendance record breaks
    const { error: updateAttendanceError } = await supabase
      .from("attendance_records")
      .update({
        breaks: updatedBreaks as unknown as Json,
      })
      .eq("id", attendanceRecord.id);

    if (updateAttendanceError) throw updateAttendanceError;

    // Fetch and return updated break request
    const { data: updatedBreakRequest, error: finalFetchError } = await supabase
      .from("break_requests")
      .select("*")
      .eq("id", params.breakRequestId)
      .single();

    if (finalFetchError) throw finalFetchError;
    return updatedBreakRequest;
  },

  /**
   * HR removes/deletes a break (removes from both break_requests and attendance_records)
   */
  removeBreak: async (params: {
    breakRequestId: string;
    removedBy: string;
  }): Promise<void> => {
    // Get the break request to find the attendance record and break details
    const { data: breakRequest, error: fetchError } = await supabase
      .from("break_requests")
      .select("*, attendance_record:attendance_records(*)")
      .eq("id", params.breakRequestId)
      .single();

    if (fetchError) throw fetchError;
    if (!breakRequest) throw new Error("Break request not found");

    const attendanceRecord = breakRequest.attendance_record as any;
    if (!attendanceRecord) throw new Error("Attendance record not found");

    // Parse existing breaks from attendance record
    const existingBreaks = parseBreaks(attendanceRecord.breaks);

    // Normalize timestamps for comparison (convert to ISO strings)
    const normalizeTimestamp = (ts: string | null): string | null => {
      if (!ts) return null;
      try {
        return new Date(ts).toISOString();
      } catch {
        return ts;
      }
    };

    const breakStartNormalized = normalizeTimestamp(breakRequest.actual_start_time);
    const breakEndNormalized = normalizeTimestamp(breakRequest.actual_end_time);

    // Remove the break matching this request's start and end times
    // Use normalized timestamps for comparison
    const updatedBreaks = existingBreaks.filter((br) => {
      const brStartNormalized = normalizeTimestamp(br.start_time);
      const brEndNormalized = normalizeTimestamp(br.end_time);
      
      return !(
        brStartNormalized === breakStartNormalized &&
        brEndNormalized === breakEndNormalized
      );
    });

    // Verify that we actually removed a break
    if (updatedBreaks.length === existingBreaks.length) {
      console.warn("Warning: Break not found in attendance record breaks array");
    }

    // Update attendance record to remove the break FIRST
    // This will trigger the calculate_total_break_minutes trigger
    // which will update total_break_minutes and total_hours
    const { error: updateAttendanceError } = await supabase
      .from("attendance_records")
      .update({
        breaks:
          updatedBreaks.length > 0 ? (updatedBreaks as unknown as Json) : null,
      })
      .eq("id", attendanceRecord.id);

    if (updateAttendanceError) throw updateAttendanceError;

    // Delete the break request AFTER updating attendance
    const { error: deleteError } = await supabase
      .from("break_requests")
      .delete()
      .eq("id", params.breakRequestId);

    if (deleteError) throw deleteError;
  },
};
