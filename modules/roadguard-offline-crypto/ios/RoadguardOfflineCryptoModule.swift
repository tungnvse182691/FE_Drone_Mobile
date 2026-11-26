import CommonCrypto
import CryptoKit
import ExpoModulesCore
import Foundation
import Security

private enum NativeCryptoError: Error {
  case blockedNative(String)
  case invalidInput(String)
  case lifecycleRecovery(String)
}

public final class RoadguardOfflineCryptoModule: Module {
  private static let maxPayloadBytes = 16 * 1024 * 1024
  private static let maxLocalMediaRead = 1024 * 1024
  private static let bufferBytes = 64 * 1024
  private static let chunkHeaderBytes = 28
  private static let tagBytes = 16
  private static let packageSchema = "huy-final.offline.bundle.v1"
  private static let claimPurpose = Data("roadguard.h5.direct-sync.v1\0".utf8)
  private static let localMediaMagic = Data("RGLOCAL\u{01}".utf8)
  private static let p256SpkiPrefix = Data([
    0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02,
    0x01, 0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, 0x03,
    0x42, 0x00, 0x04
  ])
  private static let keyLifecycleSuite = "roadguard.offline.key-lifecycle"
  private static let mediaLifecycleSuite = "roadguard.media.key-lifecycle"
  private static let installService = "roadguard.offline.installation"
  private static let keychainService = "roadguard.offline.crypto"
  private let lock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("RoadguardOfflineCrypto")

    AsyncFunction("prepareMediaKey") { (binding: String) -> [String: Any] in
      try self.prepareMediaKeyInternal(binding: binding)
    }

    AsyncFunction("sealMedia") { (binding: String, assetId: String, sourceUri: String) -> [String: Any] in
      try self.sealMediaInternal(binding: binding, assetId: assetId, sourceUri: sourceUri)
    }

    AsyncFunction("readMediaRange") { (binding: String, assetId: String, offset: Int64, length: Int) -> String in
      try self.readMediaRangeInternal(binding: binding, assetId: assetId, offset: offset, length: length)
    }

    AsyncFunction("capability") { (binding: String) -> [String: Any] in
      try self.capabilityInternal(binding: binding)
    }

    AsyncFunction("installationId") { () -> String in
      try self.installationIdInternal()
    }

    AsyncFunction("createKeys") { (binding: String) -> [String: Any] in
      try self.createKeysInternal(binding: binding)
    }

    AsyncFunction("publicKeys") { (binding: String) -> [String: String] in
      try self.publicKeysInternal(binding: binding)
    }

    AsyncFunction("signManifest") { (binding: String, manifest: String) -> String in
      try self.signManifestInternal(binding: binding, manifest: manifest)
    }

    AsyncFunction("verifyManifest") { (publicKey: String, manifest: String, signature: String) -> Bool in
      self.verifyManifestInternal(publicKey: publicKey, manifest: manifest, signature: signature)
    }

    AsyncFunction("sealPackage") { (binding: String, request: String) -> String in
      try self.sealPackageInternal(binding: binding, request: request)
    }

