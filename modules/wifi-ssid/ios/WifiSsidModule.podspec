Pod::Spec.new do |s|
  s.name           = 'WifiSsidModule'
  s.version        = '1.0.0'
  s.summary        = 'Read the current WiFi SSID via NEHotspotNetwork'
  s.description    = 'Local Expo module that reads the current WiFi SSID on iOS using NEHotspotNetwork.fetchCurrent.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.license        = { type: 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'NetworkExtension'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
