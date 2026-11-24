package roadguard.offline;

import java.security.GeneralSecurityException;
import java.security.PrivateKey;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Internal primitives only; no bridge method returns raw or derived agreement secrets. */
final class HandoverPrimitives {
  private static final int MAX_PAYLOAD = 16 * 1024 * 1024;
  static byte[] rawAgreement(PrivateKey privateKey, String peerSpki) throws GeneralSecurityException {
    KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
    agreement.init(privateKey);
    agreement.doPhase(StrictP256.publicKey(peerSpki), true);
    byte[] secret = agreement.generateSecret();
    if (secret.length != 32) {
      Arrays.fill(secret, (byte)0);
      throw new GeneralSecurityException("invalid_p256_secret_length");
    }
    return secret;
  }
  /** HKDF-SHA256 extract + one expand block, RFC5869 L=32. Caller supplies protocol salt/context. */
  static byte[] wrappingKey(byte[] secret, byte[] salt, byte[] context) throws GeneralSecurityException {
    if (secret == null || secret.length == 0 || salt == null || salt.length == 0 || context == null || context.length > MAX_PAYLOAD)
      throw new IllegalArgumentException("invalid_kdf_input");
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(salt, "HmacSHA256"));
    byte[] prk = mac.doFinal(secret);
    try {
      mac.init(new SecretKeySpec(prk, "HmacSHA256"));
      mac.update(context); mac.update((byte)1);
      return mac.doFinal();
    } finally { Arrays.fill(prk, (byte)0); }
  }
  /** Output is ciphertext followed by its 16-byte tag. Protocol serialization splits those fields. */
  static byte[] encrypt(byte[] key, byte[] nonce, byte[] plaintext, byte[] aad) throws GeneralSecurityException {
    validate(key,nonce,plaintext,aad,false);
    return cipher(Cipher.ENCRYPT_MODE,key,nonce,plaintext,aad);
  }
  static byte[] decrypt(byte[] key, byte[] nonce, byte[] ciphertextAndTag, byte[] aad) throws GeneralSecurityException {
    validate(key,nonce,ciphertextAndTag,aad,true);
    return cipher(Cipher.DECRYPT_MODE,key,nonce,ciphertextAndTag,aad);
  }
  private static void validate(byte[] key,byte[] nonce,byte[] input,byte[] aad,boolean decrypt) {
    if (key==null || key.length!=32 || nonce==null || nonce.length!=12 || input==null ||
        input.length<(decrypt?17:1) || input.length>MAX_PAYLOAD+(decrypt?16:0) || aad==null || aad.length>MAX_PAYLOAD)
      throw new IllegalArgumentException("invalid_aead_input");
  }
  private static byte[] cipher(int mode,byte[] key,byte[] nonce,byte[] input,byte[] aad) throws GeneralSecurityException {
    Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(mode,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce));
    cipher.updateAAD(aad);return cipher.doFinal(input);
  }
  private HandoverPrimitives() {}
}
