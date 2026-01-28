import { useEffect, useState, useRef } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/types';
import { deviceMutations } from '@/lib/api/mutations/device.mutations';
import { extractSessionIdFromToken } from '@/lib/utils/device.utils';

const AUTH_INIT_TIMEOUT_MS = 10000; // 10 seconds max for auth initialization
const PROFILE_FETCH_TIMEOUT_MS = 5000; // 5 seconds for profile fetch

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Safety timeout: ensure loading state resolves within 10 seconds
    // This prevents the app from hanging indefinitely on cold start
    initTimeoutRef.current = setTimeout(async () => {
      console.warn('Auth initialization timeout - forcing completion');
      setLoading(false);
    }, AUTH_INIT_TIMEOUT_MS);

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
        // Clear master timeout after handling error
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        return;
      }

      setSession(session);
      if (session?.user) {
        try {
          await withTimeout(
            fetchUserProfile(session.user.id),
            PROFILE_FETCH_TIMEOUT_MS,
            'Profile fetch timeout on session restore'
          );
        } catch (profileError) {
          console.warn('Profile fetch failed:', profileError);
          // Must set loading false here - if timeout fired, fetchUserProfile is still pending
          // and its finally block won't run until the network call completes (if ever)
          setLoading(false);
        }

        // Register device info for restored session (non-blocking)
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

      // Clear master timeout AFTER everything is done
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
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
        try {
          await withTimeout(
            fetchUserProfile(session.user.id),
            PROFILE_FETCH_TIMEOUT_MS,
            'Profile fetch timeout on auth change'
          );
        } catch (profileError) {
          console.warn('Profile fetch on auth change failed:', profileError);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      // Clear timeout on unmount
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 means no rows found - user doesn't have a profile yet
        // This happens when a user signs in with Google for the first time
        if (error.code === 'PGRST116') {
          console.log('User profile not found - needs role selection');
          setNeedsRoleSelection(true);
          setUser(null);
        } else {
          throw error;
        }
      } else {
        setUser(data);
        setNeedsRoleSelection(false);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
      setNeedsRoleSelection(false);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refetch user profile (useful after profile updates)
  const refetchProfile = async () => {
    if (session?.user?.id) {
      try {
        await fetchUserProfile(session.user.id);
      } catch (error) {
        console.error('Error refetching profile:', error);
      }
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
    needsRoleSelection,
    refetchProfile,
  };
};
