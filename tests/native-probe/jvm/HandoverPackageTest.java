package roadguard.offline;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;
import java.nio.charset.StandardCharsets;

public class HandoverPackageTest {
  private static final String ACTOR="11111111-1111-4111-8111-111111111111", RECIPIENT="22222222-2222-4222-8222-222222222222";
  private static void check(boolean ok){if(!ok)throw new AssertionError();}
  private interface Action{void run()throws Exception;}
  private static void denied(Action a)throws Exception{boolean denied=false;try{a.run();}catch(GeneralSecurityException|IllegalArgumentException ex){denied=true;}check(denied);}
  private static String publicKey(KeyPair k){return Base64.getEncoder().encodeToString(k.getPublic().getEncoded());}
  public static void main(String[]args)throws Exception{
    KeyPairGenerator g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));
    KeyPair sender=g.generateKeyPair(),receiver=g.generateKeyPair(),receiverSign=g.generateKeyPair(),wrong=g.generateKeyPair();
    byte[] payload="bằng chứng thử nghiệm".getBytes(StandardCharsets.UTF_8);
    HandoverPackage.Header h=new HandoverPackage.Header(1,"huy-final.offline.bundle.v1","33333333-3333-4333-8333-333333333333","44444444-4444-4444-8444-444444444444",ACTOR,"source-qa",new String[]{"55555555-5555-4555-8555-555555555555"},HandoverPackage.hash(payload));
    HandoverPackage.Recipient r=new HandoverPackage.Recipient(RECIPIENT,"recipient-qa",publicKey(receiver),publicKey(receiverSign));
    HandoverPackage.Envelope p=HandoverPackage.seal(h,payload,sender.getPrivate(),publicKey(sender),ACTOR,"source-qa",new HandoverPackage.Recipient[]{r});
    check(Arrays.equals(HandoverPackage.open(p,receiver.getPrivate(),publicKey(receiver),RECIPIENT,"recipient-qa",publicKey(sender)),payload));
    denied(()->HandoverPackage.open(p,wrong.getPrivate(),publicKey(wrong),RECIPIENT,"recipient-qa",publicKey(sender)));
    denied(()->HandoverPackage.open(p,receiver.getPrivate(),publicKey(receiver),ACTOR,"recipient-qa",publicKey(sender)));
    denied(()->HandoverPackage.open(p,receiver.getPrivate(),publicKey(receiver),RECIPIENT,"recipient-qa",publicKey(wrong)));
    HandoverPackage.Envelope tampered=new HandoverPackage.Envelope(h,p.payloadNonce,p.ciphertext,p.payloadTag,p.recipients(),p.senderSigningPublicKey,Base64.getEncoder().encodeToString(new byte[64]));
    denied(()->HandoverPackage.open(tampered,receiver.getPrivate(),publicKey(receiver),RECIPIENT,"recipient-qa",publicKey(sender)));
    denied(()->HandoverPackage.seal(h,"wrong-hash".getBytes(),sender.getPrivate(),publicKey(sender),ACTOR,"source-qa",new HandoverPackage.Recipient[]{r}));
    denied(()->HandoverPackage.seal(h,payload,sender.getPrivate(),publicKey(sender),RECIPIENT,"source-qa",new HandoverPackage.Recipient[]{r}));
    denied(()->HandoverPackage.seal(h,payload,sender.getPrivate(),publicKey(sender),ACTOR,"source-qa",new HandoverPackage.Recipient[]{r,r}));
    String before=new String(HandoverPackage.canonicalHeader(h),StandardCharsets.UTF_8);h.originIds()[0]="changed-copy";
    check(before.equals(new String(HandoverPackage.canonicalHeader(h),StandardCharsets.UTF_8)));
    check(before.startsWith("{\"version\":1,\"payloadSchema\":\"huy-final.offline.bundle.v1\",\"packageId\":"));
    System.out.println("PASS canonical header/package + separate keys + recipients + tamper; not Android or business authority");
  }
}
