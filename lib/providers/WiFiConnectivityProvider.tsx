/**
 * WiFi Connectivity Provider
 * Manages WiFi state and determines if connected to office WiFi networks
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { WiFiConnectivityState } from '@/lib/types';
import { useOfficeWiFiNetworks } from '@/hooks/queries/useWiFi';

interface WiFiConnectivityContextValue extends WiFiConnectivityState {
  refreshState: () => Promise<void>;
  hasPermission: boolean;
  permissionError: string | null;
}

const initialState: WiFiConnectivityState = {
  isConnected: false,
  connectionType: 'unknown',
  ssid: null,
  isOfficeWiFi: false,
  lastChecked: null,
};

const WiFiConnectivityContext = createContext<WiFiConnectivityContextValue | null>(null);

interface WiFiConnectivityProviderProps {
  children: React.ReactNode;
  /** Organization ID to fetch office WiFi networks */
  organizationId?: string;
  /** Whether the provider is enabled (e.g., user is authenticated) */
  enabled?: boolean;
}

export function WiFiConnectivityProvider({
  children,
  organizationId,
  enabled = true,
}: WiFiConnectivityProviderProps) {
  const [state, setState] = useState<WiFiConnectivityState>(initialState);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const netInfoUnsubscribe = useRef<NetInfoSubscription | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch office WiFi networks for the organization
  const { data: officeNetworks } = useOfficeWiFiNetworks(organizationId || '', {
    enabled: !!organizationId && enabled,
  });

  // Extract SSIDs from office networks
  const officeSSIDs = React.useMemo(() => {
    return officeNetworks?.map((network) => network.ssid) || [];
  }, [officeNetworks]);

  // Check and request location permissions (required for SSID access on Android)
  const checkPermissions = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        setPermissionError(null);
        return true;
      }

      // Request permission if not granted
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus === 'granted') {
        setHasPermission(true);
        setPermissionError(null);
        return true;
      }

      setHasPermission(false);
      setPermissionError('Location permission is required to detect WiFi network');
      return false;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      setHasPermission(false);
      setPermissionError('Failed to check location permissions');
      return false;
    }
  }, []);

  // Process network state and update context
  const processNetworkState = useCallback(
    (netState: NetInfoState) => {
      const isWiFi = netState.type === 'wifi';
      const isConnected = netState.isConnected ?? false;

      // Clean up SSID (remove quotes if present on Android)
      let ssid: string | null = null;
      if (isWiFi && netState.details) {
        ssid = (netState.details as any).ssid || null;
        if (ssid) {
          ssid = ssid.replace(/^"(.*)"$/, '$1');
        }
      }

      // Check if connected to office WiFi
      const isOfficeWiFi = ssid ? officeSSIDs.includes(ssid) : false;

      const connectionType: WiFiConnectivityState['connectionType'] = isWiFi
        ? 'wifi'
        : netState.type === 'cellular'
        ? 'cellular'
        : isConnected
        ? 'unknown'
        : 'none';

      setState({
        isConnected: isConnected && isWiFi,
        connectionType,
        ssid,
        isOfficeWiFi,
        lastChecked: new Date(),
      });
    },
    [officeSSIDs]
  );

  // Debounced network state handler to prevent rapid fluctuations
  const handleNetworkChange = useCallback(
    (netState: NetInfoState) => {
      // Clear any pending debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Debounce network changes by 1 second to avoid rapid fluctuations
      debounceTimer.current = setTimeout(() => {
        processNetworkState(netState);
      }, 1000);
    },
    [processNetworkState]
  );

  // Refresh WiFi state manually
  const refreshState = useCallback(async () => {
    if (!enabled) return;

    const hasPerms = await checkPermissions();
    if (!hasPerms) return;

    try {
      const netState = await NetInfo.fetch();
      processNetworkState(netState);
    } catch (error) {
      console.error('Error fetching network state:', error);
    }
  }, [enabled, checkPermissions, processNetworkState]);

  // Initialize and subscribe to network changes
  useEffect(() => {
    if (!enabled) {
      setState(initialState);
      return;
    }

    const initialize = async () => {
      const hasPerms = await checkPermissions();
      if (!hasPerms) return;

      // Get initial state
      const netState = await NetInfo.fetch();
      processNetworkState(netState);

      // Subscribe to network changes
      netInfoUnsubscribe.current = NetInfo.addEventListener(handleNetworkChange);
    };

    initialize();

    return () => {
      // Cleanup subscription
      if (netInfoUnsubscribe.current) {
        netInfoUnsubscribe.current();
        netInfoUnsubscribe.current = null;
      }
      // Clear debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [enabled, checkPermissions, processNetworkState, handleNetworkChange]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App came to foreground from background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Refresh WiFi state when app returns to foreground
        refreshState();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [enabled, refreshState]);

  // Re-evaluate isOfficeWiFi when office networks change
  useEffect(() => {
    if (state.ssid && officeSSIDs.length > 0) {
      const isOfficeWiFi = officeSSIDs.includes(state.ssid);
      if (isOfficeWiFi !== state.isOfficeWiFi) {
        setState((prev) => ({ ...prev, isOfficeWiFi }));
      }
    }
  }, [officeSSIDs, state.ssid, state.isOfficeWiFi]);

  const contextValue: WiFiConnectivityContextValue = {
    ...state,
    refreshState,
    hasPermission,
    permissionError,
  };

  return (
    <WiFiConnectivityContext.Provider value={contextValue}>
      {children}
    </WiFiConnectivityContext.Provider>
  );
}

export function useWiFiConnectivity(): WiFiConnectivityContextValue {
  const context = useContext(WiFiConnectivityContext);
  if (!context) {
    throw new Error('useWiFiConnectivity must be used within a WiFiConnectivityProvider');
  }
  return context;
}
