import Constants from 'expo-constants';

// Expo SDK 53 removed notifications from Expo Go. Simply loading
// `expo-notifications` there logs an error, so we detect Expo Go and never
// import or call the native module in that environment.
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Fire an immediate local notification banner on this device.
 *
 * Use for actions the user performs on their own device (e.g. check-in /
 * check-out) where no server-side push is required. It's a safe no-op if the
 * native module isn't ready, permission is denied, or we're in Expo Go.
 */
export const presentLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  // Local notifications aren't available in Expo Go (SDK 53+). Skip entirely
  // so the native module is never loaded and no error is logged.
  if (isExpoGo) return;

  try {
    // Load lazily so `expo-notifications` is only evaluated in a dev/production
    // build, never in Expo Go.
    const Notifications =
      require('expo-notifications') as typeof import('expo-notifications');

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: 'default',
      },
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.warn('Failed to present local notification:', error);
  }
};
