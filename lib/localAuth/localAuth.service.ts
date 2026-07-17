/**
 * Local Authentication Service
 * Handles biometric authentication with device PIN fallback
 */

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LocalAuthSettings,
  BiometricType,
  DEFAULT_LOCAL_AUTH_SETTINGS,
} from './localAuth.types';
import {
  LOCAL_AUTH_SETTINGS_KEY,
  AUTH_PROMPT_MESSAGE,
  AUTH_FALLBACK_LABEL,
  ERROR_NOT_SUPPORTED,
  ERROR_NOT_ENROLLED,
  ERROR_USER_CANCEL,
  ERROR_SYSTEM_CANCEL,
  ERROR_LOCKOUT,
  ERROR_UNKNOWN,
} from './localAuth.constants';

/**
 * Check if device has biometric hardware
 */
export const hasHardwareAsync = async (): Promise<boolean> => {
  try {
    return await LocalAuthentication.hasHardwareAsync();
  } catch {
    return false;
  }
};

/**
 * Check if biometrics are enrolled on the device
 */
export const isEnrolledAsync = async (): Promise<boolean> => {
  try {
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
};

/**
 * Get the security level of enrolled biometrics
 */
export const getEnrolledLevelAsync = async (): Promise<LocalAuthentication.SecurityLevel> => {
  try {
    return await LocalAuthentication.getEnrolledLevelAsync();
  } catch {
    return LocalAuthentication.SecurityLevel.NONE;
  }
};

/**
 * Whether the device currently has a usable secure lock enrolled
 * (biometric OR device PIN/pattern/password). If this is false the app
 * lock must NOT engage, otherwise the user would be permanently locked
 * out with no credential to unlock with.
 */
export const hasDeviceLock = async (): Promise<boolean> => {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
};

/**
 * Get available biometric types
 */
export const getBiometricType = async (): Promise<BiometricType> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  } catch {
    return 'none';
  }
};

/**
 * Get human-readable biometric name
 */
export const getBiometricName = (type: BiometricType): string => {
  switch (type) {
    case 'facial':
      return 'Face ID';
    case 'fingerprint':
      return 'Fingerprint';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometric';
  }
};

/**
 * Authenticate user with biometrics or device PIN
 * @param disableDeviceFallback - If true, only biometrics allowed (no PIN fallback)
 */
export const authenticate = async (
  disableDeviceFallback: boolean = false
): Promise<{ success: boolean; error?: string }> => {
  try {
    const hasHardware = await hasHardwareAsync();
    if (!hasHardware) {
      return { success: false, error: ERROR_NOT_SUPPORTED };
    }

    const isEnrolled = await isEnrolledAsync();
    if (!isEnrolled && disableDeviceFallback) {
      return { success: false, error: ERROR_NOT_ENROLLED };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: AUTH_PROMPT_MESSAGE,
      fallbackLabel: AUTH_FALLBACK_LABEL,
      disableDeviceFallback: disableDeviceFallback,
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      return { success: true };
    }

    // Handle different error types
    switch (result.error) {
      case 'user_cancel':
        return { success: false, error: ERROR_USER_CANCEL };
      case 'system_cancel':
        return { success: false, error: ERROR_SYSTEM_CANCEL };
      case 'lockout':
        return { success: false, error: ERROR_LOCKOUT };
      default:
        return { success: false, error: ERROR_UNKNOWN };
    }
  } catch (error) {
    return { success: false, error: ERROR_UNKNOWN };
  }
};

/**
 * Load settings from AsyncStorage
 * If no settings exist, saves and returns defaults (enabled by default)
 */
export const loadSettings = async (): Promise<LocalAuthSettings> => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_AUTH_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_LOCAL_AUTH_SETTINGS, ...JSON.parse(stored) };
    }
    // First time - save defaults so enabled state persists
    await saveSettings(DEFAULT_LOCAL_AUTH_SETTINGS);
    return DEFAULT_LOCAL_AUTH_SETTINGS;
  } catch {
    return DEFAULT_LOCAL_AUTH_SETTINGS;
  }
};

/**
 * Save settings to AsyncStorage
 */
export const saveSettings = async (settings: LocalAuthSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOCAL_AUTH_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save local auth settings:', error);
  }
};

/**
 * Clear all local auth settings (call on sign out)
 */
export const clearSettings = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LOCAL_AUTH_SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to clear local auth settings:', error);
  }
};

/**
 * Check if device supports any form of local authentication
 */
export const isLocalAuthSupported = async (): Promise<boolean> => {
  const hasHardware = await hasHardwareAsync();
  return hasHardware;
};
