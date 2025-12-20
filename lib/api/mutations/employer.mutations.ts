import { supabase } from '@/lib/supabase/client';

export const employerMutations = {
  /**
   * Register as employer (creates organization + employer user)
   */
  registerEmployer: async (params: {
    authUserId: string;
    fullName: string;
    email: string;
    organizationName: string;
  }) => {
    const { data, error } = await supabase.rpc('register_employer', {
      p_auth_user_id: params.authUserId,
      p_full_name: params.fullName,
      p_email: params.email,
      p_organization_name: params.organizationName
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; organization_id?: string; employer_code?: string };

    if (!result.success) {
      throw new Error(result.error || 'Failed to register employer');
    }

    return {
      organizationId: result.organization_id,
      employerCode: result.employer_code
    };
  },

  /**
   * Request to join an organization
   */
  requestJoinOrganization: async (params: {
    employeeId: string;
    organizationId: string;
    message?: string;
  }) => {
    const { data, error } = await supabase.rpc('request_join_organization', {
      p_employee_id: params.employeeId,
      p_organization_id: params.organizationId,
      p_message: params.message || null
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; request_id?: string };

    if (!result.success) {
      throw new Error(result.error || 'Failed to create join request');
    }

    return { requestId: result.request_id };
  },

  /**
   * Approve a join request
   */
  approveJoinRequest: async (params: {
    requestId: string;
    reviewerId: string;
    notes?: string;
  }) => {
    const { data, error } = await supabase.rpc('review_join_request', {
      p_request_id: params.requestId,
      p_reviewer_id: params.reviewerId,
      p_status: 'approved',
      p_notes: params.notes || null
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; status?: string };

    if (!result.success) {
      throw new Error(result.error || 'Failed to approve request');
    }

    return { status: result.status };
  },

  /**
   * Reject a join request
   */
  rejectJoinRequest: async (params: {
    requestId: string;
    reviewerId: string;
    notes?: string;
  }) => {
    const { data, error } = await supabase.rpc('review_join_request', {
      p_request_id: params.requestId,
      p_reviewer_id: params.reviewerId,
      p_status: 'rejected',
      p_notes: params.notes || null
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; status?: string };

    if (!result.success) {
      throw new Error(result.error || 'Failed to reject request');
    }

    return { status: result.status };
  },

  /**
   * Cancel a join request (employee cancels their own request)
   */
  cancelJoinRequest: async (requestId: string) => {
    const { data, error } = await supabase
      .from('employer_employee_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Leave current organization
   */
  leaveOrganization: async (params: {
    employeeId: string;
    reason?: string;
  }) => {
    const { data, error } = await supabase.rpc('leave_organization', {
      p_employee_id: params.employeeId,
      p_reason: params.reason || null
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; history_id?: string };

    if (!result.success) {
      throw new Error(result.error || 'Failed to leave organization');
    }

    return { historyId: result.history_id };
  },

  /**
   * Update organization details (employer only)
   */
  updateOrganization: async (params: {
    organizationId: string;
    updates: {
      name?: string;
      description?: string;
    };
  }) => {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...params.updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Terminate employee (HR marks employee as left)
   */
  terminateEmployee: async (params: {
    employeeId: string;
    organizationId: string;
    terminatedBy: string;
    reason?: string;
    notes?: string;
  }) => {
    // First, update the history record
    const { error: historyError } = await supabase
      .from('employer_employee_history')
      .update({
        left_at: new Date().toISOString(),
        terminated_by: params.terminatedBy,
        leave_reason: params.reason || 'terminated',
        notes: params.notes
      })
      .eq('employee_id', params.employeeId)
      .eq('organization_id', params.organizationId)
      .is('left_at', null);

    if (historyError) throw historyError;

    // Then, clear user's organization and deactivate
    const { data, error } = await supabase
      .from('users')
      .update({
        organization_id: null,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.employeeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
