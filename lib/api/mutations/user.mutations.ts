import { supabase } from '@/lib/supabase/client';
import { UserRole } from '@/lib/types';

export const userMutations = {
  /**
   * Update user profile
   */
  updateProfile: async (
    userId: string,
    updates: Partial<{
      full_name: string;
      phone: string;
      department: string;
      designation: string;
      profile_picture_url: string;
      bank_name: string;
      account_number: string;
      ifsc_code: string;
      account_holder_name: string;
      branch_name: string;
      aadhaar_number: string;
      date_of_birth: string;
    }>
  ) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create employee (HR only)
   */
  createEmployee: async (params: {
    email: string;
    password: string;
    fullName: string;
    employeeId: string;
    phone?: string;
    role: UserRole;
    department?: string;
    designation?: string;
    dateOfJoining?: string;
  }) => {
    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          employee_id: params.employeeId,
          phone: params.phone,
          role: params.role,
        },
      },
    });

    if (authError) throw authError;

    // Update additional details in users table
    if (authData.user) {
      const { data, error } = await supabase
        .from('users')
        .update({
          department: params.department,
          designation: params.designation,
          date_of_joining: params.dateOfJoining,
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    return null;
  },

  /**
   * Update employee (HR only)
   */
  updateEmployee: async (
    userId: string,
    updates: Partial<{
      full_name: string;
      email: string;
      phone: string;
      role: UserRole;
      department: string;
      designation: string;
      date_of_joining: string;
      is_active: boolean;
      bank_name: string;
      account_number: string;
      ifsc_code: string;
      account_holder_name: string;
      branch_name: string;
      aadhaar_number: string;
      date_of_birth: string;
    }>
  ) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deactivate employee (HR only)
   */
  deactivateEmployee: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Activate employee (HR only)
   */
  activateEmployee: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete employee and all related data (HR only)
   * This will delete:
   * - Attendance records
   * - Salary records
   * - Leave requests
   * - Notifications
   * - Monthly earnings
   * - User account (from both public.users and auth.users)
   */
  deleteEmployee: async (userId: string) => {
    console.log('🗑️ [deleteEmployee] Starting deletion for userId:', userId);

    try {
      // Call the database function to delete employee and all related data
      console.log('🗑️ [deleteEmployee] Calling RPC function with params:', { p_employee_id: userId });

      const { data, error } = await supabase.rpc('delete_employee_with_cascade', {
        p_employee_id: userId,
      });

      if (error) {
        console.error('❌ [deleteEmployee] RPC Error:', error);
        console.error('❌ [deleteEmployee] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('✅ [deleteEmployee] Success! Response data:', data);
      return data;
    } catch (err) {
      console.error('❌ [deleteEmployee] Caught exception:', err);
      throw err;
    }
  },

  /**
   * Reset password with old password verification
   * This is secure because:
   * 1. User must be authenticated (session exists)
   * 2. Old password is verified via re-authentication
   * 3. Supabase Auth handles the password update for the current session
   */
  resetPassword: async (params: {
    email: string;
    oldPassword: string;
    newPassword: string;
  }) => {
    // First, verify the old password by attempting to sign in
    // This ensures the user knows their current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.oldPassword,
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    // Update password for the currently authenticated user
    // This only works if the user is authenticated
    const { data, error } = await supabase.auth.updateUser({
      password: params.newPassword,
    });

    if (error) throw error;
    return data;
  },
};
