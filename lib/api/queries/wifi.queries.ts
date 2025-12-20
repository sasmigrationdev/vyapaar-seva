import { supabase } from "@/lib/supabase/client";
import { OfficeWiFiNetwork } from "@/lib/types";

export const wifiQueries = {
  /**
   * Get all active office WiFi networks for an organization
   */
  getOfficeWiFiNetworks: async (
    organizationId: string
  ): Promise<OfficeWiFiNetwork[]> => {
    const { data, error } = await supabase
      .from("office_wifi_networks")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all WiFi networks (including inactive) - HR only
   */
  getAllWiFiNetworks: async (
    organizationId: string
  ): Promise<OfficeWiFiNetwork[]> => {
    const { data, error } = await supabase
      .from("office_wifi_networks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Check if WiFi verification is required for a user
   */
  isWiFiVerificationRequired: async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("users")
      .select("wifi_verification_required")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data?.wifi_verification_required || false;
  },
};

