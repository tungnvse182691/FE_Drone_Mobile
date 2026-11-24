package roadguard.offline;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;

/** Version 1 sealed payload. Successful decryption grants no workflow/evidence authority. */
public final class HandoverPackage {
  private static final int MAX_PAYLOAD=16*1024*1024;
  private static final String SCHEMA="huy-final.offline.bundle.v1";
  public static final class Header {
    public final int version;
    public final String payloadSchema,packageId,projectId,originalActorId,sourceDeviceId,payloadSha256;
    private final String[] origins;
    public Header(int version,String schema,String packageId,String projectId,String actor,String device,String[] origins,String hash) {
      require(version==1&&SCHEMA.equals(schema));id(packageId);id(projectId);identity(actor,device);hashBytes(hash);
      require(origins!=null&&origins.length>=1&&origins.length<=1000);this.origins=origins.clone();
      String prior=null;for(String origin:this.origins){id(origin);require(prior==null||prior.compareTo(origin)<0);prior=origin;}
      this.version=version;this.payloadSchema=schema;this.packageId=packageId;this.projectId=projectId;
      this.originalActorId=actor;this.sourceDeviceId=device;this.payloadSha256=hash;
    }
    public String[] originIds(){return origins.clone();}
  }
  public static final class Recipient {
    public final String actorId,deviceId,encryptionPublicKey,signingPublicKey;
    public Recipient(String actor,String device,String encryption,String signing)throws GeneralSecurityException {
      identity(actor,device);StrictP256.publicKey(encryption);StrictP256.publicKey(signing);require(!encryption.equals(signing));
      actorId=actor;deviceId=device;encryptionPublicKey=encryption;signingPublicKey=signing;
    }
  }
  public static final class Wrap {
    public final String actorId,deviceId,recipientKeyFingerprint,ephemeralPublicKey,nonce,wrappedKey,tag;
    public Wrap(String actor,String device,String fingerprint,String ephemeral,String nonce,String wrapped,String tag)throws GeneralSecurityException {
      identity(actor,device);hashBytes(fingerprint);StrictP256.publicKey(ephemeral);decode(nonce,12,12);decode(wrapped,32,32);decode(tag,16,16);
      actorId=actor;deviceId=device;recipientKeyFingerprint=fingerprint;ephemeralPublicKey=ephemeral;this.nonce=nonce;wrappedKey=wrapped;this.tag=tag;
    }
    private String sortKey(){return actorId.replace("-","")+"|"+deviceId+"|"+recipientKeyFingerprint;}
  }
  public static final class Envelope {
    public final Header header;
    public final String payloadNonce,ciphertext,payloadTag,senderSigningPublicKey,signature;
    private final Wrap[] wrappers;
    public Envelope(Header h,String nonce,String ciphertext,String tag,Wrap[] recipients,String signer,String signature)throws GeneralSecurityException {
      require(h!=null&&recipients!=null&&recipients.length>=1&&recipients.length<=32);
      decode(nonce,12,12);decode(ciphertext,MAX_PAYLOAD,-1);decode(tag,16,16);StrictP256.publicKey(signer);
      // An unsigned internal envelope is used only while sealing, never accepted by open().
      require(signature!=null);if(!signature.isEmpty())decode(signature,64,64);
      wrappers=recipients.clone();Set<String> identities=new HashSet<>(),fingerprints=new HashSet<>();String prior=null;
      for(Wrap r:wrappers){require(r!=null);String sort=r.sortKey();require(prior==null||prior.compareTo(sort)<0);
        require(identities.add(r.actorId+"|"+r.deviceId)&&fingerprints.add(r.recipientKeyFingerprint));prior=sort;}
      header=h;payloadNonce=nonce;this.ciphertext=ciphertext;payloadTag=tag;senderSigningPublicKey=signer;this.signature=signature;
    }
    public Wrap[] recipients(){return wrappers.clone();}
  }
  public static Envelope seal(Header h,byte[] input,PrivateKey signingKey,String signingPublic,String actor,String device,Recipient[] recipients)throws GeneralSecurityException {
    require(h!=null&&input!=null&&input.length>=1&&input.length<=MAX_PAYLOAD&&recipients!=null&&recipients.length>=1&&recipients.length<=32);
    require(h.originalActorId.equals(actor)&&h.sourceDeviceId.equals(device));StrictP256.publicKey(signingPublic);
    byte[] plaintext=input.clone();Recipient[] receivers=recipients.clone();byte[] content=new byte[32];new SecureRandom().nextBytes(content);
    try {
      require(MessageDigest.isEqual(MessageDigest.getInstance("SHA-256").digest(plaintext),hashBytes(h.payloadSha256)));
      Set<String> identities=new HashSet<>(),fingerprints=new HashSet<>();
      for(Recipient r:receivers){require(r!=null&&identities.add(r.actorId+"|"+r.deviceId)&&fingerprints.add(hash(StrictP256.base64(r.encryptionPublicKey))));}
      byte[] nonce=randomNonce(),encrypted=HandoverPrimitives.encrypt(content,nonce,plaintext,canonicalHeader(h));
      Wrap[] wraps=new Wrap[receivers.length];for(int i=0;i<receivers.length;i++)wraps[i]=wrap(h,content,receivers[i]);
      Arrays.sort(wraps,Comparator.comparing(Wrap::sortKey));
      Envelope unsigned=new Envelope(h,b64(nonce),b64(Arrays.copyOf(encrypted,encrypted.length-16)),b64(Arrays.copyOfRange(encrypted,encrypted.length-16,encrypted.length)),wraps,signingPublic,"");
      Signature signer=Signature.getInstance("SHA256withECDSA");signer.initSign(signingKey);signer.update(canonicalUnsigned(unsigned));
      byte[] signature=StrictP256.fromDer(signer.sign());
      // Detect a mismatched signing public key before anything leaves native.
      Signature verify=Signature.getInstance("SHA256withECDSA");verify.initVerify(StrictP256.publicKey(signingPublic));verify.update(canonicalUnsigned(unsigned));
      require(verify.verify(StrictP256.toDer(signature)));
      return new Envelope(h,unsigned.payloadNonce,unsigned.ciphertext,unsigned.payloadTag,wraps,signingPublic,b64(signature));
    } finally {Arrays.fill(content,(byte)0);Arrays.fill(plaintext,(byte)0);}
  }
  public static byte[] open(Envelope p,PrivateKey recipientKey,String recipientPublic,String actor,String device,String trustedSender)throws GeneralSecurityException {
    require(p!=null);identity(actor,device);StrictP256.publicKey(recipientPublic);StrictP256.publicKey(trustedSender);
    require(MessageDigest.isEqual(StrictP256.base64(trustedSender),StrictP256.base64(p.senderSigningPublicKey)));
    Signature verifier=Signature.getInstance("SHA256withECDSA");verifier.initVerify(StrictP256.publicKey(trustedSender));verifier.update(canonicalUnsigned(p));
    require(verifier.verify(StrictP256.toDer(decode(p.signature,64,64))));
    String fingerprint=hash(StrictP256.base64(recipientPublic));Wrap selected=null;
    for(Wrap w:p.wrappers)if(w.actorId.equals(actor)&&w.deviceId.equals(device)&&w.recipientKeyFingerprint.equals(fingerprint))selected=w;
    if(selected==null)throw new GeneralSecurityException("recipient_key_unavailable");
    byte[] secret=null,wrapping=null,content=null,plaintext=null;
    try {
      byte[] context=wrappingContext(p.header,selected.actorId,selected.deviceId,selected.recipientKeyFingerprint,selected.ephemeralPublicKey);
      secret=HandoverPrimitives.rawAgreement(recipientKey,selected.ephemeralPublicKey);
      wrapping=HandoverPrimitives.wrappingKey(secret,MessageDigest.getInstance("SHA-256").digest(canonicalHeader(p.header)),context);
      content=HandoverPrimitives.decrypt(wrapping,decode(selected.nonce,12,12),join(decode(selected.wrappedKey,32,32),decode(selected.tag,16,16)),context);
      require(content.length==32);
      plaintext=HandoverPrimitives.decrypt(content,decode(p.payloadNonce,12,12),join(decode(p.ciphertext,MAX_PAYLOAD,-1),decode(p.payloadTag,16,16)),canonicalHeader(p.header));
      require(MessageDigest.isEqual(MessageDigest.getInstance("SHA-256").digest(plaintext),hashBytes(p.header.payloadSha256)));
      byte[] result=plaintext;plaintext=null;return result;
    } finally {for(byte[] v:new byte[][]{secret,wrapping,content,plaintext})if(v!=null)Arrays.fill(v,(byte)0);}
  }
  private static Wrap wrap(Header h,byte[] content,Recipient r)throws GeneralSecurityException {
    KeyPairGenerator generator=KeyPairGenerator.getInstance("EC");generator.initialize(new ECGenParameterSpec("secp256r1"));KeyPair ephemeral=generator.generateKeyPair();
    String publicKey=b64(ephemeral.getPublic().getEncoded()),fingerprint=hash(StrictP256.base64(r.encryptionPublicKey));
    byte[] context=wrappingContext(h,r.actorId,r.deviceId,fingerprint,publicKey),secret=null,key=null;
    try {
      secret=HandoverPrimitives.rawAgreement(ephemeral.getPrivate(),r.encryptionPublicKey);
      key=HandoverPrimitives.wrappingKey(secret,MessageDigest.getInstance("SHA-256").digest(canonicalHeader(h)),context);
      byte[] nonce=randomNonce(),sealed=HandoverPrimitives.encrypt(key,nonce,content,context);
      return new Wrap(r.actorId,r.deviceId,fingerprint,publicKey,b64(nonce),b64(Arrays.copyOf(sealed,32)),b64(Arrays.copyOfRange(sealed,32,48)));
    } finally {if(secret!=null)Arrays.fill(secret,(byte)0);if(key!=null)Arrays.fill(key,(byte)0);}
  }
  public static byte[] canonicalHeader(Header h){require(h!=null);StringBuilder b=new StringBuilder("{\"version\":1,\"payloadSchema\":").append(q(h.payloadSchema));
    b.append(",\"packageId\":").append(q(h.packageId)).append(",\"projectId\":").append(q(h.projectId)).append(",\"originalActorId\":").append(q(h.originalActorId));
    b.append(",\"sourceDeviceId\":").append(q(h.sourceDeviceId)).append(",\"originIds\":[");for(int i=0;i<h.origins.length;i++){if(i>0)b.append(',');b.append(q(h.origins[i]));}
    return bytes(b.append("],\"payloadSha256\":").append(q(h.payloadSha256)).append('}').toString());}
  public static byte[] canonicalUnsigned(Envelope p){StringBuilder b=new StringBuilder("{\"header\":").append(text(canonicalHeader(p.header)));
    b.append(",\"payloadNonce\":").append(q(p.payloadNonce)).append(",\"ciphertext\":").append(q(p.ciphertext)).append(",\"payloadTag\":").append(q(p.payloadTag)).append(",\"recipients\":[");
    for(int i=0;i<p.wrappers.length;i++){if(i>0)b.append(',');Wrap w=p.wrappers[i];b.append('{').append(recipientIdentity(w.actorId,w.deviceId,w.recipientKeyFingerprint));
      b.append(",\"ephemeralPublicKey\":").append(q(w.ephemeralPublicKey)).append(",\"nonce\":").append(q(w.nonce)).append(",\"wrappedKey\":").append(q(w.wrappedKey)).append(",\"tag\":").append(q(w.tag)).append('}');}
    return bytes(b.append("],\"senderSigningPublicKey\":").append(q(p.senderSigningPublicKey)).append('}').toString());}
  public static String json(Envelope p){String unsigned=text(canonicalUnsigned(p));return unsigned.substring(0,unsigned.length()-1)+",\"signature\":"+q(p.signature)+"}";}
  public static byte[] wrappingContext(Header h,String actor,String device,String fingerprint,String ephemeral){identity(actor,device);hashBytes(fingerprint);
    return bytes("{\"purpose\":\"roadguard.h5.recipient-key.v1\",\"header\":"+text(canonicalHeader(h))+","+recipientIdentity(actor,device,fingerprint)+",\"ephemeralPublicKey\":"+q(ephemeral)+"}");}
  private static String recipientIdentity(String actor,String device,String fingerprint){return "\"actorId\":"+q(actor)+",\"deviceId\":"+q(device)+",\"recipientKeyFingerprint\":"+q(fingerprint);}
  public static String hash(byte[] v)throws GeneralSecurityException {byte[] digest=MessageDigest.getInstance("SHA-256").digest(v);StringBuilder b=new StringBuilder();for(byte x:digest)b.append(String.format(Locale.ROOT,"%02x",x&255));return b.toString();}
  private static byte[] hashBytes(String h){require(h!=null&&h.matches("[a-f0-9]{64}"));byte[] out=new byte[32];for(int i=0;i<32;i++)out[i]=(byte)Integer.parseInt(h.substring(i*2,i*2+2),16);return out;}
  private static byte[] decode(String s,int max,int exact){require(s!=null&&!s.isEmpty()&&s.length()<=4L*((max+2L)/3));byte[] b=StrictP256.base64(s);require(b.length<=max&&(exact<0||b.length==exact));return b;}
  private static void id(String id){require(id!=null&&id.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}")&&!id.equals("00000000-0000-0000-0000-000000000000"));}
  private static void identity(String actor,String device){id(actor);require(device!=null&&device.matches("[a-zA-Z0-9_-]{1,80}"));}
  private static String q(String s){require(s!=null&&s.matches("[a-zA-Z0-9_+./=|:-]*"));return "\""+s+"\"";}
  private static byte[] randomNonce(){byte[] n=new byte[12];new SecureRandom().nextBytes(n);return n;}
  private static String b64(byte[] b){return Base64.getEncoder().encodeToString(b);}
  private static byte[] bytes(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private static String text(byte[] b){return new String(b,StandardCharsets.UTF_8);}
  private static byte[] join(byte[] a,byte[] b){byte[] out=Arrays.copyOf(a,a.length+b.length);System.arraycopy(b,0,out,a.length,b.length);return out;}
  private static void require(boolean condition){if(!condition)throw new IllegalArgumentException("invalid_handover_package");}
  private HandoverPackage(){}
}
