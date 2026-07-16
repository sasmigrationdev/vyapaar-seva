import ExpoModulesCore
import NetworkExtension

/**
 * Reads the current WiFi SSID using `NEHotspotNetwork.fetchCurrent`.
 *
 * On iOS 14+ the legacy `CNCopyCurrentNetworkInfo` API (used by
 * @react-native-community/netinfo's `shouldFetchWiFiSSID`) increasingly returns
 * nil even with the "Access WiFi Information" entitlement + precise location.
 * `NEHotspotNetwork.fetchCurrent` is Apple's current supported way to obtain the
 * SSID and requires only that same entitlement plus location-when-in-use.
 */
public class WifiSsidModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WifiSsidModule")

    AsyncFunction("getCurrentSSID") { (promise: Promise) in
      if #available(iOS 14.0, *) {
        NEHotspotNetwork.fetchCurrent { network in
          promise.resolve(network?.ssid)
        }
      } else {
        promise.resolve(nil)
      }
    }
  }
}
