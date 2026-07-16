import NetInfo from "@react-native-community/netinfo";

/**
 * Global NetInfo configuration — MUST run before any other NetInfo usage.
 *
 * On iOS, `shouldFetchWiFiSSID` only takes effect if it is configured BEFORE the
 * first `NetInfo.fetch()` / `NetInfo.addEventListener()` call in the session. If a
 * fetch happens first (e.g. WiFiConnectivityProvider at app startup), the native
 * module initialises without SSID fetching and every `details.ssid` read returns
 * null for the rest of the session — which blocks office-WiFi verification and
 * attendance check-in/out on iPhone (Android is unaffected).
 *
 * This module is imported as the FIRST import in `app/_layout.tsx` so the config
 * runs during initial module load, guaranteeing it precedes any runtime NetInfo
 * call. It is also imported by `wifi.utils.ts` so the ordering holds no matter
 * which module is evaluated first.
 */
NetInfo.configure({ shouldFetchWiFiSSID: true });

export {};
