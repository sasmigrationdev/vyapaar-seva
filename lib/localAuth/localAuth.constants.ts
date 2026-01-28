/**
 * Local Authentication Constants
 */

// AsyncStorage key for settings
export const LOCAL_AUTH_SETTINGS_KEY = '@vyapaarsewa:local_auth_settings';

// Prompt messages
export const AUTH_PROMPT_MESSAGE = 'Verify your identity to access Vyapaar Sewa';
export const AUTH_CANCEL_LABEL = 'Cancel';
export const AUTH_FALLBACK_LABEL = 'Use Device PIN';

// Error messages
export const ERROR_NOT_SUPPORTED = 'Biometric authentication is not supported on this device';
export const ERROR_NOT_ENROLLED = 'No biometrics enrolled. Please set up Face ID, Touch ID, or Fingerprint in your device settings.';
export const ERROR_USER_CANCEL = 'Authentication was cancelled';
export const ERROR_SYSTEM_CANCEL = 'Authentication was cancelled by the system';
export const ERROR_LOCKOUT = 'Too many failed attempts. Please try again later.';
export const ERROR_UNKNOWN = 'Authentication failed. Please try again.';
