import { useEffect, useState } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/types';
import { deviceMutations } from '@/lib/api/mutations/device.mutations';
import { extractSessionIdFromToken } from '@/lib/utils/device.utils';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // Handle invalid/expired refresh token gracefully
      if (error) {
        console.log('Session error (clearing invalid session):', error.message);
        // Clear invalid session data
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);

        // Register device info for restored session
        try {
          const sessionId = extractSessionIdFromToken(session.access_token);
          if (sessionId) {
            deviceMutations.registerDeviceInfo(sessionId, session.user.id);
          }
        } catch (deviceError) {
          console.error('Failed to register device info on restore:', deviceError);
        }
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle token refresh errors by signing out
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('Token refresh failed, signing out');
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Handle sign out event
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    user,
    loading,
    isAuthenticated: !!session,
    isEmployee: user?.role === 'employee',
    isHR: user?.role === 'hr' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
  };
};
