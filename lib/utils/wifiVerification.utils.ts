import { supabase } from "@/lib/supabase/client";
import { getCurrentWiFiSSID, requestLocationPermissions } from "./wifi.utils";
import NetInfo from "@react-native-community/netinfo";

export interface WiFiVerificationResult {
  currentSsid: string | null;
  isVerified: boolean;
  officeNetworks: string[];
  isRequired: boolean;
  error?: string;
  errorType?: 'permission_denied' | 'location_disabled' | 'wifi_not_connected' | 'network_error' | 'unknown';
}

/**
 * Perform WiFi verification for a user
 * This function checks if the user is connected to an allowed office network
 */
export async function performWiFiVerification(
  userId: string,
  organizationId: string
): Promise<WiFiVerificationResult> {
  try {
    // 1. Check if WiFi verification is required for this user
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("wifi_verification_required")
      .eq("id", userId)
      .single();

    if (userError) {
      return {
        currentSsid: null,
        isVerified: false,
        officeNetworks: [],
        isRequired: false,
        error: "Failed to check WiFi requirements",
      };
    }

    const isRequired = userData?.wifi_verification_required || false;

    // 2. Request location permissions (required for WiFi SSID access)
    const permissionGranted = await requestLocationPermissions();
    
    if (!permissionGranted) {
      console.warn("Location permission not granted. Cannot verify WiFi.");
      // If permission not granted but verification is required, fail verification
      return {
        currentSsid: null,
        isVerified: !isRequired, // Pass if not required, fail if required
        officeNetworks: [],
        isRequired,
        error: "Location permission is required to verify WiFi connection. Please enable location access in your device settings.",
        errorType: 'permission_denied',
      };
    }

    // 3. Get current WiFi SSID
    const currentSsid = await getCurrentWiFiSSID();

    // Check if we're connected to WiFi but can't get SSID (likely location services disabled)
    if (!currentSsid && isRequired) {
      // Try to detect if WiFi is actually connected by checking NetInfo directly
      const state = await NetInfo.fetch();
      
      if (state.type === "wifi" && !state.details?.ssid) {
        // Connected to WiFi but can't get SSID - likely location services disabled
        return {
          currentSsid: null,
          isVerified: false,
          officeNetworks: [],
          isRequired,
          error: "Cannot detect WiFi network name. Please ensure Location Services are enabled on your device and try again.",
          errorType: 'location_disabled',
        };
      } else if (state.type !== "wifi") {
        // Not connected to WiFi at all
        return {
          currentSsid: null,
          isVerified: false,
          officeNetworks: [],
          isRequired,
          error: "Not connected to WiFi. Please connect to an office WiFi network and try again.",
          errorType: 'wifi_not_connected',
        };
      }
    }

    // 4. Fetch active office WiFi networks
    const { data: networks, error: networksError } = await supabase
      .from("office_wifi_networks")
      .select("ssid")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (networksError) {
      console.error("Failed to fetch office networks:", networksError);
      return {
        currentSsid,
        isVerified: !isRequired, // Pass if not required, fail if required
        officeNetworks: [],
        isRequired,
        error: "Network error: Failed to fetch office networks. Please check your internet connection and try again.",
        errorType: 'network_error',
      };
    }

    const officeNetworks = networks?.map((n) => n.ssid) || [];

    // 5. Perform verification
    let isVerified = false;

    if (!isRequired) {
      // WiFi verification not required - always verified
      isVerified = true;
      console.log("WiFi verification not required. Passing verification.");
    } else if (!currentSsid) {
      // WiFi verification required but not connected
      isVerified = false;
      console.log("WiFi verification required but not connected to WiFi. Failing verification.");
    } else {
      // Check if current SSID matches any office network
      isVerified = officeNetworks.includes(currentSsid);
      console.log(`WiFi verification: Current SSID="${currentSsid}", Office Networks=[${officeNetworks.join(", ")}], Verified=${isVerified}`);
    }

    return {
      currentSsid,
      isVerified,
      officeNetworks,
      isRequired,
    };
  } catch (error) {
    console.error("WiFi verification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown verification error";
    
    // Try to categorize the error
    let errorType: 'permission_denied' | 'location_disabled' | 'wifi_not_connected' | 'network_error' | 'unknown' = 'unknown';
    
    if (errorMessage.toLowerCase().includes('permission')) {
      errorType = 'permission_denied';
    } else if (errorMessage.toLowerCase().includes('location')) {
      errorType = 'location_disabled';
    } else if (errorMessage.toLowerCase().includes('wifi') || errorMessage.toLowerCase().includes('network')) {
      errorType = 'network_error';
    }
    
    return {
      currentSsid: null,
      isVerified: false,
      officeNetworks: [],
      isRequired: false,
      error: `Verification error: ${errorMessage}. Please try again or contact HR if the issue persists.`,
      errorType,
    };
  }
}

/**
 * Get WiFi info for attendance records
 * Returns the SSID and verification status
 */
export function getWiFiInfoForAttendance(
  verificationResult: WiFiVerificationResult
): { ssid: string | null; verified: boolean } {
  return {
    ssid: verificationResult.currentSsid,
    verified: verificationResult.isVerified,
  };
}
