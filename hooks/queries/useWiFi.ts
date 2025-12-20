import { wifiQueries } from "@/lib/api/queries/wifi.queries";
import { OfficeWiFiNetwork } from "@/lib/types";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export const wifiKeys = {
  all: ["wifi"] as const,
  networks: (orgId: string) => [...wifiKeys.all, "networks", orgId] as const,
  allNetworks: (orgId: string) => [...wifiKeys.all, "all", orgId] as const,
  requirement: (userId: string) =>
    [...wifiKeys.all, "requirement", userId] as const,
};

/**
 * Get active office WiFi networks
 */
export const useOfficeWiFiNetworks = (
  organizationId: string,
  options?: Omit<UseQueryOptions<OfficeWiFiNetwork[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: wifiKeys.networks(organizationId),
    queryFn: () => wifiQueries.getOfficeWiFiNetworks(organizationId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Get all WiFi networks (HR)
 */
export const useAllWiFiNetworks = (
  organizationId: string,
  options?: Omit<UseQueryOptions<OfficeWiFiNetwork[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: wifiKeys.allNetworks(organizationId),
    queryFn: () => wifiQueries.getAllWiFiNetworks(organizationId),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

/**
 * Check if WiFi verification is required for user
 */
export const useWiFiVerificationRequired = (
  userId: string,
  options?: Omit<UseQueryOptions<boolean>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: wifiKeys.requirement(userId),
    queryFn: () => wifiQueries.isWiFiVerificationRequired(userId),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};
