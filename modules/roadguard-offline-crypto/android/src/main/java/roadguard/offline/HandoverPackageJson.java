package roadguard.offline;

import android.util.JsonReader;
import android.util.JsonToken;
import java.io.StringReader;
import java.security.PrivateKey;
import java.util.*;
import org.json.*;

/** Narrow bridge codec; untrusted packages never select their own trusted signer. */
public final class HandoverPackageJson {
  private static JSONObject parse(String text)throws Exception {
    if(text==null||text.length()>24*1024*1024)throw new IllegalArgumentException();
    try(JsonReader r=new JsonReader(new StringReader(text))) {
      r.setLenient(false);Object result=value(r,0);
      if(!(result instanceof JSONObject)||r.peek()!=JsonToken.END_DOCUMENT)throw new IllegalArgumentException();
      return (JSONObject)result;
    }
  }
  private static Object value(JsonReader r,int depth)throws Exception {
    if(depth>8)throw new IllegalArgumentException();
    switch(r.peek()) {
      case BEGIN_OBJECT: {
        JSONObject o=new JSONObject();Set<String> names=new HashSet<>();r.beginObject();
        while(r.hasNext()){String name=r.nextName();if(!names.add(name))throw new IllegalArgumentException();o.put(name,value(r,depth+1));}r.endObject();return o;
      }
      case BEGIN_ARRAY: {
        JSONArray a=new JSONArray();r.beginArray();while(r.hasNext()){if(a.length()>=1000)throw new IllegalArgumentException();a.put(value(r,depth+1));}r.endArray();return a;
      }
      case STRING:return r.nextString();
      case NUMBER: {String n=r.nextString();if(!n.equals("1"))throw new IllegalArgumentException();return 1;}
      default:throw new IllegalArgumentException();
    }
  }
  private static void fields(JSONObject o,String... keys)throws Exception {
    Set<String> actual=new HashSet<>();Iterator<String> names=o.keys();while(names.hasNext())actual.add(names.next());
    if(!actual.equals(new HashSet<>(Arrays.asList(keys))))throw new IllegalArgumentException();
  }
  private static String str(JSONObject o,String key)throws Exception {
    Object v=o.get(key);if(!(v instanceof String))throw new IllegalArgumentException();return (String)v;
  }
  private static String[] strings(JSONArray a)throws Exception {
    String[] out=new String[a.length()];for(int i=0;i<out.length;i++){Object v=a.get(i);if(!(v instanceof String))throw new IllegalArgumentException();out[i]=(String)v;}return out;
  }
  private static HandoverPackage.Header header(JSONObject h)throws Exception {
    fields(h,"version","payloadSchema","packageId","projectId","originalActorId","sourceDeviceId","originIds","payloadSha256");
    if(!(h.get("version") instanceof Integer)||h.getInt("version")!=1)throw new IllegalArgumentException();
    return new HandoverPackage.Header(1,str(h,"payloadSchema"),str(h,"packageId"),str(h,"projectId"),str(h,"originalActorId"),str(h,"sourceDeviceId"),strings(h.getJSONArray("originIds")),str(h,"payloadSha256"));
  }
  public static String seal(String request,PrivateKey signingKey,String signingPublic,String actor,String device)throws Exception {
    byte[] payload=null;
    try {
      JSONObject o=parse(request);fields(o,"header","payloadBase64","recipients");
      String encoded=str(o,"payloadBase64");if(encoded.length()>4*((16*1024*1024+2)/3))throw new IllegalArgumentException();
      payload=StrictP256.base64(encoded);JSONArray list=o.getJSONArray("recipients");
      if(list.length()<1||list.length()>32)throw new IllegalArgumentException();
      HandoverPackage.Recipient[] recipients=new HandoverPackage.Recipient[list.length()];
      for(int i=0;i<recipients.length;i++) {
        JSONObject r=list.getJSONObject(i);fields(r,"actorId","deviceId","encryptionPublicKey","signingPublicKey");
        recipients[i]=new HandoverPackage.Recipient(str(r,"actorId"),str(r,"deviceId"),str(r,"encryptionPublicKey"),str(r,"signingPublicKey"));
      }
      return HandoverPackage.json(HandoverPackage.seal(header(o.getJSONObject("header")),payload,signingKey,signingPublic,actor,device,recipients));
    }catch(Exception e){throw new IllegalArgumentException("invalid_handover_package");}
    finally{if(payload!=null)Arrays.fill(payload,(byte)0);}
  }
  public static String open(String envelope,PrivateKey agreementKey,String agreementPublic,String actor,String device,String trustedSender)throws Exception {
    byte[] plaintext=null;
    try {
      JSONObject o=parse(envelope);fields(o,"header","payloadNonce","ciphertext","payloadTag","recipients","senderSigningPublicKey","signature");
      JSONArray list=o.getJSONArray("recipients");if(list.length()<1||list.length()>32)throw new IllegalArgumentException();
      HandoverPackage.Wrap[] wraps=new HandoverPackage.Wrap[list.length()];
      for(int i=0;i<wraps.length;i++) {
        JSONObject w=list.getJSONObject(i);fields(w,"actorId","deviceId","recipientKeyFingerprint","ephemeralPublicKey","nonce","wrappedKey","tag");
        wraps[i]=new HandoverPackage.Wrap(str(w,"actorId"),str(w,"deviceId"),str(w,"recipientKeyFingerprint"),str(w,"ephemeralPublicKey"),str(w,"nonce"),str(w,"wrappedKey"),str(w,"tag"));
      }
      HandoverPackage.Envelope p=new HandoverPackage.Envelope(header(o.getJSONObject("header")),str(o,"payloadNonce"),str(o,"ciphertext"),str(o,"payloadTag"),wraps,str(o,"senderSigningPublicKey"),str(o,"signature"));
      plaintext=HandoverPackage.open(p,agreementKey,agreementPublic,actor,device,trustedSender);
      return Base64.getEncoder().encodeToString(plaintext);
    }catch(Exception e){throw new IllegalArgumentException("invalid_handover_package");}
    finally{if(plaintext!=null)Arrays.fill(plaintext,(byte)0);}
  }
  private HandoverPackageJson(){}
}
