import { WiFiVerificationStatus } from "@/lib/types";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import { PermissionsAndroid, Platform } from "react-native";

// On iOS, NetInfo will NOT attempt to read the WiFi SSID unless `shouldFetchWiFiSSID`
// is enabled. Without this, `state.details.ssid` is always null on iPhone, so office
// WiFi verification can never match and attendance check-in/out gets blocked.
// This requires the native requirements to be met as well (location permission +
// NSLocationWhenInUseUsageDescription, and the "Access WiFi Information" entitlement),
// otherwise enabling it leaks memory — both are configured in app.json's ios section.
NetInfo.configure({ shouldFetchWiFiSSID: true });

/**
 * Request location permissions required for WiFi SSID access
 * Note: Android 10+ requires location permission to access WiFi SSID
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    // Check if we already have permission
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

    if (existingStatus === "granted") {
      console.log("Location permission already granted");
    } else {
      // Request permission if not already granted
      console.log("Requesting location permission for WiFi SSID access...");
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Location permission denied:", status);
        return false;
      }
      console.log("Location permission granted");
    }

    // Android 12+ (API 31+) requires NEARBY_WIFI_DEVICES to read SSID
    if (Platform.OS === "android" && Platform.Version >= 31) {
      const wifiPermission = await PermissionsAndroid.request(
        "android.permission.NEARBY_WIFI_DEVICES" as any,
        {
          title: "WiFi Access Required",
          message: "This app needs WiFi access to verify your office network for attendance.",
          buttonPositive: "Allow",
        }
      );
      console.log("NEARBY_WIFI_DEVICES permission result:", wifiPermission);
      if (wifiPermission !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("NEARBY_WIFI_DEVICES permission denied");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error requesting location permissions:", error);
    return false;
  }
};

/**
 * On iOS, `CNCopyCurrentNetworkInfo` (which NetInfo uses to read the SSID) often
 * returns null until the app has actually exercised its location authorization at
 * least once this session. A single low-accuracy location fix "primes" it. This is
 * required in EVERY path that reads the SSID (scan AND check-in verification), not
 * just the scan screen. Failures here are harmless (e.g. Location Services off) — we
 * still attempt the SSID read afterwards.
 */
const primeiOSLocationForSSID = async (): Promise<void> => {
  if (Platform.OS !== "ios") return;
  try {
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });
  } catch (locErr) {
    console.log("Location prime for SSID read failed (continuing):", locErr);
  }
};

/**
 * Get current WiFi SSID
 * Returns null if not connected to WiFi or permissions not granted
 */
export const getCurrentWiFiSSID = async (): Promise<string | null> => {
  try {
    // iOS needs location authorization exercised before the SSID becomes readable.
    await primeiOSLocationForSSID();

    // Query the WiFi interface directly (not a possibly-cached bare fetch) so that,
    // together with `shouldFetchWiFiSSID`, the native SSID lookup is triggered on iOS.
    let state = await NetInfo.fetch("wifi");

    // The SSID frequently comes back null on the first read right after priming;
    // retry a few times with a short delay before giving up.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (state.type === "wifi" && (state.details as any)?.ssid) break;
      await new Promise((resolve) => setTimeout(resolve, 700));
      state = await NetInfo.fetch("wifi");
    }

    console.log("NetInfo state:", {
      type: state.type,
      isConnected: state.isConnected,
      details: state.details
    });

    if (state.type !== "wifi") {
      console.log("Not connected to WiFi. Network type:", state.type);
      return null;
    }

    // SSID is only available if location permissions are granted
    let ssid = state.details?.ssid || null;

    // Clean up SSID (remove quotes if present - Android sometimes adds them)
    if (ssid) {
      ssid = ssid.replace(/^"(.*)"$/, "$1");
    }

    console.log("WiFi SSID retrieved:", ssid);
    return ssid;
  } catch (error) {
    console.error("Error getting WiFi SSID:", error);
    return null;
  }
};

/**
 * Check if currently connected to any of the allowed office WiFi networks
 */
