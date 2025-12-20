import { supabase } from "@/lib/supabase/client";
import { getDeviceInfo } from "@/lib/utils/device.utils";

export const deviceMutations = {
  /**
   * Register or update device info for current session
   */
  registerDeviceInfo: async (
    sessionId: string,
    userId: string
  ): Promise<void> => {
    const deviceInfo = getDeviceInfo();

    const { error } = await supabase.from("user_device_info").upsert(
      {
        session_id: sessionId,
        user_id: userId,
        device_model: deviceInfo.deviceModel,
        device_manufacturer: deviceInfo.deviceManufacturer,
        device_name: deviceInfo.deviceName,
        os_name: deviceInfo.osName,
        os_version: deviceInfo.osVersion,
        app_version: deviceInfo.appVersion,
        platform: deviceInfo.platform,
        last_active_at: new Date().toISOString(),
      },
      {
        onConflict: "session_id",
      }
    );

    if (error) {
      console.error("Error registering device info:", error);
      throw error;
    }
  },

  /**
   * Update last active timestamp for current session
   */
  updateLastActive: async (sessionId: string): Promise<void> => {
    const { error } = await supabase
      .from("user_device_info")
      .update({
        last_active_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating last active:", error);
    }
  },
};
