import { wifiKeys } from "@/hooks/queries/useWiFi";
import { wifiMutations } from "@/lib/api/mutations/wifi.mutations";
import { OfficeWiFiNetwork } from "@/lib/types";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Add WiFi network
 */
export const useAddWiFiNetwork = (
  organizationId: string,
  options?: UseMutationOptions<
    OfficeWiFiNetwork,
    Error,
    { ssid: string; description?: string; createdBy: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      wifiMutations.addWiFiNetwork({ ...params, organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wifiKeys.networks(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: wifiKeys.allNetworks(organizationId),
      });
    },
    ...options,
  });
};

/**
 * Update WiFi network
 */
export const useUpdateWiFiNetwork = (
  organizationId: string,
  options?: UseMutationOptions<
    OfficeWiFiNetwork,
    Error,
    {
      networkId: string;
      updates: Partial<{
        ssid: string;
        description: string;
        is_active: boolean;
      }>;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ networkId, updates }) =>
      wifiMutations.updateWiFiNetwork(networkId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wifiKeys.networks(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: wifiKeys.allNetworks(organizationId),
      });
    },
    ...options,
  });
};

/**
 * Delete WiFi network
 */
export const useDeleteWiFiNetwork = (
  organizationId: string,
  options?: UseMutationOptions<void, Error, { networkId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ networkId }) => wifiMutations.deleteWiFiNetwork(networkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wifiKeys.networks(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: wifiKeys.allNetworks(organizationId),
      });
    },
    ...options,
  });
};

/**
 * Toggle user WiFi requirement
 */
export const useToggleUserWiFiRequirement = (
  options?: UseMutationOptions<
    void,
    Error,
    { userId: string; required: boolean }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, required }) =>
      wifiMutations.toggleUserWiFiRequirement(userId, required),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: wifiKeys.requirement(variables.userId),
      });
    },
    ...options,
  });
};

