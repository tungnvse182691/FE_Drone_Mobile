package roadguard.offline;
import java.security.*;
import java.security.spec.*;
import java.util.*;
import java.nio.charset.StandardCharsets;

/** Isolated JVM fixture keys only. No Android/production key access. */
public final class PackageInteropCli {
  static String b64(byte[] b){return Base64.getEncoder().encodeToString(b);}
  static byte[] decode(String s){return Base64.getDecoder().decode(s);}
  static KeyPair key()throws Exception{KeyPairGenerator g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));return g.generateKeyPair();}
  public static void main(String[] args)throws Exception {
    if(args[0].equals("keys")){KeyPair k=key(),s=key();System.out.println(b64(k.getPrivate().getEncoded()));System.out.println(b64(k.getPublic().getEncoded()));System.out.println(b64(s.getPublic().getEncoded()));return;}
    Scanner in=new Scanner(System.in,StandardCharsets.UTF_8);List<String> v=new ArrayList<>();while(in.hasNextLine())v.add(in.nextLine());
    if(args[0].equals("seal")) {
      byte[] plain="Bằng chứng Java và BE — thử nghiệm".getBytes(StandardCharsets.UTF_8);KeyPair s=key();
      HandoverPackage.Header h=new HandoverPackage.Header(1,"huy-final.offline.bundle.v1","33333333-3333-4333-8333-333333333333","44444444-4444-4444-8444-444444444444","11111111-1111-4111-8111-111111111111","source-qa",new String[]{"55555555-5555-4555-8555-555555555555"},HandoverPackage.hash(plain));
      HandoverPackage.Recipient r=new HandoverPackage.Recipient("22222222-2222-4222-8222-222222222222","recipient-qa",v.get(0),v.get(1));
      HandoverPackage.Envelope p=HandoverPackage.seal(h,plain,s.getPrivate(),b64(s.getPublic().getEncoded()),h.originalActorId,h.sourceDeviceId,new HandoverPackage.Recipient[]{r});
      System.out.println(HandoverPackage.json(p));System.out.println(b64(plain));System.out.println(b64(HandoverPackage.canonicalUnsigned(p)));return;
    }
    int i=0;PrivateKey k=KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(decode(v.get(i++))));String ownPublic=v.get(i++);
    HandoverPackage.Header h=new HandoverPackage.Header(Integer.parseInt(v.get(i++)),v.get(i++),v.get(i++),v.get(i++),v.get(i++),v.get(i++),v.get(i++).split(","),v.get(i++));
    String nonce=v.get(i++),cipher=v.get(i++),tag=v.get(i++),signer=v.get(i++),signature=v.get(i++);int count=Integer.parseInt(v.get(i++));HandoverPackage.Wrap[] wraps=new HandoverPackage.Wrap[count];
    for(int j=0;j<count;j++)wraps[j]=new HandoverPackage.Wrap(v.get(i++),v.get(i++),v.get(i++),v.get(i++),v.get(i++),v.get(i++),v.get(i++));
    HandoverPackage.Envelope p=new HandoverPackage.Envelope(h,nonce,cipher,tag,wraps,signer,signature);
    System.out.println(b64(HandoverPackage.open(p,k,ownPublic,"22222222-2222-4222-8222-222222222222","recipient-qa",v.get(i))));
    System.out.println(b64(HandoverPackage.canonicalHeader(h)));System.out.println(b64(HandoverPackage.canonicalUnsigned(p)));
  }
}
