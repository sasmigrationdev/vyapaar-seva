import { supabase } from '@/lib/supabase/client';
import { Platform } from 'react-native';

export interface SessionInfo {
  id: string;
  userId: string;
  deviceName: string;
  deviceModel: string | null;
  deviceManufacturer: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: string;
  platform: string;
  lastActive: string;
  ipAddress?: string;
  isCurrent: boolean;
  userAgent?: string;
  createdAt?: string;
  appVersion?: string | null;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export const sessionQueries = {
  /**
   * Get all active sessions for the current user (HR only)
   * Uses Supabase Edge Function with Admin API
   */
  getAllSessions: async (): Promise<SessionInfo[]> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('No active session');
        return [];
      }

      // Check if user is HR
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userData?.role !== 'hr') {
        // Not HR, return current session only
        return [await sessionQueries.getCurrentSession()].filter(Boolean) as SessionInfo[];
      }

      // Call Edge Function to get all sessions
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/list-user-sessions`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch sessions:', response.status, response.statusText);
        // Fallback to current session
        return [await sessionQueries.getCurrentSession()].filter(Boolean) as SessionInfo[];
      }

      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      console.error('Error getting all sessions:', error);
      // Fallback to current session
      return [await sessionQueries.getCurrentSession()].filter(Boolean) as SessionInfo[];
    }
  },

  /**
   * Get current session information
   */
  getCurrentSession: async (): Promise<SessionInfo | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return null;
      }

      // Get device information based on platform
      const deviceName = Platform.OS === 'ios' 
        ? 'iPhone/iPad' 
        : Platform.OS === 'android' 
        ? 'Android Device' 
        : Platform.OS === 'web'
        ? 'Web Browser'
        : 'Unknown Device';
      
      const deviceType = Platform.OS === 'web' ? 'Desktop/Web' : 'Mobile';
      
      return {
        id: session.access_token.substring(0, 16),
        userId: session.user.id,
        deviceName,
        deviceModel: null,
        deviceManufacturer: null,
        osName: null,
        osVersion: null,
        deviceType,
        platform: Platform.OS,
        lastActive: new Date().toISOString(),
        isCurrent: true,
        userAgent: session.user.user_metadata?.user_agent,
        appVersion: null,
      };
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  },

  /**
   * Get session count
   */
  getSessionCount: async (): Promise<number> => {
    try {
      const sessions = await sessionQueries.getAllSessions();
      return sessions.length;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  },

  /**
   * Sign out from current device
   */
  signOutCurrentDevice: async (): Promise<void> => {
    await supabase.auth.signOut({ scope: 'local' });
  },

  /**
   * Sign out from all devices (global sign out)
   */
  signOutAllDevices: async (): Promise<void> => {
    await supabase.auth.signOut({ scope: 'global' });
  },

  /**
   * Revoke a specific session by ID (HR only)
   */
  revokeSession: async (sessionId: string): Promise<void> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      throw new Error('No active session');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/revoke-session`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke session');
    }
  },
};

