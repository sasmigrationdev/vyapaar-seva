import { supabase } from '@/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { employerMutations } from './employer.mutations';
import { deviceMutations } from './device.mutations';
import { extractSessionIdFromToken } from '@/lib/utils/device.utils';

export const authMutations = {
  /**
   * Sign up with email and password (legacy - kept for backward compatibility)
   */
  signUp: async (params: {
    email: string;
    password: string;
    fullName: string;
    employeeId: string;
    phone?: string;
    role?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          employee_id: params.employeeId,
          phone: params.phone,
          role: params.role || 'employee',
        },
      },
    });

    if (error) {
      // Log complete error details for debugging
      console.error('===== SIGNUP ERROR DETAILS =====');
      console.error('Error Message:', error.message);
      console.error('Error Name:', error.name);
      console.error('Error Status:', error.status);
      console.error('Full Error Object:', JSON.stringify(error, null, 2));
      console.error('================================');
      throw error;
    }
    return data;
  },

  /**
   * Sign up as employer (creates organization + employer user)
   */
  signUpAsEmployer: async (params: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }) => {
    // First, create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          role: 'hr',
        },
      },
    });

    if (authError) {
      console.error('===== EMPLOYER SIGNUP AUTH ERROR =====');
      console.error('Error Message:', authError.message);
      console.error('Full Error:', JSON.stringify(authError, null, 2));
      console.error('=====================================');
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    // Then, register as employer (creates organization)
    try {
      const employerData = await employerMutations.registerEmployer({
        authUserId: authData.user.id,
        fullName: params.fullName,
        email: params.email,
        organizationName: params.organizationName,
      });

      return {
        authData,
        employerData,
      };
    } catch (error) {
      console.error('===== EMPLOYER REGISTRATION ERROR =====');
      console.error('Error:', error);
      console.error('=======================================');
      throw error;
    }
  },

  /**
   * Sign up as employee (no organization assignment)
   */
  signUpAsEmployee: async (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          phone: params.phone,
          role: 'employee',
        },
      },
    });

    if (error) {
      console.error('===== EMPLOYEE SIGNUP ERROR =====');
      console.error('Error Message:', error.message);
      console.error('Full Error:', JSON.stringify(error, null, 2));
      console.error('================================');
      throw error;
    }

    return data;
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Register device info for this session
    if (data.session && data.user) {
      try {
        const sessionId = extractSessionIdFromToken(data.session.access_token);
        if (sessionId) {
          await deviceMutations.registerDeviceInfo(sessionId, data.user.id);
        }
      } catch (deviceError) {
        // Log but don't fail login
        console.error("Failed to register device info:", deviceError);
      }
    }

    return data;
  },

  /**
   * Sign out - local only (doesn't affect other devices)
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    
    // Clear AsyncStorage to prevent refresh token errors on restart
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key => key.includes('supabase'));
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  /**
   * Update password
   */
  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },
};
