import { supabase } from "@/lib/supabase/client";
import { OfficeWiFiNetwork } from "@/lib/types";

export const wifiMutations = {
  /**
   * Add a new office WiFi network
   */
  addWiFiNetwork: async (params: {
    organizationId: string;
    ssid: string;
    description?: string;
    createdBy: string;
  }): Promise<OfficeWiFiNetwork> => {
    const { data, error } = await supabase
      .from("office_wifi_networks")
      .insert({
        organization_id: params.organizationId,
        ssid: params.ssid,
        description: params.description,
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a WiFi network
   */
  updateWiFiNetwork: async (
    networkId: string,
    updates: Partial<{
      ssid: string;
      description: string;
      is_active: boolean;
    }>
  ): Promise<OfficeWiFiNetwork> => {
    const { data, error } = await supabase
      .from("office_wifi_networks")
      .update(updates)
      .eq("id", networkId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a WiFi network
   */
  deleteWiFiNetwork: async (networkId: string): Promise<void> => {
    const { error } = await supabase
      .from("office_wifi_networks")
      .delete()
      .eq("id", networkId);

    if (error) throw error;
  },

  /**
   * Toggle WiFi verification requirement for a user
   */
  toggleUserWiFiRequirement: async (
    userId: string,
    required: boolean
  ): Promise<void> => {
    const { error } = await supabase
      .from("users")
      .update({ wifi_verification_required: required })
      .eq("id", userId);

    if (error) throw error;
  },
};

