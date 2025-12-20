import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

export interface DeviceInfo {
  deviceModel: string | null;
  deviceManufacturer: string | null;
  deviceName: string | null;
  osName: string;
  osVersion: string | null;
  appVersion: string;
  platform: "ios" | "android" | "web";
}

/**
 * Get detailed device information using expo-device
 */
export const getDeviceInfo = (): DeviceInfo => {
  // Web platform fallback
  if (Platform.OS === "web") {
    return {
      deviceModel: getBrowserName(),
      deviceManufacturer: null,
      deviceName: null,
      osName: "Web",
      osVersion: null,
      appVersion: Constants.expoConfig?.version || "1.0.0",
      platform: "web",
    };
  }

  return {
    deviceModel: Device.modelName, // "iPhone 15 Pro", "Galaxy S23"
    deviceManufacturer: Device.manufacturer, // "Apple", "Samsung"
    deviceName: Device.deviceName, // User-set device name
    osName: Device.osName || Platform.OS, // "iOS", "Android"
    osVersion: Device.osVersion, // "17.1", "14"
    appVersion: Constants.expoConfig?.version || "1.0.0",
    platform: Platform.OS as "ios" | "android",
  };
};

/**
 * Format device name for display
 */
export const formatDeviceName = (info: DeviceInfo): string => {
  if (info.platform === "web") {
    return info.deviceModel || "Web Browser";
  }

  // Prefer specific model name
  if (info.deviceModel) {
    return info.deviceModel; // "iPhone 15 Pro", "Galaxy S23"
  }

  // Fallback to manufacturer + generic
  if (info.deviceManufacturer) {
    return `${info.deviceManufacturer} Device`;
  }

  // Final fallback
  return info.platform === "ios" ? "iPhone/iPad" : "Android Device";
};

/**
 * Get browser name from user agent (web only)
 */
const getBrowserName = (): string | null => {
  if (typeof navigator === "undefined") return null;

  const ua = navigator.userAgent;

  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    const match = ua.match(/Chrome\/(\d+)/);
    return match ? `Chrome ${match[1]}` : "Chrome";
  }
  if (ua.includes("Safari") && !ua.includes("Chrome")) {
    const match = ua.match(/Version\/(\d+)/);
    return match ? `Safari ${match[1]}` : "Safari";
  }
  if (ua.includes("Firefox")) {
    const match = ua.match(/Firefox\/(\d+)/);
    return match ? `Firefox ${match[1]}` : "Firefox";
  }
  if (ua.includes("Edg")) {
    const match = ua.match(/Edg\/(\d+)/);
    return match ? `Edge ${match[1]}` : "Edge";
  }

  return "Browser";
};

/**
 * Extract session ID from JWT access token
 */
export const extractSessionIdFromToken = (token: string): string | null => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.session_id || null;
  } catch (e) {
    console.error("Error extracting session ID:", e);
    return null;
  }
};
