import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
// Type-only import: erased at build time so `expo-notifications` is NOT loaded
// just to reference its types. The runtime module is required lazily below.
import type * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "expo-router";

// Check if running in Expo Go (push notifications not supported in SDK 53+)
const isExpoGo = Constants.appOwnership === "expo";

// Load the native module lazily so it is never evaluated inside Expo Go, where
// SDK 53+ removed notifications and logs an error the moment it is loaded.
// All runtime usages below are already guarded by `!isExpoGo`, so this is
// non-null wherever it's actually called.
const NativeNotifications: typeof import("expo-notifications") | null = isExpoGo
  ? null
  : require("expo-notifications");

// Check if Firebase is properly configured (for Android FCM)
const isFirebaseConfigured = (): boolean => {
  if (Platform.OS !== "android") return true;
  // Will be false if google-services.json is missing
  return Constants.expoConfig?.android?.googleServicesFile !== undefined;
};

// Configure notification handler (only if not in Expo Go)
// Wrapped in try-catch to prevent crashes if native module isn't ready
if (!isExpoGo) {
  try {
    NativeNotifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn("Failed to set notification handler:", error);
  }
}

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
  isRegistering: boolean;
  isExpoGo: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    error: null,
    permissionStatus: null,
    isRegistering: false,
    isExpoGo: isExpoGo,
  });

  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  // Registration lock and debounce
  const isRegistrationInProgress = useRef(false);
  const lastRetryTime = useRef(0);
  const hasInitializedForUser = useRef<string | null>(null);
  const MIN_RETRY_INTERVAL = 5000; // 5 seconds between retries

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    // Prevent duplicate registrations
    if (isRegistrationInProgress.current) {
      console.log("Registration already in progress, skipping...");
      return null;
    }

    // Check retry interval to prevent rapid retries hitting FCM rate limit
    const now = Date.now();
    if (now - lastRetryTime.current < MIN_RETRY_INTERVAL && lastRetryTime.current > 0) {
      console.log("Too soon to retry, please wait...");
      setState((prev) => ({
        ...prev,
        error: "Please wait a few seconds before trying again",
      }));
      return null;
    }

    isRegistrationInProgress.current = true;
    lastRetryTime.current = now;

    // Skip in Expo Go (not supported in SDK 53+)
    if (isExpoGo) {
      console.log("Push notifications are not supported in Expo Go (SDK 53+). Use a development build.");
      setState((prev) => ({
        ...prev,
        error: "Push notifications require a development build (not supported in Expo Go)",
      }));
      isRegistrationInProgress.current = false;
      return null;
    }

    // Check Firebase configuration on Android
    if (Platform.OS === "android" && !isFirebaseConfigured()) {
      console.warn("Push notifications: Firebase not configured. Add google-services.json to enable.");
      setState((prev) => ({
        ...prev,
        error: "Firebase not configured. Push notifications disabled.",
      }));
      isRegistrationInProgress.current = false;
      return null;
    }

    if (!Device.isDevice) {
      setState((prev) => ({
        ...prev,
        error: "Push notifications require a physical device",
      }));
      isRegistrationInProgress.current = false;
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await NativeNotifications!.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== "granted") {
        const { status } = await NativeNotifications!.requestPermissionsAsync();
        finalStatus = status;
      }

      setState((prev) => ({ ...prev, permissionStatus: finalStatus }));

      if (finalStatus !== "granted") {
        setState((prev) => ({
          ...prev,
          error: "Permission not granted for push notifications",
        }));
        isRegistrationInProgress.current = false;
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await NativeNotifications!.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      setState((prev) => ({ ...prev, expoPushToken: token, error: null }));

      // Configure Android channel
      if (Platform.OS === "android") {
        await NativeNotifications!.setNotificationChannelAsync("default", {
          name: "Default",
          importance: NativeNotifications!.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#138808",
          sound: "default",
        });
      }

      isRegistrationInProgress.current = false;
      return token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle Firebase not initialized error gracefully
      if (errorMessage.includes("FirebaseApp is not initialized") ||
          errorMessage.includes("Default FirebaseApp")) {
        console.warn("Push notification error:", errorMessage);
        setState((prev) => ({
          ...prev,
          error: "Firebase not configured. Add google-services.json and rebuild.",
        }));
        isRegistrationInProgress.current = false;
        return null;
      }

      // Handle too many registrations error (FCM rate limit)
      if (errorMessage.includes("TOO_MANY_REGISTRATIONS")) {
        console.warn("FCM rate limit hit, trying native token fallback...");

        // Try getting native device token as fallback
        try {
          const deviceTokenData = await NativeNotifications!.getDevicePushTokenAsync();
          const deviceToken = deviceTokenData.data;
          console.log("Got native device token as fallback:", deviceToken);

          // Store native token and let user know
          setState((prev) => ({
            ...prev,
            error: "FCM rate limit reached. Please wait a few hours and try again.",
          }));
        } catch (fallbackError) {
          console.error("Native token fallback also failed:", fallbackError);
          setState((prev) => ({
            ...prev,
            error: "FCM rate limit. Please wait 24 hours, or try on a different device.",
          }));
        }

        isRegistrationInProgress.current = false;
        return null;
      }

      setState((prev) => ({ ...prev, error: errorMessage }));
      console.error("Error registering for push notifications:", error);
      isRegistrationInProgress.current = false;
      return null;
    }
  }, []);

  // Save token to database
  const savePushToken = useCallback(async (token: string): Promise<boolean> => {
    if (!user?.id) {
      console.log("Cannot save push token: No user ID");
      return false;
    }

    try {
      console.log("Saving push token for user:", user.id);
      const { error } = await supabase
        .from("users")
        .update({ expo_push_token: token })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving push token:", error);
        setState((prev) => ({
          ...prev,
          error: `Failed to save token: ${error.message}`,
        }));
        return false;
      }

      console.log("Push token saved successfully for user:", user.id);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error saving push token:", error);
      setState((prev) => ({
        ...prev,
        error: `Failed to save token: ${errorMessage}`,
      }));
      return false;
    }
  }, [user?.id]);

  // Manual retry registration function
  const retryRegistration = useCallback(async (): Promise<boolean> => {
    console.log("=== RETRY PUSH NOTIFICATION REGISTRATION ===");
    console.log("User ID:", user?.id);
    console.log("Is Expo Go:", isExpoGo);

    if (!user?.id) {
      setState((prev) => ({
        ...prev,
        error: "Please log in to enable notifications",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isRegistering: true, error: null }));

    try {
      const token = await registerForPushNotifications();
      console.log("Registration result - Token:", token ? "obtained" : "null");

      if (token) {
        const saved = await savePushToken(token);
        console.log("Token save result:", saved);
        setState((prev) => ({ ...prev, isRegistering: false }));
        return saved;
      }

      setState((prev) => ({ ...prev, isRegistering: false }));
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Retry registration failed:", error);
      setState((prev) => ({
        ...prev,
        isRegistering: false,
        error: `Registration failed: ${errorMessage}`,
      }));
      return false;
    }
  }, [user?.id, registerForPushNotifications, savePushToken]);

  // Handle notification tap - navigate to relevant screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped:", data);

      if (!data) return;

      // Navigate based on notification type
      switch (data.type) {
        case "leave":
          if (user?.role === "hr" || user?.role === "admin") {
            router.push("/(hr)/leave");
          } else {
            router.push("/(employee)/leave");
          }
          break;
        case "attendance":
          if (user?.role === "hr" || user?.role === "admin") {
            router.push("/(hr)/employees");
          } else {
            router.push("/(employee)/attendance");
          }
          break;
        case "system":
          if (data.relatedType === "join_request") {
            if (user?.role === "hr" || user?.role === "admin") {
              router.push("/(hr)/join-requests");
            }
          }
          break;
      }
    },
    [user?.role, router]
  );

  // Keep the latest tap-handler in a ref so the init effect can call it without
  // listing it as a dependency. In expo-router v6 `useRouter()` returns a fresh
  // object each render, so depending on `handleNotificationResponse` directly
  // tears down + re-runs the init effect every render — which resets the init
  // guard and re-registers the push token in an infinite loop (JS thread freeze).
  const handleNotificationResponseRef = useRef(handleNotificationResponse);
  useEffect(() => {
    handleNotificationResponseRef.current = handleNotificationResponse;
  }, [handleNotificationResponse]);

  // Initialize push notifications
  useEffect(() => {
    if (!user?.id) return;

    // Skip all notification setup in Expo Go
    if (isExpoGo) {
      console.log("Skipping push notification setup in Expo Go");
      return;
    }

    // Prevent re-initialization for the same user
    if (hasInitializedForUser.current === user.id) {
      console.log("Push notifications already initialized for this user");
      return;
    }

    const initializePushNotifications = async () => {
      hasInitializedForUser.current = user.id;
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    };

    initializePushNotifications();

    // Listen for incoming notifications (foreground)
    notificationListener.current = NativeNotifications!.addNotificationReceivedListener(
      (notification) => {
        setState((prev) => ({ ...prev, notification }));
        console.log("Notification received:", notification);
      }
    );

    // Listen for notification taps. Call through the ref so the latest handler
    // (current role/router) is used without adding it as an effect dependency.
    responseListener.current = NativeNotifications!.addNotificationResponseReceivedListener(
      (response) => handleNotificationResponseRef.current(response)
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      // Reset initialization flag on cleanup (user logout). This effect now
      // depends ONLY on `user?.id`, so this cleanup runs solely when the user
      // actually changes or the hook unmounts — never on every render — so it
      // can no longer defeat the init guard mid-session.
      hasInitializedForUser.current = null;
    };
    // Depend only on `user?.id`. The registration callbacks are stable / reached
    // via ref; adding them re-registers the token in a loop (see ref above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Clear push token on logout
  const clearPushToken = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from("users")
        .update({ expo_push_token: null })
        .eq("id", user.id);
      setState((prev) => ({ ...prev, expoPushToken: null }));
    } catch (error) {
      console.error("Error clearing push token:", error);
    }
  }, [user?.id]);

  return {
    ...state,
    registerForPushNotifications,
    retryRegistration,
    clearPushToken,
  };
};
