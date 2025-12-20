import { supabase } from '@/lib/supabase/client';
import { OvertimeRequest } from '@/lib/types';

export const overtimeRequestMutations = {
  /**
   * Create overtime request (employee submits)
   */
  createOvertimeRequest: async (params: {
    userId: string;
    attendanceRecordId: string;
    requestDate: string;
    requestedHours: number;
    reason?: string;
  }): Promise<OvertimeRequest> => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .insert({
        user_id: params.userId,
        attendance_record_id: params.attendanceRecordId,
        request_date: params.requestDate,
        requested_hours: params.requestedHours,
        reason: params.reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as OvertimeRequest;
  },

  /**
   * Approve overtime request (HR)
   */
  approveOvertimeRequest: async (params: {
    overtimeRequestId: string;
    approvedHours: number;
    reviewedBy: string;
    reviewerNotes?: string;
  }): Promise<OvertimeRequest> => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .update({
        status: 'approved',
        approved_hours: params.approvedHours,
        reviewed_by: params.reviewedBy,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: params.reviewerNotes || null,
      })
      .eq('id', params.overtimeRequestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data as OvertimeRequest;
  },

  /**
   * Reject overtime request (HR)
   */
  rejectOvertimeRequest: async (params: {
    overtimeRequestId: string;
    reviewedBy: string;
    reviewerNotes?: string;
  }): Promise<OvertimeRequest> => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .update({
        status: 'rejected',
        reviewed_by: params.reviewedBy,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: params.reviewerNotes || 'Request rejected',
      })
      .eq('id', params.overtimeRequestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data as OvertimeRequest;
  },
};
