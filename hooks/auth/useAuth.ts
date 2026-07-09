import { useContext } from 'react';
import { AuthContext, AuthContextValue } from '@/lib/providers/AuthProvider';

/**
 * Read the shared auth state.
 *
 * Auth is a single context provider (see `AuthProvider`) mounted once at the
 * root, so every call site shares the same session/user, one subscription and
 * one profile fetch. Do NOT turn this back into a self-contained hook with its
 * own `useState`/`onAuthStateChange` — that stacks up duplicate subscriptions
 * and network calls on every screen and can deadlock the auth lock.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider } from '@/lib/providers/AuthProvider';
export type { AuthContextValue } from '@/lib/providers/AuthProvider';
