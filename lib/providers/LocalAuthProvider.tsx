/**
 * Local Authentication Provider
 * Manages app lock state and biometric/PIN authentication
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  LocalAuthContextValue,
  LocalAuthState,
  BiometricType,
  DEFAULT_LOCAL_AUTH_SETTINGS,
} from '@/lib/localAuth/localAuth.types';
import {
  hasHardwareAsync,
  isEnrolledAsync,
  getBiometricType,
  hasDeviceLock,
  authenticate as authenticateService,
  loadSettings,
  saveSettings,
  clearSettings,
} from '@/lib/localAuth/localAuth.service';

const initialState: LocalAuthState = {
  isLocked: false,
  isEnabled: true, // Enabled by default
  isBiometricSupported: false,
  isBiometricEnrolled: false,
  biometricType: 'none',
  isAuthenticating: false,
  authError: null,
};

const LocalAuthContext = createContext<LocalAuthContextValue | null>(null);

interface LocalAuthProviderProps {
  children: React.ReactNode;
  /** Whether user is authenticated with Supabase */
  isAuthenticated: boolean;
  /** Callback when user signs out - clears local auth settings */
  onSignOut?: () => void;
}

export function LocalAuthProvider({
  children,
  isAuthenticated,
}: LocalAuthProviderProps) {
  const [state, setState] = useState<LocalAuthState>(initialState);
  const appState = useRef(AppState.currentState);
  const hasInitialized = useRef(false);
  const prevIsAuthenticated = useRef(isAuthenticated);
  // Tracks whether a biometric/PIN prompt is currently on screen. The prompt
  // pushes the app into `inactive`/`background`, and we must NOT re-lock while
  // it is up, otherwise unlocking loops forever.
  const isAuthenticatingRef = useRef(false);

  // Initialize local auth state
  const initialize = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const [hasHardware, isEnrolled, biometricType, settings, deviceLock] =
        await Promise.all([
          hasHardwareAsync(),
          isEnrolledAsync(),
          getBiometricType(),
          loadSettings(),
          hasDeviceLock(),
        ]);

      setState((prev) => ({
        ...prev,
        isBiometricSupported: hasHardware,
        isBiometricEnrolled: isEnrolled,
        biometricType,
        isEnabled: settings.enabled,
        // Lock only if enabled, authenticated, AND the device still has a
        // secure lock to unlock with. Without one the user would be stranded.
        isLocked: settings.enabled && isAuthenticated && deviceLock,
      }));
    } catch (error) {
      console.error('Failed to initialize local auth:', error);
    }
  }, [isAuthenticated]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevAppState = appState.current;
      appState.current = nextAppState;

      // Only re-lock when returning from a TRUE background. We deliberately
      // ignore the transient `inactive` state: iOS enters `inactive` while the
      // biometric prompt is on screen, so treating it as a foreground event
      // would re-lock the app the instant the user unlocks it -> infinite loop.
      if (prevAppState !== 'background' || nextAppState !== 'active') {
        return;
      }

      // A prompt is still up (e.g. the app briefly backgrounded during auth) —
      // never re-lock mid-authentication.
      if (isAuthenticatingRef.current) return;

      if (state.isEnabled && isAuthenticated) {
        // Re-check the device lock: the user may have removed their phone's
        // screen lock while the app was backgrounded. If there's no secure
        // lock left, don't engage the app lock (they couldn't unlock it).
        hasDeviceLock().then((deviceLock) => {
          setState((prev) => ({
            ...prev,
            isLocked: deviceLock,
            authError: null,
          }));
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [state.isEnabled, isAuthenticated]);

  // Reset lock state when user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      setState((prev) => ({
        ...prev,
        isLocked: false,
        authError: null,
      }));
    }
  }, [isAuthenticated]);

  // Lock app when user becomes authenticated (initial session restore)
  // This handles the race condition where initialize() runs before session is loaded
  useEffect(() => {
    // User just became authenticated (session was restored)
    if (!prevIsAuthenticated.current && isAuthenticated && state.isEnabled) {
      // Only lock if the device actually has a secure lock to unlock with.
      hasDeviceLock().then((deviceLock) => {
        if (deviceLock) {
          setState((prev) => ({ ...prev, isLocked: true, authError: null }));
        }
      });
    }
    prevIsAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, state.isEnabled]);

  // Authenticate user
  const authenticate = useCallback(async (): Promise<boolean> => {
    // Guard against re-entrancy: the lock screen auto-triggers this on mount
    // and also on button press, which could fire two overlapping prompts.
    if (isAuthenticatingRef.current) return false;
    isAuthenticatingRef.current = true;
    setState((prev) => ({ ...prev, isAuthenticating: true, authError: null }));

    try {
      // If the device no longer has a secure lock (screen lock removed), there
      // is nothing to authenticate against — just unlock rather than trap the
      // user on the lock screen forever.
      if (!(await hasDeviceLock())) {
        setState((prev) => ({
          ...prev,
          isLocked: false,
          isAuthenticating: false,
          authError: null,
        }));
        return true;
      }

      // Use device fallback (PIN/pattern) if biometrics fail
      const result = await authenticateService(false);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          isLocked: false,
          isAuthenticating: false,
          authError: null,
        }));
        return true;
      }

      setState((prev) => ({
        ...prev,
        isAuthenticating: false,
        authError: result.error || 'Authentication failed',
      }));
      return false;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isAuthenticating: false,
        authError: 'Authentication failed',
      }));
      return false;
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  // Lock the app manually
  const lock = useCallback(() => {
    if (state.isEnabled && isAuthenticated) {
      setState((prev) => ({ ...prev, isLocked: true, authError: null }));
    }
  }, [state.isEnabled, isAuthenticated]);

  // Enable local authentication
  const enable = useCallback(async () => {
    // First authenticate to confirm identity
    const result = await authenticateService(false);
    if (!result.success) {
      throw new Error(result.error || 'Authentication required to enable');
    }

    await saveSettings({ ...DEFAULT_LOCAL_AUTH_SETTINGS, enabled: true });
    setState((prev) => ({ ...prev, isEnabled: true }));
  }, []);

  // Disable local authentication
  const disable = useCallback(async () => {
    // First authenticate to confirm identity
    const result = await authenticateService(false);
    if (!result.success) {
      throw new Error(result.error || 'Authentication required to disable');
    }

    await saveSettings({ ...DEFAULT_LOCAL_AUTH_SETTINGS, enabled: false });
    setState((prev) => ({ ...prev, isEnabled: false, isLocked: false }));
  }, []);

  // Toggle local authentication
  const toggle = useCallback(async () => {
    if (state.isEnabled) {
      await disable();
    } else {
      await enable();
    }
  }, [state.isEnabled, enable, disable]);

  // Check if device supports local auth
  const checkSupport = useCallback(async (): Promise<boolean> => {
    const hasHardware = await hasHardwareAsync();
    const isEnrolled = await isEnrolledAsync();
    return hasHardware && isEnrolled;
  }, []);

  const contextValue: LocalAuthContextValue = {
    ...state,
    authenticate,
    lock,
    enable,
    disable,
    toggle,
    checkSupport,
  };

  return (
    <LocalAuthContext.Provider value={contextValue}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth(): LocalAuthContextValue {
  const context = useContext(LocalAuthContext);
  if (!context) {
    throw new Error('useLocalAuth must be used within a LocalAuthProvider');
  }
  return context;
}

// Export clear settings for use in sign out
export { clearSettings as clearLocalAuthSettings };
