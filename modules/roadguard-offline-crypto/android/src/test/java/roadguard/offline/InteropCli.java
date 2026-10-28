package roadguard.offline;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

/** Public test artifacts only. Ephemeral private key never leaves this process. JVM, not Keystore. */
public final class InteropCli {
  public static void main(String[] args) throws Exception {
    String manifest=new String(Base64.getDecoder().decode(args[1]),StandardCharsets.UTF_8);
    if(args[0].equals("verify")) {
      System.out.println(StrictP256.verify(args[2],manifest,args[3]));return;
    }
    KeyPairGenerator g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));KeyPair pair=g.generateKeyPair();
    System.out.println(Base64.getEncoder().encodeToString(pair.getPublic().getEncoded()));
    System.out.println(Base64.getEncoder().encodeToString(StrictP256.sign(pair.getPrivate(),manifest)));
  }
}
