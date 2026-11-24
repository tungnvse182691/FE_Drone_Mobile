package roadguard.offline;
import java.security.*;
import java.security.spec.*;
import java.util.*;

/** Isolated test-key transport only. Not included in application source sets. */
public final class HandoverInteropCli {
  private static byte[] b(String v){return Base64.getDecoder().decode(v);}
  private static void out(byte[] v){System.out.println(Base64.getEncoder().encodeToString(v));}
  public static void main(String[] args)throws Exception {
    if(args[0].equals("new")){
      KeyPairGenerator g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));KeyPair pair=g.generateKeyPair();
      out(pair.getPrivate().getEncoded());out(pair.getPublic().getEncoded());
    } else if(args[0].equals("open")) {
      PrivateKey key=KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(b(args[1])));
      byte[] secret=HandoverPrimitives.rawAgreement(key,args[2]);
      byte[] wrapping=HandoverPrimitives.wrappingKey(secret,b(args[3]),b(args[4]));
      try{out(HandoverPrimitives.decrypt(wrapping,b(args[5]),b(args[6]),b(args[4])));}
      finally{Arrays.fill(secret,(byte)0);Arrays.fill(wrapping,(byte)0);}
    }else out(HandoverPrimitives.encrypt(b(args[1]),b(args[2]),b(args[3]),b(args[4])));
  }
}
