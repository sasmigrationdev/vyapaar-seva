import { supabase } from '@/lib/supabase/client';
import {
  EmployerEmployeeRequest,
  EmploymentHistory,
  EmployerSearchResult
} from '@/lib/types';

export const employerQueries = {
  /**
   * Get pending join requests for an organization (HR view)
   */
  getPendingJoinRequests: async (organizationId: string): Promise<EmployerEmployeeRequest[]> => {
    const { data, error } = await supabase
      .from('employer_employee_requests')
      .select(`
        *,
        employee:users!employee_id(
          id,
          full_name,
          email,
          phone,
          employee_id,
          profile_picture_url
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all join requests for an organization with filters
   */
  getAllJoinRequests: async (
    organizationId: string,
    filters?: {
      status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
      employeeId?: string;
    }
  ): Promise<EmployerEmployeeRequest[]> => {
    let query = supabase
      .from('employer_employee_requests')
      .select(`
        *,
        employee:users!employee_id(
          id,
          full_name,
          email,
          phone,
          employee_id,
          profile_picture_url
        ),
        reviewer:users!reviewed_by(
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get employee's own join requests
   */
  getEmployeeJoinRequests: async (employeeId: string): Promise<EmployerEmployeeRequest[]> => {
    const { data, error } = await supabase
      .from('employer_employee_requests')
      .select(`
        *,
        organization:organizations!organization_id(
          id,
          name
        ),
        reviewer:users!reviewed_by(
          id,
          full_name,
          email
        )
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a specific join request by ID
   */
  getJoinRequestById: async (requestId: string): Promise<EmployerEmployeeRequest | null> => {
    const { data, error } = await supabase
      .from('employer_employee_requests')
      .select(`
        *,
        employee:users!employee_id(
          id,
          full_name,
          email,
          phone,
          employee_id,
          profile_picture_url
        ),
        organization:organizations!organization_id(
          id,
          name
        ),
        reviewer:users!reviewed_by(
          id,
          full_name,
          email
        )
      `)
      .eq('id', requestId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Search employers by code, organization name, employer name, or email
   */
  searchEmployers: async (searchQuery: string, limit: number = 20, employeeId?: string): Promise<EmployerSearchResult[]> => {
    const { data, error } = await supabase
      .rpc('search_employers', {
        p_search_query: searchQuery,
        p_limit: limit,
        p_employee_id: employeeId || null
      });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get employer details by organization ID
   */
  getEmployerDetails: async (organizationId: string): Promise<{
    organization: any;
    employer: any;
  } | null> => {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    const { data: employer, error: empError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, employee_id')
      .eq('organization_id', organizationId)
      .eq('is_employer', true)
      .eq('is_active', true)
      .single();

    if (empError && empError.code !== 'PGRST116') throw empError;

    return {
      organization: org,
      employer: employer || null
    };
  },

  /**
   * Get employment history for an employee
   */
  getEmploymentHistory: async (employeeId: string): Promise<EmploymentHistory[]> => {
    // First, get the employment history with organization data
    const { data: historyData, error: historyError } = await supabase
      .from('employer_employee_history')
      .select(`
        *,
        organization:organizations!employer_employee_history_organization_id_fkey(
          id,
          name,
          owner_id
        ),
        approver:users!employer_employee_history_approved_by_fkey(
          id,
          full_name,
          email
        ),
        terminator:users!employer_employee_history_terminated_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('employee_id', employeeId)
      .order('joined_at', { ascending: false });

    if (historyError) throw historyError;
    if (!historyData || historyData.length === 0) return [];

    // Get unique owner IDs
    const ownerIds = [...new Set(
      historyData
        .map((h: any) => h.organization?.owner_id)
        .filter(Boolean)
    )];

    // Fetch all employer users in one query if we have owner IDs
    let employerMap = new Map();
    if (ownerIds.length > 0) {
      const { data: employers, error: employerError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', ownerIds);

      if (employerError) throw employerError;

      // Create a map for quick lookup
      employerMap = new Map(
        (employers || []).map((emp: any) => [emp.id, emp])
      );
    }

    // Transform and combine the data
    return historyData.map((item: any) => {
      const ownerId = item.organization?.owner_id;
      const employer = ownerId ? employerMap.get(ownerId) : null;

      return {
        ...item,
        employer_name: employer?.full_name || null,
        employer_email: employer?.email || null,
        organization: item.organization ? {
          id: item.organization.id,
          name: item.organization.name,
          owner: employer || null
        } : undefined
      };
    });
  },

  /**
   * Get current employment for an employee
   */
  getCurrentEmployment: async (employeeId: string): Promise<EmploymentHistory | null> => {
    const { data, error } = await supabase
      .from('employer_employee_history')
      .select(`
        *,
        organization:organizations!employer_employee_history_organization_id_fkey(
          id,
          name,
          owner_id
        ),
        approver:users!employer_employee_history_approved_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('employee_id', employeeId)
      .is('left_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    // Fetch employer user if we have an owner_id
    let employer = null;
    if (data.organization?.owner_id) {
      const { data: employerData, error: employerError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', data.organization.owner_id)
        .single();

      if (!employerError) {
        employer = employerData;
      }
    }

    // Transform the data to match expected structure
    return {
      ...data,
      employer_name: employer?.full_name || null,
      employer_email: employer?.email || null,
      organization: data.organization ? {
        id: data.organization.id,
        name: data.organization.name,
        owner: employer
      } : undefined
    } as any;
  },

  /**
   * Get all employees' employment history for an organization (HR view)
   */
  getOrganizationEmploymentHistory: async (
    organizationId: string,
    includeLeft: boolean = false
  ): Promise<EmploymentHistory[]> => {
    let query = supabase
      .from('employer_employee_history')
      .select(`
        *,
        employee:users!employee_id(
          id,
          full_name,
          email,
          phone,
          employee_id,
          profile_picture_url
        ),
        approver:users!approved_by(
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId);

    if (!includeLeft) {
      query = query.is('left_at', null);
    }

    query = query.order('joined_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Check if employee has pending request for an organization
   */
  hasPendingRequest: async (
    employeeId: string,
    organizationId: string
  ): Promise<boolean> => {
    const { data, error } = await supabase
      .from('employer_employee_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  /**
   * Check if employee is currently employed
   */
  isCurrentlyEmployed: async (employeeId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('employer_employee_history')
      .select('id')
      .eq('employee_id', employeeId)
      .is('left_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },
};
