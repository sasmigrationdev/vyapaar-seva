/**
 * Local Authentication Types
 * Uses device biometrics (Face ID/Touch ID/Fingerprint) with device PIN fallback
 */

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface LocalAuthSettings {
  /** Whether local auth is enabled */
  enabled: boolean;
  /** Whether to prefer biometric over device PIN */
  preferBiometric: boolean;
}

export interface LocalAuthState {
  /** Whether the app is currently locked */
  isLocked: boolean;
  /** Whether local auth is enabled in settings */
  isEnabled: boolean;
  /** Whether the device supports biometrics */
  isBiometricSupported: boolean;
  /** Whether biometrics are enrolled on the device */
  isBiometricEnrolled: boolean;
  /** Type of biometric available */
  biometricType: BiometricType;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Last authentication error */
  authError: string | null;
}

export interface LocalAuthContextValue extends LocalAuthState {
  /** Trigger authentication prompt */
  authenticate: () => Promise<boolean>;
  /** Lock the app manually */
  lock: () => void;
  /** Enable local authentication */
  enable: () => Promise<void>;
  /** Disable local authentication */
  disable: () => Promise<void>;
  /** Toggle local authentication */
  toggle: () => Promise<void>;
  /** Check if device supports local auth */
  checkSupport: () => Promise<boolean>;
}

export const DEFAULT_LOCAL_AUTH_SETTINGS: LocalAuthSettings = {
  enabled: true, // App lock enabled by default for security
  preferBiometric: true,
};