export const isConnectedToOfficeWiFi = async (
  allowedSSIDs: string[]
): Promise<boolean> => {
  const currentSSID = await getCurrentWiFiSSID();

  if (!currentSSID) {
    return false;
  }

  return allowedSSIDs.includes(currentSSID);
};

/**
 * Get comprehensive WiFi verification status
 */
export const getWiFiVerificationStatus = async (
  allowedSSIDs: string[]
): Promise<WiFiVerificationStatus> => {
  try {
    // Check location permissions
    const { status } = await Location.getForegroundPermissionsAsync();
    const permissionGranted = status === "granted";

    if (!permissionGranted) {
      return {
        isConnected: false,
        ssid: null,
        isOfficeWiFi: false,
        permissionGranted: false,
        error: "Location permission required to verify WiFi",
      };
    }

    // Get network state. Use getCurrentWiFiSSID so iOS location priming + SSID
    // retries are applied here too (a bare NetInfo.fetch() returns null on iPhone).
    const ssid = await getCurrentWiFiSSID();
    const state = await NetInfo.fetch("wifi");
    const isConnected = !!state.isConnected && state.type === "wifi";
    const isOfficeWiFi = ssid ? allowedSSIDs.includes(ssid) : false;

    return {
      isConnected,
      ssid,
      isOfficeWiFi,
      permissionGranted,
    };
  } catch (error) {
    return {
      isConnected: false,
      ssid: null,
      isOfficeWiFi: false,
      permissionGranted: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Format SSID for display (remove quotes if present)
 */
export const formatSSID = (ssid: string | null): string => {
  if (!ssid) return "Not connected";
  return ssid.replace(/^"(.*)"$/, "$1");
};

/**
 * Get list of available WiFi networks
 * Note: This only returns the currently connected network on mobile devices
 * For a full list of networks, we would need native modules which require additional setup
 */
export const getAvailableWiFiNetworks = async (): Promise<string[]> => {
  try {
    // Request location permissions first (required for the OS to expose the SSID)
    const permissionGranted = await requestLocationPermissions();

    if (!permissionGranted) {
      console.warn("Location permission required to scan WiFi networks");
      throw new Error(
        "Location permission is required to detect your WiFi network. Please grant location access in your device settings, then try again."
      );
    }

    // Give the OS a moment to process a freshly-granted permission.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // On iOS the SSID stays null until location authorization has been exercised
    // at least once this session; prime it (shared helper, no-op on Android).
    await primeiOSLocationForSSID();

    // Force a fresh read of the WiFi interface. Passing "wifi" (rather than a
    // bare fetch that may return a cached state) makes NetInfo query the WiFi
    // interface and, together with `shouldFetchWiFiSSID` (configured at the top
    // of this module), triggers the native SSID lookup on iOS.
    let state = await NetInfo.fetch("wifi");

    // The SSID often comes back null on the first read right after the
    // permission prompt; retry a few times with a short delay before giving up.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (state.isConnected && (state.details as any)?.ssid) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
      state = await NetInfo.fetch("wifi");
    }

    console.log("WiFi scan state:", {
      type: state.type,
      isConnected: state.isConnected,
      ssid: (state.details as any)?.ssid,
    });

    if (!state.isConnected) {
      throw new Error(
        "Not connected to WiFi. Please connect to your office WiFi network and try again."
      );
    }

    const rawSsid = (state.details as any)?.ssid as string | null | undefined;
    if (!rawSsid) {
      // Connected to WiFi, but the OS won't expose the network name. On iOS this
      // is a platform restriction, not a bug in the app.
      const hint =
        Platform.OS === "ios"
          ? "On iPhone, reading the WiFi name requires Location Services to be ON and this app's location permission set to “While Using the App”. If it still can't be read, just type the network name manually below."
          : "Please make sure Location Services are enabled, then try again — or type the network name manually below.";
      throw new Error(`Could not read your WiFi network name. ${hint}`);
    }

    const ssid = rawSsid.replace(/^"(.*)"$/, "$1");
    console.log("Successfully detected WiFi network:", ssid);
    return [ssid];
  } catch (error) {
    console.error("Error scanning WiFi networks:", error);
    throw error;
  }
};

