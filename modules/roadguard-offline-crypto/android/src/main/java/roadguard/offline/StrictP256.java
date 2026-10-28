package roadguard.offline;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.*;
import java.util.*;

/** No private-key serialization. Pure JCA codec shared by Android and JVM tests. */
public final class StrictP256 {
  private static final byte[] PREFIX = hex("3059301306072a8648ce3d020106082a8648ce3d03010703420004");
  private static final BigInteger P = new BigInteger("ffffffff00000001000000000000000000000000ffffffffffffffffffffffff",16);
  private static final BigInteger B = new BigInteger("5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b",16);
  private static final BigInteger N = new BigInteger("ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551",16);
  private static byte[] hex(String h) { byte[] b=new byte[h.length()/2]; for(int i=0;i<b.length;i++) b[i]=(byte)Integer.parseInt(h.substring(i*2,i*2+2),16); return b; }
  private static void check(boolean ok) { if(!ok) throw new IllegalArgumentException("invalid_p256_wire"); }
  public static byte[] base64(String s) {
    check(s!=null && s.length()<=24*1024*1024);
    byte[] b=Base64.getDecoder().decode(s); check(Base64.getEncoder().encodeToString(b).equals(s)); return b;
  }
  public static ECPublicKey publicKey(String s) throws GeneralSecurityException {
    byte[] b=base64(s); check(b.length==91 && Arrays.equals(Arrays.copyOf(b,27),PREFIX));
    BigInteger x=new BigInteger(1,Arrays.copyOfRange(b,27,59)),y=new BigInteger(1,Arrays.copyOfRange(b,59,91));
    check(x.compareTo(P)<0 && y.compareTo(P)<0 && y.multiply(y).mod(P).equals(x.multiply(x).multiply(x).subtract(x.multiply(BigInteger.valueOf(3))).add(B).mod(P)));
    return (ECPublicKey)KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(b));
  }
  private static byte[] scalar(byte[] b) {
    check(b.length>=1 && b.length<=33 && (b[0]&128)==0);
    check(b.length==1 || b[0]!=0 || (b[1]&128)!=0);
    BigInteger v=new BigInteger(1,b); check(v.signum()>0 && v.compareTo(N)<0);
    byte[] raw=new byte[32],u=v.toByteArray(); int start=u.length==33?1:0;
    System.arraycopy(u,start,raw,32-(u.length-start),u.length-start); return raw;
  }
  public static byte[] fromDer(byte[] d) {
    check(d.length>=8 && d.length<=72 && d[0]==48 && (d[1]&255)==d.length-2 && d[2]==2);
    int r=d[3]&255; check(r>=1 && r<=33 && 4+r+2<=d.length && d[4+r]==2);
    int s=d[5+r]&255; check(6+r+s==d.length);
    byte[] out=new byte[64]; System.arraycopy(scalar(Arrays.copyOfRange(d,4,4+r)),0,out,0,32);
    System.arraycopy(scalar(Arrays.copyOfRange(d,6+r,d.length)),0,out,32,32); return out;
  }
  public static byte[] toDer(byte[] raw) {
    check(raw.length==64); byte[][] parts=new byte[2][];
    for(int i=0;i<2;i++) { BigInteger v=new BigInteger(1,Arrays.copyOfRange(raw,i*32,i*32+32)); check(v.signum()>0 && v.compareTo(N)<0);parts[i]=v.toByteArray(); }
    byte[] d=new byte[6+parts[0].length+parts[1].length];d[0]=48;d[1]=(byte)(d.length-2);d[2]=2;d[3]=(byte)parts[0].length;
    System.arraycopy(parts[0],0,d,4,parts[0].length);int j=4+parts[0].length;d[j]=2;d[j+1]=(byte)parts[1].length;System.arraycopy(parts[1],0,d,j+2,parts[1].length);return d;
  }
  public static byte[] message(String manifest) {
    byte[] claim=manifest.getBytes(StandardCharsets.UTF_8),prefix="roadguard.h5.direct-sync.v1\0".getBytes(StandardCharsets.UTF_8);
    check(claim.length>0 && claim.length<=16*1024*1024); byte[] out=Arrays.copyOf(prefix,prefix.length+claim.length);System.arraycopy(claim,0,out,prefix.length,claim.length);return out;
  }
  public static byte[] sign(PrivateKey key,String manifest) throws GeneralSecurityException {
    Signature signer=Signature.getInstance("SHA256withECDSA");signer.initSign(key);signer.update(message(manifest));return fromDer(signer.sign());
  }
  public static boolean verify(String publicKey,String manifest,String signature) throws GeneralSecurityException {
    Signature v=Signature.getInstance("SHA256withECDSA");v.initVerify(publicKey(publicKey));v.update(message(manifest));return v.verify(toDer(base64(signature)));
  }
  private StrictP256() {}
}
