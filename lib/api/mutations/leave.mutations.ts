import { supabase } from '@/lib/supabase/client';
import { LeaveStatus, LeaveType } from '@/lib/types';

export const leaveMutations = {
  /**
   * Create leave request
   */
  createLeaveRequest: async (params: {
    userId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: params.userId,
        leave_type: params.leaveType,
        start_date: params.startDate,
        end_date: params.endDate,
        reason: params.reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update leave request (user can only update pending requests)
   */
  updateLeaveRequest: async (
    requestId: string,
    updates: Partial<{
      leave_type: LeaveType;
      start_date: string;
      end_date: string;
      reason: string;
    }>
  ) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updates)
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cancel leave request
   */
  cancelLeaveRequest: async (requestId: string) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Review leave request (HR only)
   */
  reviewLeaveRequest: async (
    requestId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewerNotes?: string
  ) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewerNotes,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete leave request
   */
  deleteLeaveRequest: async (requestId: string) => {
    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  },
};