    AsyncFunction("openPackage") { (binding: String, envelope: String, trustedSender: String) -> String in
      try self.openPackageInternal(binding: binding, envelope: envelope, trustedSender: trustedSender)
    }
  }

  // MARK: - Identity & Binding

  private func parseSyncBinding(_ binding: String) throws -> (prefix: String, actorId: String, deviceId: String) {
    guard let data = binding.data(using: .utf8),
          let arr = try JSONSerialization.jsonObject(with: data) as? [Any],
          arr.count == 4,
          let actor = arr[0] as? String,
          let env = arr[1] as? String,
          let role = arr[2] as? String,
          let deviceId = arr[3] as? String,
          role == "REPAIR_CREW",
          Self.isCanonicalUuid(actor),
          Self.isCanonicalUuid(deviceId),
          Self.isValidEnvironmentUri(env)
    else {
      throw NativeCryptoError.invalidInput("offline_binding_invalid")
    }
    let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    return ("roadguard.offline.v1.\(digest)", actor, deviceId)
  }

  private func parseMediaBinding(_ binding: String) throws -> String {
    guard binding.count >= 1, binding.count <= 2048,
          let data = binding.data(using: .utf8),
          let arr = try JSONSerialization.jsonObject(with: data) as? [Any],
          arr.count == 3,
          let actor = arr[0] as? String,
          let env = arr[1] as? String,
          let role = arr[2] as? String,
          Self.isCanonicalUuid(actor),
          ["REPAIR_CREW", "DRONE_OPERATOR", "REPORTER"].contains(role),
          Self.isValidEnvironmentUri(env)
    else {
      throw NativeCryptoError.invalidInput("media_binding_invalid")
    }
    return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }

  private static func isCanonicalUuid(_ value: String) -> Bool {
    guard let u = UUID(uuidString: value) else { return false }
    return u.uuidString.lowercased() == value
  }

  private static func isValidEnvironmentUri(_ value: String) -> Bool {
    guard let url = URL(string: value),
          let scheme = url.scheme?.lowercased(),
          ["http", "https"].contains(scheme),
          let host = url.host, !host.isEmpty,
          url.user == nil, url.password == nil, url.query == nil, url.fragment == nil
    else { return false }
    return true
  }

  // MARK: - Keychain & Secure Enclave Lifecycle

  private func loadKeychainData(service: String, account: String) throws -> Data? {
    let query: [CFString: Any] = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrService: service,
      kSecAttrAccount: account,
      kSecAttrSynchronizable: kCFBooleanFalse as Any,
      kSecReturnData: kCFBooleanTrue as Any,
      kSecMatchLimit: kSecMatchLimitOne
    ]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = item as? Data else {
      throw NativeCryptoError.blockedNative("KEYCHAIN_UNAVAILABLE")
    }
    return data
  }

  private func saveKeychainData(service: String, account: String, data: Data) throws {
    let query: [CFString: Any] = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrService: service,
      kSecAttrAccount: account,
      kSecAttrSynchronizable: kCFBooleanFalse as Any,
      kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
      kSecValueData: data
    ]
    let status = SecItemAdd(query as CFDictionary, nil)
    if status == errSecDuplicateItem {
      throw NativeCryptoError.lifecycleRecovery("KEY_LOSS_RECOVERY_REQUIRED")
    }
    guard status == errSecSuccess else {
      throw NativeCryptoError.blockedNative("KEYCHAIN_PERSISTENCE_FAILED")
    }
  }

  private func installationIdInternal() throws -> String {
    lock.lock()
    defer { lock.unlock() }
    if let existing = try loadKeychainData(service: Self.installService, account: "device"),
       let str = String(data: existing, encoding: .utf8),
       Self.isCanonicalUuid(str) {
      return str
    }
    let id = UUID().uuidString.lowercased()
    guard let bytes = id.data(using: .utf8) else {
      throw NativeCryptoError.blockedNative("installation_persistence_failed")
    }
    try saveKeychainData(service: Self.installService, account: "device", data: bytes)
    return id
  }

  private func capabilityInternal(binding: String) throws -> [String: Any] {
    let parsed = try parseSyncBinding(binding)
    guard SecureEnclave.isAvailable else {
      return [
        "available": true,
        "apiLevel": ProcessInfo.processInfo.operatingSystemVersion.majorVersion,
        "signingUsable": false,
        "agreementUsable": false,
        "securityLevel": [
          "signing": "UNAVAILABLE_NO_SECURE_ENCLAVE",
          "agreement": "UNAVAILABLE_NO_SECURE_ENCLAVE"
        ],
        "reason": "BLOCKED_NATIVE_KEY_OR_HARDWARE"
      ]
    }
    let signExists = (try? loadKeychainData(service: Self.keyLifecycleSuite, account: "\(parsed.prefix).sign")) != nil
    let agreeExists = (try? loadKeychainData(service: Self.keyLifecycleSuite, account: "\(parsed.prefix).agree")) != nil
    let level = (signExists && agreeExists) ? "SECURE_ENCLAVE" : "MISSING"
    let usable = (signExists && agreeExists)
    return [
      "available": true,
      "apiLevel": ProcessInfo.processInfo.operatingSystemVersion.majorVersion,
      "signingUsable": usable,
      "agreementUsable": usable,
      "securityLevel": [
        "signing": signExists ? "SECURE_ENCLAVE" : "MISSING",
        "agreement": agreeExists ? "SECURE_ENCLAVE" : "MISSING"
      ],
      "reason": usable ? "NATIVE_RUNTIME_PROOF_REQUIRED" : "BLOCKED_NATIVE_KEY_OR_HARDWARE"
    ]
  }

  private func createKeysInternal(binding: String) throws -> [String: Any] {
    guard SecureEnclave.isAvailable else {
      throw NativeCryptoError.blockedNative("BLOCKED_NATIVE_NO_SECURE_ENCLAVE")
    }
    let parsed = try parseSyncBinding(binding)
    lock.lock()
    defer { lock.unlock() }

    let signData = try loadKeychainData(service: Self.keyLifecycleSuite, account: "\(parsed.prefix).sign")
    let agreeData = try loadKeychainData(service: Self.keyLifecycleSuite, account: "\(parsed.prefix).agree")
    let defaults = UserDefaults.standard
    let recorded = defaults.bool(forKey: "\(Self.keyLifecycleSuite).\(parsed.prefix)")

    if (signData != nil) != (agreeData != nil) || (signData == nil && recorded) {
      throw NativeCryptoError.lifecycleRecovery("KEY_LOSS_RECOVERY_REQUIRED")
    }
    if signData == nil {
      defaults.set(true, forKey: "\(Self.keyLifecycleSuite).\(parsed.prefix)")
      var acError: Unmanaged<CFError>?
      guard let accessControl = SecAccessControlCreateWithFlags(
        kCFAllocatorDefault,
        kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        .privateKeyUsage,
        &acError
      ) else {
        throw NativeCryptoError.blockedNative("SECURE_ENCLAVE_ACCESS_CONTROL_FAILED")
      }
      let signKey = try SecureEnclave.P256.Signing.PrivateKey(accessControl: accessControl)
      let agreeKey = try SecureEnclave.P256.KeyAgreement.PrivateKey(accessControl: accessControl)
      try saveKeychainData(service: Self.keyLifecycleSuite, account: "\(parsed.prefix).sign", data: signKey.dataRepresentation)
      try saveKeychainData(service: Self.keyLifecycleSuite, account: "\(parsed.prefix).agree", data: agreeKey.dataRepresentation)
    }
    return try capabilityInternal(binding: binding)
  }

  private func loadSigningKey(prefix: String) throws -> SecureEnclave.P256.Signing.PrivateKey {
    guard SecureEnclave.isAvailable,
          let data = try loadKeychainData(service: Self.keyLifecycleSuite, account: "\(prefix).sign")
    else { throw NativeCryptoError.blockedNative("BLOCKED_NATIVE") }
    return try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: data)
  }

  private func loadAgreementKey(prefix: String) throws -> SecureEnclave.P256.KeyAgreement.PrivateKey {
    guard SecureEnclave.isAvailable,
          let data = try loadKeychainData(service: Self.keyLifecycleSuite, account: "\(prefix).agree")
    else { throw NativeCryptoError.blockedNative("BLOCKED_NATIVE") }
    return try SecureEnclave.P256.KeyAgreement.PrivateKey(dataRepresentation: data)
  }

  private func publicKeysInternal(binding: String) throws -> [String: String] {
    let parsed = try parseSyncBinding(binding)
    let signKey = try loadSigningKey(prefix: parsed.prefix)
    let agreeKey = try loadAgreementKey(prefix: parsed.prefix)
    return [
      "signingPublicKey": Self.spkiBase64(fromRawXY: signKey.publicKey.rawRepresentation),
      "encryptionPublicKey": Self.spkiBase64(fromRawXY: agreeKey.publicKey.rawRepresentation)
    ]
  }

  // MARK: - Strict P-256 Sign/Verify (Direct-Sync + Handover 42A)

  private static func spkiBase64(fromRawXY raw: Data) -> String {
    var der = Data()
    der.append(p256SpkiPrefix)
    der.append(raw)
    return der.base64EncodedString()
  }

  private static func signingPublicKey(fromSpkiBase64 spkiB64: String) throws -> P256.Signing.PublicKey {
    guard let der = Data(base64Encoded: spkiB64),
          der.count == p256SpkiPrefix.count + 64,
          der.prefix(p256SpkiPrefix.count) == p256SpkiPrefix
    else {
      throw NativeCryptoError.invalidInput("invalid_p256_public_key")
    }
    return try P256.Signing.PublicKey(rawRepresentation: der.suffix(64))
  }

  private static func agreementPublicKey(fromSpkiBase64 spkiB64: String) throws -> P256.KeyAgreement.PublicKey {
    guard let der = Data(base64Encoded: spkiB64),
          der.count == p256SpkiPrefix.count + 64,
          der.prefix(p256SpkiPrefix.count) == p256SpkiPrefix
    else {
      throw NativeCryptoError.invalidInput("invalid_p256_public_key")
    }
    return try P256.KeyAgreement.PublicKey(rawRepresentation: der.suffix(64))
  }

  private func signManifestInternal(binding: String, manifest: String) throws -> String {
    let parsed = try parseSyncBinding(binding)
    let key = try loadSigningKey(prefix: parsed.prefix)
    guard let manifestData = manifest.data(using: .utf8),
          manifestData.count >= 1,
          manifestData.count <= Self.maxPayloadBytes
    else {
      throw NativeCryptoError.invalidInput("invalid_manifest")
    }
    var framed = Data(Self.claimPurpose)
    framed.append(manifestData)
    let digest = SHA256.hash(data: framed)
    let sig = try key.signature(for: digest)
    return sig.rawRepresentation.base64EncodedString()
  }

  private func verifyManifestInternal(publicKey: String, manifest: String, signature: String) -> Bool {
    guard let manifestData = manifest.data(using: .utf8),
          manifestData.count >= 1,
          manifestData.count <= Self.maxPayloadBytes,
          let sigBytes = Data(base64Encoded: signature),
          sigBytes.count == 64,
          let key = try? Self.signingPublicKey(fromSpkiBase64: publicKey),
          let sig = try? P256.Signing.ECDSASignature(rawRepresentation: sigBytes)
    else {
      return false
    }
    var framed = Data(Self.claimPurpose)
    framed.append(manifestData)
    let digest = SHA256.hash(data: framed)
    return key.isValidSignature(sig, for: digest)
  }

  // MARK: - Handover 42A Sealed Package (v1 wire parity with HandoverPackage.java)

  private static func q(_ s: String) throws -> String {
    let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_+./=|:-")
    guard !s.isEmpty && s.unicodeScalars.allSatisfy({ allowed.contains($0) }) else {
      throw NativeCryptoError.invalidInput("invalid_handover_package")
    }
    return "\"\(s)\""
  }

  private static func canonicalHeader(dict: [String: Any]) throws -> Data {
    guard let version = dict["version"] as? Int, version == 1,
          let schema = dict["payloadSchema"] as? String, schema == packageSchema,
          let packageId = dict["packageId"] as? String, isCanonicalUuid(packageId),
          let projectId = dict["projectId"] as? String, isCanonicalUuid(projectId),
          let originalActorId = dict["originalActorId"] as? String, isCanonicalUuid(originalActorId),
          let sourceDeviceId = dict["sourceDeviceId"] as? String, isCanonicalUuid(sourceDeviceId),
          let originIds = dict["originIds"] as? [String], originIds.count >= 1, originIds.count <= 1000,
          let payloadSha256 = dict["payloadSha256"] as? String, payloadSha256.count == 64
    else {
      throw NativeCryptoError.invalidInput("invalid_handover_package")
    }
    for idx in originIds.indices {
      guard isCanonicalUuid(originIds[idx]) else { throw NativeCryptoError.invalidInput("invalid_handover_package") }
      if idx > 0 && originIds[idx - 1] >= originIds[idx] {
        throw NativeCryptoError.invalidInput("invalid_handover_package")
      }
    }
    let quotedOrigins = try originIds.map { try q($0) }.joined(separator: ",")
    let json = "{\"version\":1,\"payloadSchema\":\(try q(schema)),\"packageId\":\(try q(packageId)),\"projectId\":\(try q(projectId)),\"originalActorId\":\(try q(originalActorId)),\"sourceDeviceId\":\(try q(sourceDeviceId)),\"originIds\":[\(quotedOrigins)],\"payloadSha256\":\(try q(payloadSha256))}"
    guard let data = json.data(using: .utf8) else { throw NativeCryptoError.invalidInput("invalid_handover_package") }
    return data
  }

  private func sealPackageInternal(binding: String, request: String) throws -> String {
    let parsed = try parseSyncBinding(binding)
    let signKey = try loadSigningKey(prefix: parsed.prefix)
    let signPubB64 = Self.spkiBase64(fromRawXY: signKey.publicKey.rawRepresentation)

    guard let reqData = request.data(using: .utf8),
          let root = try JSONSerialization.jsonObject(with: reqData) as? [String: Any],
          let headerObj = root["header"] as? [String: Any],
          let payloadB64 = root["payloadBase64"] as? String,
          let recipients = root["recipients"] as? [[String: Any]],
          recipients.count >= 1, recipients.count <= 32,
          let plaintext = Data(base64Encoded: payloadB64),
          plaintext.count >= 1, plaintext.count <= Self.maxPayloadBytes,
          let origActor = headerObj["originalActorId"] as? String, origActor == parsed.actorId,
          let srcDev = headerObj["sourceDeviceId"] as? String, srcDev == parsed.deviceId,
          let expectedSha = headerObj["payloadSha256"] as? String
    else {
      throw NativeCryptoError.invalidInput("invalid_handover_package")
    }
    let actualSha = SHA256.hash(data: plaintext).map { String(format: "%02x", $0) }.joined()
    guard actualSha == expectedSha else { throw NativeCryptoError.invalidInput("invalid_handover_package") }

    let headerBytes = try Self.canonicalHeader(dict: headerObj)
    let headerStr = String(data: headerBytes, encoding: .utf8)!
    let headerSalt = Data(SHA256.hash(data: headerBytes))
    let cek = SymmetricKey(size: .bits256)
    let sealedPayload = try AES.GCM.seal(plaintext, using: cek, authenticating: headerBytes)

    var wraps: [(sortKey: String, json: String)] = []
    var seenIdentities = Set<String>()
    var seenFingerprints = Set<String>()
    for r in recipients {
      guard let rActor = r["actorId"] as? String, Self.isCanonicalUuid(rActor),
            let rDev = r["deviceId"] as? String, !rDev.isEmpty, rDev.count <= 80,
            let rEncB64 = r["encryptionPublicKey"] as? String,
            let rSignB64 = r["signingPublicKey"] as? String,
            rEncB64 != rSignB64,
            let rEncPub = try? Self.agreementPublicKey(fromSpkiBase64: rEncB64),
            let _ = try? Self.signingPublicKey(fromSpkiBase64: rSignB64),
            let encDer = Data(base64Encoded: rEncB64)
      else {
        throw NativeCryptoError.invalidInput("invalid_handover_package")
      }
      let fp = SHA256.hash(data: encDer).map { String(format: "%02x", $0) }.joined()
      let idKey = "\(rActor)|\(rDev)"
      guard seenIdentities.insert(idKey).inserted, seenFingerprints.insert(fp).inserted else {
        throw NativeCryptoError.invalidInput("invalid_handover_package")
      }
      let ephemeral = P256.KeyAgreement.PrivateKey()
      let ephPubB64 = Self.spkiBase64(fromRawXY: ephemeral.publicKey.rawRepresentation)
      let ctxJson = "{\"purpose\":\"roadguard.h5.recipient-key.v1\",\"header\":\(headerStr),\"actorId\":\(try Self.q(rActor)),\"deviceId\":\(try Self.q(rDev)),\"recipientKeyFingerprint\":\(try Self.q(fp)),\"ephemeralPublicKey\":\(try Self.q(ephPubB64))}"
      let ctxData = Data(ctxJson.utf8)
      let secret = try ephemeral.sharedSecretFromKeyAgreement(with: rEncPub)
      let wrapKey = secret.hkdfDerivedSymmetricKey(
        using: SHA256.self,
        salt: headerSalt,
        sharedInfo: ctxData,
        outputByteCount: 32
      )
      let cekBytes = cek.withUnsafeBytes { Data($0) }
      let wrapped = try AES.GCM.seal(cekBytes, using: wrapKey, authenticating: ctxData)
      let wJson = "{\"actorId\":\(try Self.q(rActor)),\"deviceId\":\(try Self.q(rDev)),\"recipientKeyFingerprint\":\(try Self.q(fp)),\"ephemeralPublicKey\":\(try Self.q(ephPubB64)),\"nonce\":\(try Self.q(Data(wrapped.nonce).base64EncodedString())),\"wrappedKey\":\(try Self.q(wrapped.ciphertext.base64EncodedString())),\"tag\":\(try Self.q(wrapped.tag.base64EncodedString()))}"
      wraps.append((sortKey: "\(rActor.replacingOccurrences(of: "-", with: ""))|\(rDev)|\(fp)", json: wJson))
    }
    wraps.sort { $0.sortKey < $1.sortKey }
    let wrapsArrayJson = wraps.map { $0.json }.joined(separator: ",")
    let unsignedJson = "{\"header\":\(headerStr),\"payloadNonce\":\(try Self.q(Data(sealedPayload.nonce).base64EncodedString())),\"ciphertext\":\(try Self.q(sealedPayload.ciphertext.base64EncodedString())),\"payloadTag\":\(try Self.q(sealedPayload.tag.base64EncodedString())),\"recipients\":[\(wrapsArrayJson)],\"senderSigningPublicKey\":\(try Self.q(signPubB64))}"
    let digest = SHA256.hash(data: Data(unsignedJson.utf8))
    let sig = try signKey.signature(for: digest)
    return String(unsignedJson.dropLast()) + ",\"signature\":\(try Self.q(sig.rawRepresentation.base64EncodedString()))}"
  }

  private func openPackageInternal(binding: String, envelope: String, trustedSender: String) throws -> String {
    let parsed = try parseSyncBinding(binding)
    let agreeKey = try loadAgreementKey(prefix: parsed.prefix)
    let agreePubB64 = Self.spkiBase64(fromRawXY: agreeKey.publicKey.rawRepresentation)
    guard let agreeDer = Data(base64Encoded: agreePubB64) else { throw NativeCryptoError.invalidInput("invalid_handover_package") }
    let myFp = SHA256.hash(data: agreeDer).map { String(format: "%02x", $0) }.joined()
    let trustedKey = try Self.signingPublicKey(fromSpkiBase64: trustedSender)

    guard let envData = envelope.data(using: .utf8),
          let root = try JSONSerialization.jsonObject(with: envData) as? [String: Any],
          let headerObj = root["header"] as? [String: Any],
          let pNonceB64 = root["payloadNonce"] as? String,
          let ciphertextB64 = root["ciphertext"] as? String,
          let pTagB64 = root["payloadTag"] as? String,
          let recipients = root["recipients"] as? [[String: Any]],
          let senderPubB64 = root["senderSigningPublicKey"] as? String,
          let sigB64 = root["signature"] as? String,
          let senderKeyFromEnv = try? Self.signingPublicKey(fromSpkiBase64: senderPubB64),
          senderKeyFromEnv.rawRepresentation == trustedKey.rawRepresentation,
          let sigRaw = Data(base64Encoded: sigB64), sigRaw.count == 64,
          let sig = try? P256.Signing.ECDSASignature(rawRepresentation: sigRaw)
    else {
      throw NativeCryptoError.invalidInput("invalid_handover_package")
    }

    let headerBytes = try Self.canonicalHeader(dict: headerObj)
    let headerStr = String(data: headerBytes, encoding: .utf8)!
    var canonicalWraps: [String] = []
    var selectedWrap: [String: Any]?
    for w in recipients {
      guard let wActor = w["actorId"] as? String,
            let wDev = w["deviceId"] as? String,
            let wFp = w["recipientKeyFingerprint"] as? String,
            let wEph = w["ephemeralPublicKey"] as? String,
            let wNonce = w["nonce"] as? String,
            let wKey = w["wrappedKey"] as? String,
            let wTag = w["tag"] as? String
      else { throw NativeCryptoError.invalidInput("invalid_handover_package") }
      let itemJson = "{\"actorId\":\(try Self.q(wActor)),\"deviceId\":\(try Self.q(wDev)),\"recipientKeyFingerprint\":\(try Self.q(wFp)),\"ephemeralPublicKey\":\(try Self.q(wEph)),\"nonce\":\(try Self.q(wNonce)),\"wrappedKey\":\(try Self.q(wKey)),\"tag\":\(try Self.q(wTag))}"
      canonicalWraps.append(itemJson)
      if wActor == parsed.actorId && wDev == parsed.deviceId && wFp == myFp {
        selectedWrap = w
      }
    }
    let unsignedJson = "{\"header\":\(headerStr),\"payloadNonce\":\(try Self.q(pNonceB64)),\"ciphertext\":\(try Self.q(ciphertextB64)),\"payloadTag\":\(try Self.q(pTagB64)),\"recipients\":[\(canonicalWraps.joined(separator: ","))],\"senderSigningPublicKey\":\(try Self.q(senderPubB64))}"
    guard trustedKey.isValidSignature(sig, for: SHA256.hash(data: Data(unsignedJson.utf8))) else {
      throw NativeCryptoError.invalidInput("invalid_handover_package")
    }
    guard let wrap = selectedWrap,
          let ephB64 = wrap["ephemeralPublicKey"] as? String,
          let wNonceB64 = wrap["nonce"] as? String, let wNonceData = Data(base64Encoded: wNonceB64),
          let wKeyB64 = wrap["wrappedKey"] as? String, let wKeyData = Data(base64Encoded: wKeyB64),
          let wTagB64 = wrap["tag"] as? String, let wTagData = Data(base64Encoded: wTagB64),
          let pNonceData = Data(base64Encoded: pNonceB64),
          let cTextData = Data(base64Encoded: ciphertextB64),
          let pTagData = Data(base64Encoded: pTagB64)
    else {
      throw NativeCryptoError.invalidInput("recipient_key_unavailable")
    }
    let ephPub = try Self.agreementPublicKey(fromSpkiBase64: ephB64)
    let ctxJson = "{\"purpose\":\"roadguard.h5.recipient-key.v1\",\"header\":\(headerStr),\"actorId\":\(try Self.q(parsed.actorId)),\"deviceId\":\(try Self.q(parsed.deviceId)),\"recipientKeyFingerprint\":\(try Self.q(myFp)),\"ephemeralPublicKey\":\(try Self.q(ephB64))}"
    let ctxData = Data(ctxJson.utf8)
    let secret = try agreeKey.sharedSecretFromKeyAgreement(with: ephPub)
    let wrapKey = secret.hkdfDerivedSymmetricKey(
      using: SHA256.self,
      salt: Data(SHA256.hash(data: headerBytes)),
      sharedInfo: ctxData,
      outputByteCount: 32
    )
    let cekData = try AES.GCM.open(
      AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: wNonceData), ciphertext: wKeyData, tag: wTagData),
      using: wrapKey,
      authenticating: ctxData
    )
    let cek = SymmetricKey(data: cekData)
    let plaintext = try AES.GCM.open(
      AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: pNonceData), ciphertext: cTextData, tag: pTagData),
      using: cek,
      authenticating: headerBytes
    )
    guard let expectedSha = headerObj["payloadSha256"] as? String,
          SHA256.hash(data: plaintext).map({ String(format: "%02x", $0) }).joined() == expectedSha
    else {
      throw NativeCryptoError.invalidInput("invalid_handover_package")
    }
    return plaintext.base64EncodedString()
  }

  // MARK: - LocalMediaVault Parity (Chunked AES-256-GCM RGLOCALv1)

  private func prepareMediaKeyInternal(binding: String) throws -> [String: Any] {
    let id = try parseMediaBinding(binding)
    lock.lock()
    defer { lock.unlock() }
    let account = "roadguard.media.v1.\(id)"
    let recorded = UserDefaults.standard.bool(forKey: "\(Self.mediaLifecycleSuite).\(id)")
    let existing = try loadKeychainData(service: Self.keychainService, account: account)
    if existing == nil {
      if recorded { throw NativeCryptoError.lifecycleRecovery("MEDIA_KEY_RECOVERY_REQUIRED") }
      UserDefaults.standard.set(true, forKey: "\(Self.mediaLifecycleSuite).\(id)")
      var keyBytes = Data(count: 32)
      let status = keyBytes.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 32, $0.baseAddress!) }
      guard status == errSecSuccess else { throw NativeCryptoError.blockedNative("media_key_generation_failed") }
      try saveKeychainData(service: Self.keychainService, account: account, data: keyBytes)
    }
    return ["available": true, "securityLevel": SecureEnclave.isAvailable ? "KEYCHAIN_DEVICE_ONLY" : "SOFTWARE"]
  }

  private func mediaVaultDir(id: String, create: Bool) throws -> URL {
    let appSupport = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: create)
    let dir = appSupport.appendingPathComponent("roadguard-media-v1", isDirectory: true).appendingPathComponent(id, isDirectory: true)
    if create {
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    return dir
  }

  private func sealMediaInternal(binding: String, assetId: String, sourceUri: String) throws -> [String: Any] {
    let id = try parseMediaBinding(binding)
    guard Self.isCanonicalUuid(assetId) else { throw NativeCryptoError.invalidInput("media_asset_invalid") }
    guard let keyData = try loadKeychainData(service: Self.keychainService, account: "roadguard.media.v1.\(id)") else {
      throw NativeCryptoError.lifecycleRecovery("MEDIA_KEY_RECOVERY_REQUIRED")
    }
    guard let srcUrl = URL(string: sourceUri), srcUrl.isFileURL else {
      throw NativeCryptoError.invalidInput("media_path_invalid")
    }
    let resolvedSrc = srcUrl.resolvingSymlinksInPath()
    let data = try Data(contentsOf: resolvedSrc)
    guard data.count > 0 else { throw NativeCryptoError.invalidInput("media_size_invalid") }
    let key = SymmetricKey(data: keyData)
    let destUrl = try mediaVaultDir(id: id, create: true).appendingPathComponent("\(assetId).rgc")
    guard !FileManager.default.fileExists(atPath: destUrl.path) else {
      throw NativeCryptoError.invalidInput("local_file_destination_invalid")
    }
    var saltNonce = Data(count: 12)
    _ = saltNonce.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 12, $0.baseAddress!) }
    var header = Data(Self.localMediaMagic)
    header.append(saltNonce)
    var sizeBE = UInt64(data.count).bigEndian
    header.append(Data(bytes: &sizeBE, count: 8))
    var outData = Data(header)
    let chunks = max(1, (data.count + Self.bufferBytes - 1) / Self.bufferBytes)
    let ctxBytes = Data("\(binding):\(assetId)".utf8)
    for idx in 0..<chunks {
      let start = idx * Self.bufferBytes
      let end = min(data.count, start + Self.bufferBytes)
      var aad = Data(header)
      aad.append(ctxBytes)
      var idxBE = UInt64(idx).bigEndian
      aad.append(Data(bytes: &idxBE, count: 8))
      let sealed = try AES.GCM.seal(data.subdata(in: start..<end), using: key, authenticating: aad)
      outData.append(Data(sealed.nonce))
      outData.append(sealed.ciphertext)
      outData.append(sealed.tag)
    }
    try outData.write(to: destUrl, options: [.withoutOverwriting])
    let checksum = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    return ["version": 1, "assetId": assetId, "checksumSha256": checksum, "sizeBytes": data.count]
  }

  private func readMediaRangeInternal(binding: String, assetId: String, offset: Int64, length: Int) throws -> String {
    let id = try parseMediaBinding(binding)
    guard Self.isCanonicalUuid(assetId), offset >= 0, length > 0, length <= Self.maxLocalMediaRead else {
      throw NativeCryptoError.invalidInput("local_file_range_invalid")
    }
    guard let keyData = try loadKeychainData(service: Self.keychainService, account: "roadguard.media.v1.\(id)") else {
      throw NativeCryptoError.lifecycleRecovery("MEDIA_KEY_RECOVERY_REQUIRED")
    }
    let key = SymmetricKey(data: keyData)
    let fileUrl = try mediaVaultDir(id: id, create: false).appendingPathComponent("\(assetId).rgc")
    let handle = try FileHandle(forReadingFrom: fileUrl)
    defer { try? handle.close() }
    guard let header = try handle.read(upToCount: Self.chunkHeaderBytes), header.count == Self.chunkHeaderBytes else {
      throw NativeCryptoError.invalidInput("local_file_range_invalid")
    }
    guard header.prefix(8) == Self.localMediaMagic else { throw NativeCryptoError.invalidInput("local_file_range_invalid") }
    let totalSize = header.subdata(in: 20..<28).withUnsafeBytes { $0.load(as: UInt64.self).bigEndian }
    guard offset <= Int64(totalSize), Int64(length) <= Int64(totalSize) - offset else {
      throw NativeCryptoError.invalidInput("local_file_range_invalid")
    }
    let firstIdx = Int(offset / Int64(Self.bufferBytes))
    let lastIdx = Int((offset + Int64(length) - 1) / Int64(Self.bufferBytes))
    let ctxBytes = Data("\(binding):\(assetId)".utf8)
    var out = Data()
    for idx in firstIdx...lastIdx {
      let plainLen = min(Self.bufferBytes, Int(totalSize) - idx * Self.bufferBytes)
      let fileOffset = UInt64(Self.chunkHeaderBytes) + UInt64(idx) * UInt64(Self.bufferBytes + 12 + Self.tagBytes)
      try handle.seek(toOffset: fileOffset)
      guard let nonce = try handle.read(upToCount: 12), nonce.count == 12,
            let bodyAndTag = try handle.read(upToCount: plainLen + Self.tagBytes), bodyAndTag.count == plainLen + Self.tagBytes
      else { throw NativeCryptoError.invalidInput("local_file_range_invalid") }
      var aad = Data(header)
      aad.append(ctxBytes)
      var idxBE = UInt64(idx).bigEndian
      aad.append(Data(bytes: &idxBE, count: 8))
      let opened = try AES.GCM.open(
        AES.GCM.SealedBox(
          nonce: AES.GCM.Nonce(data: nonce),
          ciphertext: bodyAndTag.prefix(plainLen),
          tag: bodyAndTag.suffix(Self.tagBytes)
        ),
        using: key,
        authenticating: aad
      )
      let start = max(0, Int(offset) - idx * Self.bufferBytes)
      let count = min(plainLen - start, length - out.count)
      out.append(opened.subdata(in: start..<(start + count)))
    }
    return out.base64EncodedString()
  }
}
