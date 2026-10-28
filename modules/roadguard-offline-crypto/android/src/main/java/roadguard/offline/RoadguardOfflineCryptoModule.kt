package roadguard.offline

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.*
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import java.util.UUID
import javax.crypto.KeyAgreement
import org.json.JSONArray

/** Keys are never exported. Creation is explicit; missing keys never regenerate during signing. */
class RoadguardOfflineCryptoModule : Module() {
  private fun store() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  private fun prefix(binding: String): String {
    val a = JSONArray(binding)
    require(a.length() == 4 && a.getString(2) == "REPAIR_CREW")
    require(UUID.fromString(a.getString(0)).toString() == a.getString(0))
    require(UUID.fromString(a.getString(3)).toString() == a.getString(3))
    val uri = java.net.URI(a.getString(1))
    require(uri.scheme in listOf("http", "https") && uri.host != null && uri.userInfo == null && uri.query == null && uri.fragment == null)
    return "roadguard.offline.v1." + MessageDigest.getInstance("SHA-256").digest(binding.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
  }
  private fun level(alias: String): String {
    val key = store().getKey(alias, null) as? PrivateKey ?: return "MISSING"
    val info = KeyFactory.getInstance(key.algorithm, "AndroidKeyStore").getKeySpec(key, KeyInfo::class.java)
    return if (Build.VERSION.SDK_INT >= 31) when(info.securityLevel) {
      KeyProperties.SECURITY_LEVEL_STRONGBOX -> "STRONGBOX"
      KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT -> "TRUSTED_ENVIRONMENT"
      KeyProperties.SECURITY_LEVEL_SOFTWARE -> "SOFTWARE"
      else -> "UNKNOWN"
    } else if(info.isInsideSecureHardware) "HARDWARE_UNSPECIFIED" else "SOFTWARE"
  }
  private fun capability(binding: String): Map<String, Any> {
    val p = prefix(binding)
    val signing = level("$p.sign")
    val agreement = level("$p.agree")
    val hardware = setOf("STRONGBOX", "TRUSTED_ENVIRONMENT")
    val signOk = Build.VERSION.SDK_INT >= 31 && signing in hardware
    val agreeOk = Build.VERSION.SDK_INT >= 31 && agreement in hardware
    return mapOf("available" to true, "apiLevel" to Build.VERSION.SDK_INT,
      "signingUsable" to signOk, "agreementUsable" to agreeOk,
      "securityLevel" to mapOf("signing" to signing, "agreement" to agreement),
      "reason" to if(Build.VERSION.SDK_INT < 31) "NATIVE_UNSUPPORTED_API" else if(!signOk || !agreeOk) "BLOCKED_NATIVE_KEY_OR_HARDWARE" else "NATIVE_RUNTIME_PROOF_REQUIRED")
  }
  private fun usable(binding: String): String {
    val c = capability(binding)
    check(c["signingUsable"] == true && c["agreementUsable"] == true) { "BLOCKED_NATIVE" }
    return prefix(binding)
  }
  override fun definition() = ModuleDefinition {
    Name("RoadguardOfflineCrypto")
    AsyncFunction("capability") { binding: String -> capability(binding) }
    AsyncFunction("installationId") {
      val context = appContext.reactContext ?: error("native_context_missing")
      // App-private installation identifier, not hardware Android ID or account credentials.
      val prefs = context.getSharedPreferences("roadguard.offline.installation", 0)
      synchronized(this@RoadguardOfflineCryptoModule) {
        prefs.getString("device", null) ?: UUID.randomUUID().toString().also {
          check(prefs.edit().putString("device", it).commit()) { "installation_persistence_failed" }
        }
      }
    }
    AsyncFunction("createKeys") { binding: String ->
      check(Build.VERSION.SDK_INT >= 31) { "NATIVE_UNSUPPORTED_API" }
      val p = prefix(binding)
      synchronized(this@RoadguardOfflineCryptoModule) {
        val ks = store()
        val signExists = ks.containsAlias("$p.sign")
        val agreeExists = ks.containsAlias("$p.agree")
        check(signExists == agreeExists) { "KEY_LOSS_RECOVERY_REQUIRED" }
        val context = appContext.reactContext ?: error("native_context_missing")
        val lifecycle = context.getSharedPreferences("roadguard.offline.key-lifecycle", 0)
        // A restored installation with both aliases lost must not silently replace an enrolled keypair.
        check(signExists || !lifecycle.getBoolean(p, false)) { "KEY_LOSS_RECOVERY_REQUIRED" }
        if(!signExists) {
          check(lifecycle.edit().putBoolean(p, true).commit()) { "key_lifecycle_persistence_failed" }
          for((suffix, purpose) in listOf("sign" to KeyProperties.PURPOSE_SIGN, "agree" to KeyProperties.PURPOSE_AGREE_KEY)) {
            val g = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
            val spec = KeyGenParameterSpec.Builder("$p.$suffix", purpose).setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            if(suffix == "sign") spec.setDigests(KeyProperties.DIGEST_SHA256)
            g.initialize(spec.build()); g.generateKeyPair()
          }
        }
        capability(binding)
      }
    }
    AsyncFunction("publicKeys") { binding: String ->
      val p = usable(binding); val ks = store()
      mapOf("signingPublicKey" to Base64.getEncoder().encodeToString(ks.getCertificate("$p.sign").publicKey.encoded),
        "encryptionPublicKey" to Base64.getEncoder().encodeToString(ks.getCertificate("$p.agree").publicKey.encoded))
    }
    AsyncFunction("signManifest") { binding: String, manifest: String ->
      val p = usable(binding)
      Base64.getEncoder().encodeToString(StrictP256.sign(store().getKey("$p.sign", null) as PrivateKey, manifest))
    }
    AsyncFunction("verifyManifest") { publicKey: String, manifest: String, signature: String -> StrictP256.verify(publicKey, manifest, signature) }
    // Diagnostic parity proof only. Raw agreement secret remains native; encrypted handover is locked.
    AsyncFunction("agreementProof") { binding: String, peerPublicKey: String ->
      val p = usable(binding); val agreement = KeyAgreement.getInstance("ECDH")
      agreement.init(store().getKey("$p.agree", null) as PrivateKey)
      agreement.doPhase(StrictP256.publicKey(peerPublicKey), true)
      val secret = agreement.generateSecret()
      try { Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256").digest(secret)) }
      finally { secret.fill(0) }
    }
  }
}
