package roadguard.offline

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import org.json.JSONArray
import java.net.URI
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.security.KeyStore
import java.security.MessageDigest
import java.util.Base64
import java.util.UUID
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory

/** Local storage only, separate from signed sync / 42A and its hardware acceptance gate.
 * JS callers must authorize actor/session/environment before and after each await.
 * No arbitrary output path, key export, source deletion, or implicit key replacement. */
class LocalMediaVault(private val context: Context) {
  companion object { private val keyCreationLock = Any() }
  private fun store() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  private fun identity(binding: String): String {
    require(binding.length in 1..2048) { "media_binding_invalid" }
    val values = JSONArray(binding)
    require(values.length() == 3 && (0..2).all { values.get(it) is String }) { "media_binding_invalid" }
    require(UUID.fromString(values.getString(0)).toString() == values.getString(0)) { "media_binding_invalid" }
    require(values.getString(2) in setOf("REPAIR_CREW", "DRONE_OPERATOR", "REPORTER")) { "media_binding_invalid" }
    val environment = URI(values.getString(1))
    require(environment.scheme in setOf("http", "https") && environment.host != null &&
      environment.userInfo == null && environment.query == null && environment.fragment == null) { "media_binding_invalid" }
    return MessageDigest.getInstance("SHA-256").digest(binding.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
  }
  private fun asset(value: String): String {
    require(UUID.fromString(value).toString() == value) { "media_asset_invalid" }; return value
  }
  private fun keyName(identity: String) = "roadguard.media.v1.$identity"
  private fun key(identity: String): SecretKey = store().getKey(keyName(identity), null) as? SecretKey
    ?: error("MEDIA_KEY_RECOVERY_REQUIRED")

  fun createKey(binding: String): Map<String, Any> = synchronized(keyCreationLock) {
    val id = identity(binding)
    val alias = keyName(id)
    val lifecycle = context.getSharedPreferences("roadguard.media.key-lifecycle", Context.MODE_PRIVATE)
    if (!store().containsAlias(alias)) {
      check(!lifecycle.getBoolean(id, false)) { "MEDIA_KEY_RECOVERY_REQUIRED" }
      // Persist intent first. A failed/interrupted generation requires recovery,
      // rather than silently replacing a potentially enrolled encryption key.
      check(lifecycle.edit().putBoolean(id, true).commit()) { "media_key_persistence_failed" }
      val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
      generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build())
      generator.generateKey()
    }
    val secret = key(id)
    check(secret.encoded == null) { "media_key_exportable" }
    val info = SecretKeyFactory.getInstance("AES", "AndroidKeyStore").getKeySpec(secret, KeyInfo::class.java) as KeyInfo
    val level = if (Build.VERSION.SDK_INT >= 31) when (info.securityLevel) {
      KeyProperties.SECURITY_LEVEL_STRONGBOX -> "STRONGBOX"
      KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT -> "TRUSTED_ENVIRONMENT"
      KeyProperties.SECURITY_LEVEL_SOFTWARE -> "SOFTWARE"
      else -> "UNKNOWN"
    } else if (info.isInsideSecureHardware) "HARDWARE_UNSPECIFIED" else "SOFTWARE"
    mapOf("available" to true, "securityLevel" to level)
  }

  private fun directory(id: String, create: Boolean): Path {
    val files = context.filesDir.toPath().toRealPath()
    val root = files.resolve("roadguard-media-v1")
    val owned = root.resolve(id)
    // Validate each parent before creating its child; never follow a pre-existing
    // symlink, even as a side effect of creating directories for a rejected read.
    for (path in listOf(root, owned)) {
      if (create) {
        try { Files.createDirectory(path) }
        catch (_: java.nio.file.FileAlreadyExistsException) { /* Validate below. */ }
      }
      check(Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS) && path.toRealPath() == path) { "media_path_invalid" }
    }
    return owned
  }
  private fun source(uri: String): Path {
    val parsed = URI(uri)
    require(parsed.scheme == "file" && parsed.authority == null && parsed.query == null && parsed.fragment == null) { "media_path_invalid" }
    val supplied = java.io.File(parsed).toPath().toAbsolutePath().normalize()
    val actual = supplied.toRealPath()
    val files = context.filesDir.toPath().toRealPath()
    val cache = context.cacheDir.toPath().toRealPath()
    val allowed = listOf("crew-field", "reporter-photos-v1", "drone-sources-v1", "qa-media-vault-20261125")
      .any { actual.startsWith(files.resolve(it)) }
    require((actual.startsWith(cache) || allowed) && !Files.isSymbolicLink(supplied) &&
      Files.isRegularFile(actual, LinkOption.NOFOLLOW_LINKS)) { "media_path_invalid" }
    // Reject intermediate symlinks as well; only the OS-owned app roots are canonicalized.
    val canonicalRoot = if (actual.startsWith(cache)) cache else files
    val osRoot = (if (actual.startsWith(cache)) context.cacheDir else context.filesDir).toPath().toAbsolutePath().normalize()
    // /data/user/0 and /data/data may name the same OS-owned app root.
    // Allow that root alias, while rejecting every symlink below it.
    val root = if (supplied.startsWith(osRoot)) osRoot else canonicalRoot
    require(supplied.startsWith(root) && canonicalRoot.resolve(root.relativize(supplied)) == actual) { "media_path_invalid" }
    var current = root
    for (component in root.relativize(supplied)) {
      current = current.resolve(component)
      require(!Files.isSymbolicLink(current)) { "media_path_invalid" }
    }
    return actual
  }

  fun seal(binding: String, assetId: String, sourceUri: String): Map<String, Any> {
    val id = identity(binding); val name = asset(assetId)
    val secret = key(id) // Never generate during read/write; explicit preparation only.
    val input = source(sourceUri)
    val size = Files.size(input)
    require(size > 0) { "media_size_invalid" }
    val output = directory(id, true).resolve("$name.rgc")
    val checksum = LocalFileCrypto.seal(input, output, secret, "$binding:$name")
    return mapOf("version" to 1, "assetId" to name, "checksumSha256" to checksum, "sizeBytes" to size)
  }

  fun readRange(binding: String, assetId: String, offset: Long, length: Int): String {
    val id = identity(binding); val name = asset(assetId)
    val secret = key(id)
    val input = directory(id, false).resolve("$name.rgc")
    require(!Files.isSymbolicLink(input) && Files.isRegularFile(input, LinkOption.NOFOLLOW_LINKS)) { "media_path_invalid" }
    val bytes = LocalFileCrypto.readRange(input, secret, "$binding:$name", offset, length)
    try { return Base64.getEncoder().encodeToString(bytes) }
    finally { bytes.fill(0) }
  }
}
