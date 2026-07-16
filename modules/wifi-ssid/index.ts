import { requireOptionalNativeModule } from "expo-modules-core";

// Optional: the native module only exists on iOS builds. On Android (or if the
// module isn't linked yet) this is null and callers fall back to NetInfo.
const WifiSsidModule = requireOptionalNativeModule("WifiSsidModule");

/**
 * Reads the current WiFi SSID on iOS via NEHotspotNetwork.fetchCurrent.
 * Returns null if unavailable (not iOS, not linked, or the OS returned nothing).
 */
export async function getCurrentSSIDNative(): Promise<string | null> {
  if (!WifiSsidModule?.getCurrentSSID) return null;
  try {
    const ssid = await WifiSsidModule.getCurrentSSID();
    return ssid ?? null;
  } catch {
    return null;
  }
}

export const isWifiSsidNativeAvailable = !!WifiSsidModule?.getCurrentSSID;
