import { WiFiVerificationStatus } from "@/lib/types";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import { Platform } from "react-native";

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
      return true;
    }

    // Request permission if not already granted
    console.log("Requesting location permission for WiFi SSID access...");
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === "granted") {
      console.log("Location permission granted");
      return true;
    } else {
      console.log("Location permission denied:", status);
      return false;
    }
  } catch (error) {
    console.error("Error requesting location permissions:", error);
    return false;
  }
};

/**
 * Get current WiFi SSID
 * Returns null if not connected to WiFi or permissions not granted
 */
export const getCurrentWiFiSSID = async (): Promise<string | null> => {
  try {
    const state = await NetInfo.fetch();

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

    // Get network state
    const state = await NetInfo.fetch();
    const isConnected = state.isConnected && state.type === "wifi";
    const ssid = state.details?.ssid || null;
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
    // Request location permissions first
    const permissionGranted = await requestLocationPermissions();
    
    if (!permissionGranted) {
      console.warn("Location permission required to scan WiFi networks");
      throw new Error("Location permission is required to scan WiFi networks. Please grant permission in your device settings.");
    }

    // Wait a moment for the system to process the permission grant
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch fresh network state after permissions are granted
    const state = await NetInfo.fetch();
    
    console.log("Network state after permission grant:", {
      type: state.type,
      isConnected: state.isConnected,
      ssid: state.details?.ssid
    });
    
    if (state.type !== "wifi") {
      throw new Error("Not connected to WiFi. Please connect to a WiFi network and try again.");
    }
    
    if (!state.details?.ssid) {
      throw new Error("Could not detect WiFi network name. Make sure you're connected to WiFi.");
    }
    
    const ssid = state.details.ssid.replace(/^"(.*)"$/, "$1");
    console.log("Successfully detected WiFi network:", ssid);
    return [ssid];
  } catch (error) {
    console.error("Error scanning WiFi networks:", error);
    throw error;
  }
};

