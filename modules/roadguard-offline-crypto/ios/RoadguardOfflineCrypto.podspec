require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'RoadguardOfflineCrypto'
  s.version        = package['version']
  s.summary        = 'RoadGuard hardware-backed offline signing, Handover 42A AEAD/ECDH, and encrypted media vault.'
  s.description    = 'iOS CryptoKit + Secure Enclave + Keychain ThisDeviceOnly native module matching Android StrictP256, HandoverPackage, and LocalMediaVault.'
  s.license        = package['license']
  s.author         = 'RoadGuard'
  s.homepage       = 'https://roadguard.local'
  s.platforms      = { :ios => '15.0' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
end
