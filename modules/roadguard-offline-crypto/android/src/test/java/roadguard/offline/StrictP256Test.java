package roadguard.offline;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;
import javax.crypto.KeyAgreement;

public final class StrictP256Test {
  static void require(boolean ok) {if(!ok)throw new AssertionError();}
  static void rejects(Runnable r) {try {r.run();}catch(IllegalArgumentException e){return;}throw new AssertionError("accepted invalid input");}
  public static void main(String[] args) throws Exception {
    KeyPairGenerator g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));KeyPair a=g.generateKeyPair(),b=g.generateKeyPair();
    String pub=Base64.getEncoder().encodeToString(a.getPublic().getEncoded()),claim="{\"text\":\"Hoàng Hải 😀\"}";
    byte[] sig=StrictP256.sign(a.getPrivate(),claim);String s=Base64.getEncoder().encodeToString(sig);
    require(StrictP256.verify(pub,claim,s));require(!StrictP256.verify(pub,claim+"x",s));
    require(!StrictP256.verify(Base64.getEncoder().encodeToString(b.getPublic().getEncoded()),claim,s));
    require(Arrays.equals(sig,StrictP256.fromDer(StrictP256.toDer(sig))));
    rejects(()->StrictP256.toDer(new byte[64]));rejects(()->StrictP256.fromDer(new byte[]{48,6,2,1,0,2,1,1}));
    rejects(()->StrictP256.fromDer(new byte[]{48,7,2,2,0,1,2,1,1}));rejects(()->StrictP256.fromDer(new byte[]{48,6,2,1,(byte)128,2,1,1}));
    rejects(()->StrictP256.base64("AB=="));
    byte[] invalid=a.getPublic().getEncoded();Arrays.fill(invalid,27,91,(byte)0);
    try {StrictP256.publicKey(Base64.getEncoder().encodeToString(invalid));throw new AssertionError();} catch(IllegalArgumentException expected) {}
    g.initialize(new ECGenParameterSpec("secp384r1"));try {StrictP256.publicKey(Base64.getEncoder().encodeToString(g.generateKeyPair().getPublic().getEncoded()));throw new AssertionError();}catch(IllegalArgumentException expected){}
    KeyAgreement ka=KeyAgreement.getInstance("ECDH"),kb=KeyAgreement.getInstance("ECDH");ka.init(a.getPrivate());ka.doPhase(b.getPublic(),true);kb.init(b.getPrivate());kb.doPhase(a.getPublic(),true);require(Arrays.equals(ka.generateSecret(),kb.generateSecret()));
    Signature doubleHash=Signature.getInstance("SHA256withECDSA");doubleHash.initSign(a.getPrivate());doubleHash.update(MessageDigest.getInstance("SHA-256").digest(StrictP256.message(claim)));
    require(!StrictP256.verify(pub,claim,Base64.getEncoder().encodeToString(StrictP256.fromDer(doubleHash.sign()))));
    System.out.println("PASS JVM codec/sign/ECDH (not Android Keystore proof)");
  }
}
