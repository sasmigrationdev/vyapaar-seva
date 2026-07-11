import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/types';
import { deviceMutations } from '@/lib/api/mutations/device.mutations';
import { extractSessionIdFromToken } from '@/lib/utils/device.utils';

const AUTH_INIT_TIMEOUT_MS = 10000; // 10 seconds max for auth initialization
const PROFILE_FETCH_TIMEOUT_MS = 5000; // 5 seconds for profile fetch

const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
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

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmployee: boolean;
  isHR: boolean;
  isAdmin: boolean;
  needsRoleSelection: boolean;
  refetchProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for auth state.
 *
 * IMPORTANT: This MUST be a context provider mounted once at the root. Earlier
 * `useAuth` was a plain hook, so every one of the ~38 call sites created its own
 * `onAuthStateChange` subscription + `getSession()`/profile fetch. Those stacked
 * up as screens mounted (duplicate network calls on every navigation/auth event)
 * and the profile fetch ran *inside* the auth-state-change callback, which holds
 * the GoTrue lock and can deadlock the whole app. One provider fixes both.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 means no rows found - user doesn't have a profile yet
        // (e.g. first Google sign-in) → needs role selection.
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
  }, []);

  useEffect(() => {
    // Safety timeout: ensure loading state resolves within 10 seconds so the
    // app never hangs indefinitely on cold start.
    initTimeoutRef.current = setTimeout(() => {
      console.warn('Auth initialization timeout - forcing completion');
      setLoading(false);
    }, AUTH_INIT_TIMEOUT_MS);

    const clearInitTimeout = () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    };

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // Handle invalid/expired refresh token gracefully
      if (error) {
        console.log('Session error (clearing invalid session):', error.message);
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setUser(null);
        setLoading(false);
        clearInitTimeout();
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

      clearInitTimeout();
    });

    // Listen for auth changes.
    //
    // The callback runs while GoTrue holds an internal lock, so it must NOT
    // await other Supabase calls (DB queries, signOut) directly — doing so can
    // deadlock. We update React state synchronously and defer every Supabase
    // call to a microtask via setTimeout(0).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Token refresh failed → drop the session.
      if (event === 'TOKEN_REFRESHED' && !nextSession) {
        console.log('Token refresh failed, signing out');
        setSession(null);
        setUser(null);
        setLoading(false);
        setTimeout(() => {
          supabase.auth.signOut({ scope: 'local' });
        }, 0);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(nextSession);

      // Defer the profile fetch out of the auth-state-change callback.
      setTimeout(async () => {
        if (nextSession?.user) {
          try {
            await withTimeout(
              fetchUserProfile(nextSession.user.id),
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
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
      clearInitTimeout();
    };
  }, [fetchUserProfile]);

  // Manually refetch user profile (useful after profile updates)
  const refetchProfile = useCallback(async () => {
    if (session?.user?.id) {
      try {
        await fetchUserProfile(session.user.id);
      } catch (error) {
        console.error('Error refetching profile:', error);
      }
    }
  }, [session?.user?.id, fetchUserProfile]);

  const value: AuthContextValue = {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
