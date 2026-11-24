package roadguard.offline;

import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;

public final class HandoverPrimitivesTest {
  private static byte[] hex(String s){return java.util.HexFormat.of().parseHex(s);}
  private static void check(boolean v){if(!v)throw new AssertionError();}
  private interface Action{void run()throws Exception;}
  private static void denied(Action a)throws Exception{boolean rejected=false;try{a.run();}catch(GeneralSecurityException|IllegalArgumentException e){rejected=true;}check(rejected);}
  public static void main(String[] args)throws Exception {
    // RFC5869 case 1, truncated to the protocol's exact 32-byte output.
    byte[] ikm=new byte[22];Arrays.fill(ikm,(byte)0x0b);
    byte[] k=HandoverPrimitives.wrappingKey(ikm,hex("000102030405060708090a0b0c"),hex("f0f1f2f3f4f5f6f7f8f9"));
    check(Arrays.equals(k,hex("3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf")));
    byte[] key=new byte[32], nonce=new byte[12], plain="payload".getBytes(java.nio.charset.StandardCharsets.UTF_8), aad="signed-header".getBytes();
    byte[] cipher=HandoverPrimitives.encrypt(key,nonce,plain,aad);
    check(cipher.length==plain.length+16);check(Arrays.equals(HandoverPrimitives.decrypt(key,nonce,cipher,aad),plain));
    byte[] changed=cipher.clone();changed[0]^=1;denied(()->HandoverPrimitives.decrypt(key,nonce,changed,aad));
    denied(()->HandoverPrimitives.decrypt(key,nonce,cipher,"different-header".getBytes()));
    denied(()->HandoverPrimitives.encrypt(new byte[16],nonce,plain,aad));
    denied(()->HandoverPrimitives.encrypt(key,new byte[16],plain,aad));
    denied(()->HandoverPrimitives.decrypt(key,nonce,new byte[15],aad));
    KeyPairGenerator g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));
    KeyPair a=g.generateKeyPair(),b=g.generateKeyPair();
    String ap=Base64.getEncoder().encodeToString(a.getPublic().getEncoded()),bp=Base64.getEncoder().encodeToString(b.getPublic().getEncoded());
    byte[] ab=HandoverPrimitives.rawAgreement(a.getPrivate(),bp),ba=HandoverPrimitives.rawAgreement(b.getPrivate(),ap);
    check(ab.length==32&&MessageDigest.isEqual(ab,ba));
    denied(()->HandoverPrimitives.rawAgreement(a.getPrivate(),bp+"\n"));
    Arrays.fill(ab,(byte)0);Arrays.fill(ba,(byte)0);Arrays.fill(k,(byte)0);
    System.out.println("PASS RFC5869/P256/AES-GCM/tamper/bounds; not Android or complete package proof");
  }
}
