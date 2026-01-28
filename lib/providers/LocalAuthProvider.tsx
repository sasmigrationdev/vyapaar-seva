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

  // Initialize local auth state
  const initialize = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const [hasHardware, isEnrolled, biometricType, settings] = await Promise.all([
        hasHardwareAsync(),
        isEnrolledAsync(),
        getBiometricType(),
        loadSettings(),
      ]);

      setState((prev) => ({
        ...prev,
        isBiometricSupported: hasHardware,
        isBiometricEnrolled: isEnrolled,
        biometricType,
        isEnabled: settings.enabled,
        // Lock the app if auth is enabled and user is authenticated
        isLocked: settings.enabled && isAuthenticated,
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
      // App came to foreground from background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Lock if enabled and authenticated
        if (state.isEnabled && isAuthenticated) {
          setState((prev) => ({ ...prev, isLocked: true, authError: null }));
        }
      }
      appState.current = nextAppState;
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
      setState((prev) => ({ ...prev, isLocked: true, authError: null }));
    }
    prevIsAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, state.isEnabled]);

  // Authenticate user
  const authenticate = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isAuthenticating: true, authError: null }));

    try {
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
