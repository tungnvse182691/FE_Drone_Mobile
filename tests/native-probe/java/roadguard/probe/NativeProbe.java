package roadguard.probe;

import android.app.Instrumentation;
import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.os.Build;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.security.keystore.KeyInfo;
import java.io.File;
import java.io.FileInputStream;
import java.lang.reflect.*;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Isolated native diagnostics only. Does not read accounts, RoadGuard DB or pending data. */
public final class NativeProbe extends Instrumentation {
  private static final String PREFIX = "roadguard.qa.20261124.";
  private ClassLoader loader;
  private final CountDownLatch applicationReady = new CountDownLatch(1);
  @Override public void callApplicationOnCreate(Application application) {
    // Instrumentation.start runs on a separate thread. Native probes must wait
    // for the real Application (including React Native's loader) to initialize.
    super.callApplicationOnCreate(application);
    applicationReady.countDown();
  }
  @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
  @Override public void onStart() {
    Bundle result = new Bundle();
    try {
      require(applicationReady.await(30,TimeUnit.SECONDS),"application_initialization_timeout");
      loader = getTargetContext().getClassLoader();
      Class.forName("roadguard.offline.RoadguardOfflineCryptoModule", false, loader);
      result.putString("moduleClass", "PRESENT");
      KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
      for (String purpose : new String[]{"sign", "agree"}) {
        String alias = PREFIX + purpose;
        boolean existed = ks.containsAlias(alias);
        if (!existed) {
          KeyPairGenerator generator = KeyPairGenerator.getInstance("EC", "AndroidKeyStore");
          KeyGenParameterSpec.Builder spec = new KeyGenParameterSpec.Builder(alias,
            purpose.equals("sign") ? KeyProperties.PURPOSE_SIGN : KeyProperties.PURPOSE_AGREE_KEY)
            .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"));
          if (purpose.equals("sign")) spec.setDigests(KeyProperties.DIGEST_SHA256);
          generator.initialize(spec.build()); generator.generateKeyPair();
        }
        PrivateKey key = (PrivateKey)ks.getKey(alias, null);
        KeyInfo info = KeyFactory.getInstance("EC", "AndroidKeyStore").getKeySpec(key, KeyInfo.class);
        result.putString(purpose + "Level", Integer.toString(info.getSecurityLevel()));
        result.putString(purpose + "Existing", Boolean.toString(existed));
        require(key.getEncoded() == null, "private_key_exportable");
        if (purpose.equals("sign")) {
          Class<?> codec = Class.forName("roadguard.offline.StrictP256", true, loader);
          byte[] signature = (byte[])codec.getMethod("sign", PrivateKey.class, String.class).invoke(null, key, "isolated-native-probe");
          String publicKey = Base64.getEncoder().encodeToString(ks.getCertificate(alias).getPublicKey().getEncoded());
          require((Boolean)codec.getMethod("verify", String.class, String.class, String.class)
            .invoke(null, publicKey, "isolated-native-probe", Base64.getEncoder().encodeToString(signature)), "signature_invalid");
          result.putString("signature", "P1363_ROUNDTRIP_PASS");
          // Public test vector only, for independent .NET verification. No production identity.
          result.putString("probePublicKey", publicKey);
          result.putString("probeSignature", Base64.getEncoder().encodeToString(signature));
        } else {
          KeyPairGenerator ephemeralGenerator = KeyPairGenerator.getInstance("EC");
          ephemeralGenerator.initialize(new ECGenParameterSpec("secp256r1"));
          KeyPair ephemeral = ephemeralGenerator.generateKeyPair();
          KeyAgreement nativeAgreement = KeyAgreement.getInstance("ECDH");
          nativeAgreement.init(key); nativeAgreement.doPhase(ephemeral.getPublic(), true);
          byte[] a = nativeAgreement.generateSecret();
          KeyAgreement peer = KeyAgreement.getInstance("ECDH"); peer.init(ephemeral.getPrivate());
          peer.doPhase(ks.getCertificate(alias).getPublicKey(), true); byte[] b = peer.generateSecret();
          require(MessageDigest.isEqual(a,b), "agreement_mismatch");
          Arrays.fill(a,(byte)0); Arrays.fill(b,(byte)0);
          result.putString("agreement", "NATIVE_RAW_ECDH_PASS");
        }
      }
      handoverProbe(ks,result);
      sqlCipherProbe(ks,result);
      localFileProbe(ks,result);
      mediaVaultProbe(result);
      result.putString("status", "PASS"); finish(Activity.RESULT_OK,result);
    } catch (Throwable t) {
      while (t instanceof InvocationTargetException && t.getCause()!=null) t=t.getCause();
      // No payload/key/credentials in diagnostic output.
      result.putString("status", "FAIL"); result.putString("exception",t.getClass().getName());
      int depth=0;
      for(Throwable cause=t;cause!=null&&depth<6;cause=cause.getCause(),depth++) {
        result.putString("cause"+depth,cause.getClass().getName()+": "+String.valueOf(cause.getMessage()));
      }
      result.putString("stage", stage); finish(Activity.RESULT_CANCELED,result);
    }
  }
  private String stage="keystore";
  private void mediaVaultProbe(Bundle result)throws Exception {
    stage="media_vault";
    Context context=getTargetContext();
    Class<?> vaultClass=Class.forName("roadguard.offline.LocalMediaVault",true,loader);
    Object vault=vaultClass.getConstructor(Context.class).newInstance(context);
    Method prepare=vaultClass.getMethod("createKey",String.class);
    Method seal=vaultClass.getMethod("seal",String.class,String.class,String.class);
    Method read=vaultClass.getMethod("readRange",String.class,String.class,long.class,int.class);
    byte[] data=new byte[131111];for(int i=0;i<data.length;i++)data[i]=(byte)(i%251);
    File directory=new File(context.getFilesDir(),"qa-media-vault-20261125");
    require(directory.mkdirs()||directory.isDirectory(),"vault_probe_directory");
    File source=new File(directory,"source-v1");
    if(!source.exists())java.nio.file.Files.write(source.toPath(),data);
    SharedPreferences fixtures=context.getSharedPreferences("roadguard.qa.media-vault.20261125",0);
    boolean reopened=true;
    for(String role:new String[]{"REPAIR_CREW","DRONE_OPERATOR","REPORTER"}) {
      String binding="[\"91919191-9191-4191-8191-919191919191\",\"http://qa.invalid/api/v1\",\""+role+"\"]";
      Map<?,?> capability=(Map<?,?>)prepare.invoke(vault,binding);
      require(Boolean.TRUE.equals(capability.get("available")),"vault_key_unavailable");
      result.putString("mediaVault."+role+".level",String.valueOf(capability.get("securityLevel")));
      String asset=fixtures.getString(role,null);
      if(asset==null) {
        reopened=false;asset=UUID.randomUUID().toString();
        Map<?,?> saved=(Map<?,?>)seal.invoke(vault,binding,asset,source.toURI().toString());
        require(((Number)saved.get("sizeBytes")).longValue()==data.length,"vault_size_changed");
        require(fixtures.edit().putString(role,asset).commit(),"vault_fixture_persistence");
      }
      byte[] opened=Base64.getDecoder().decode((String)read.invoke(vault,binding,asset,65530L,65550));
      require(MessageDigest.isEqual(Arrays.copyOfRange(data,65530,131080),opened),"vault_range_changed");
      require(MessageDigest.isEqual(data,java.nio.file.Files.readAllBytes(source.toPath())),"vault_original_changed");
      boolean collision=false;try {seal.invoke(vault,binding,asset,source.toURI().toString());}catch(InvocationTargetException expected){collision=true;}
      require(collision,"vault_destination_overwritten");
      for(String uri:new String[]{new File(context.getFilesDir(),"SQLite/roadguard.db").toURI().toString(),"file:///etc/hosts","content://qa.invalid/asset"}) {
        boolean refused=false;try {seal.invoke(vault,binding,UUID.randomUUID().toString(),uri);}catch(InvocationTargetException expected){refused=true;}
        require(refused,"vault_forbidden_source_accepted");
      }
      boolean refused=false;try {read.invoke(vault,binding,asset,-1L,1);}catch(InvocationTargetException expected){refused=true;}
      require(refused,"vault_invalid_range_accepted");
        String otherRole=role.equals("REPORTER")?"REPAIR_CREW":"REPORTER";
        String otherBinding=binding.replace(role,otherRole);
        prepare.invoke(vault,otherBinding);
        refused=false;try {read.invoke(vault,otherBinding,asset,0L,1);}catch(InvocationTargetException expected){refused=true;}
        require(refused,"vault_cross_role_read_accepted");
        String otherActor=binding.replace("91919191-9191-4191-8191-919191919191","92929292-9292-4292-8292-929292929292");
        prepare.invoke(vault,otherActor);
        refused=false;try {read.invoke(vault,otherActor,asset,0L,1);}catch(InvocationTargetException expected){refused=true;}
        require(refused,"vault_cross_actor_read_accepted");
        java.nio.file.Path link=new File(directory,"link-"+UUID.randomUUID()).toPath();
        java.nio.file.Files.createSymbolicLink(link,source.toPath());
        refused=false;try {seal.invoke(vault,binding,UUID.randomUUID().toString(),link.toUri().toString());}catch(InvocationTargetException expected){refused=true;}
        require(refused,"vault_symlink_source_accepted");
    }
    result.putString("mediaVault",reopened?"THREE_ROLE_RESTART_RANGE_PRESERVATION_PASS":"THREE_ROLE_SEAL_RANGE_PRESERVATION_PASS");
  }
  private void localFileProbe(KeyStore ks,Bundle result)throws Exception {
    stage="local_file_crypto";
    File dir=new File(getTargetContext().getFilesDir(),"qa-native-probe-20261124");require(dir.mkdirs()||dir.isDirectory(),"probe_directory");
    java.nio.file.Path source=new File(dir,"file-source-chunked-v1").toPath();
    java.nio.file.Path sealed=new File(dir,"file-sealed-"+UUID.randomUUID()).toPath();
    java.nio.file.Path opened=new File(dir,"file-opened-"+UUID.randomUUID()).toPath();
    byte[] data=new byte[2*1024*1024+47];for(int i=0;i<data.length;i++)data[i]=(byte)(i%251);
    if(!java.nio.file.Files.exists(source))java.nio.file.Files.write(source,data);
    Class<?> file=Class.forName("roadguard.offline.LocalFileCrypto",true,loader);
    SecretKey key=(SecretKey)ks.getKey(PREFIX+"storage",null);
    Class<?>[] types={java.nio.file.Path.class,java.nio.file.Path.class,SecretKey.class,String.class};
    String binding="qa-account:qa-environment:qa-asset:1";
    Object hash=file.getMethod("seal",types).invoke(null,source,sealed,key,binding);
    Object actual=file.getMethod("open",types).invoke(null,sealed,opened,key,binding);
    require(hash.equals(actual)&&MessageDigest.isEqual(data,java.nio.file.Files.readAllBytes(opened)),"native_file_roundtrip");
    require(MessageDigest.isEqual(data,java.nio.file.Files.readAllBytes(source)),"native_file_original_changed");
    java.nio.file.Path rejected=new File(dir,"file-rejected-"+UUID.randomUUID()).toPath();
    boolean refused=false;try{file.getMethod("open",types).invoke(null,sealed,rejected,key,"other-account");}catch(InvocationTargetException expected){refused=true;}
    require(refused&&!java.nio.file.Files.exists(rejected),"native_file_binding_accepted");
    // Exercise the actual kernel NOREPLACE branch, not only Java's early existence check.
    java.nio.file.Path collisionSource=new File(dir,"publication-source-"+UUID.randomUUID()).toPath();
    java.nio.file.Path collisionTarget=new File(dir,"publication-target-"+UUID.randomUUID()).toPath();
    java.nio.file.Files.write(collisionSource,new byte[]{1});java.nio.file.Files.write(collisionTarget,new byte[]{2});
    Method publish=file.getDeclaredMethod("publishAndroid",String.class,String.class,String.class);publish.setAccessible(true);
    boolean collision=false;try{publish.invoke(null,dir.getCanonicalPath(),collisionSource.getFileName().toString(),collisionTarget.getFileName().toString());}catch(InvocationTargetException expected){collision=true;}
    require(collision&&java.nio.file.Files.readAllBytes(collisionSource)[0]==1&&java.nio.file.Files.readAllBytes(collisionTarget)[0]==2,"native_publication_clobbered");
    result.putString("localFile","KEYSTORE_FILE_ROUNDTRIP_AND_WRONG_CONTEXT_PASS");
  }
  private void handoverProbe(KeyStore ks,Bundle result)throws Exception {
    stage="handover_native";
    Class<?> pkg=Class.forName("roadguard.offline.HandoverPackage",true,loader);
    Class<?> header=Class.forName("roadguard.offline.HandoverPackage$Header",true,loader);
    Class<?> recipient=Class.forName("roadguard.offline.HandoverPackage$Recipient",true,loader);
    Class<?> envelope=Class.forName("roadguard.offline.HandoverPackage$Envelope",true,loader);
    String actor="11111111-1111-4111-8111-111111111111",device="native-probe";
    byte[] plain="isolated native handover probe".getBytes(java.nio.charset.StandardCharsets.UTF_8);
    String hash=(String)pkg.getMethod("hash",byte[].class).invoke(null,plain);
    Object h=header.getConstructor(int.class,String.class,String.class,String.class,String.class,String.class,String[].class,String.class)
      .newInstance(1,"huy-final.offline.bundle.v1","33333333-3333-4333-8333-333333333333","44444444-4444-4444-8444-444444444444",actor,device,new String[]{"55555555-5555-4555-8555-555555555555"},hash);
    String sign=Base64.getEncoder().encodeToString(ks.getCertificate(PREFIX+"sign").getPublicKey().getEncoded());
    String agree=Base64.getEncoder().encodeToString(ks.getCertificate(PREFIX+"agree").getPublicKey().getEncoded());
    Object r=recipient.getConstructor(String.class,String.class,String.class,String.class).newInstance(actor,device,agree,sign);
    Object receivers=Array.newInstance(recipient,1);Array.set(receivers,0,r);
    Object sealed=pkg.getMethod("seal",header,byte[].class,PrivateKey.class,String.class,String.class,String.class,receivers.getClass())
      .invoke(null,h,plain,(PrivateKey)ks.getKey(PREFIX+"sign",null),sign,actor,device,receivers);
    byte[] opened=(byte[])pkg.getMethod("open",envelope,PrivateKey.class,String.class,String.class,String.class,String.class)
      .invoke(null,sealed,(PrivateKey)ks.getKey(PREFIX+"agree",null),agree,actor,device,sign);
    require(MessageDigest.isEqual(plain,opened),"native_handover_mismatch");
    stage="handover_json_codec";
    Class<?> codec=Class.forName("roadguard.offline.HandoverPackageJson",true,loader);
    String headerJson=new String((byte[])pkg.getMethod("canonicalHeader",header).invoke(null,h),java.nio.charset.StandardCharsets.UTF_8);
    org.json.JSONObject request=new org.json.JSONObject();
    request.put("header",new org.json.JSONObject(headerJson));
    request.put("payloadBase64",Base64.getEncoder().encodeToString(plain));
    org.json.JSONObject receiver=new org.json.JSONObject();
    receiver.put("actorId",actor);receiver.put("deviceId",device);receiver.put("encryptionPublicKey",agree);receiver.put("signingPublicKey",sign);
    request.put("recipients",new org.json.JSONArray().put(receiver));
    Method encode=codec.getMethod("seal",String.class,PrivateKey.class,String.class,String.class,String.class);
    Method decode=codec.getMethod("open",String.class,PrivateKey.class,String.class,String.class,String.class,String.class);
    PrivateKey signingKey=(PrivateKey)ks.getKey(PREFIX+"sign",null),agreementKey=(PrivateKey)ks.getKey(PREFIX+"agree",null);
    String encoded=(String)encode.invoke(null,request.toString(),signingKey,sign,actor,device);
    String decoded=(String)decode.invoke(null,encoded,agreementKey,agree,actor,device,sign);
    require(MessageDigest.isEqual(plain,Base64.getDecoder().decode(decoded)),"native_codec_roundtrip");
    rejects(decode,encoded,agreementKey,agree,actor,device,agree);
    rejects(decode,encoded,agreementKey,agree,actor,"wrong-device",sign);
    org.json.JSONObject tampered=new org.json.JSONObject(encoded);
    tampered.put("ciphertext",Base64.getEncoder().encodeToString(new byte[plain.length]));
    rejects(decode,tampered.toString(),agreementKey,agree,actor,device,sign);
    org.json.JSONObject changedHeader=new org.json.JSONObject(encoded);
    changedHeader.getJSONObject("header").put("projectId","66666666-6666-4666-8666-666666666666");
    rejects(decode,changedHeader.toString(),agreementKey,agree,actor,device,sign);
    rejects(decode,"{\"header\":"+headerJson+","+encoded.substring(1),agreementKey,agree,actor,device,sign);
    rejects(decode,encoded+" {}",agreementKey,agree,actor,device,sign);
    rejects(decode,new org.json.JSONObject(encoded).put("unknown","field").toString(),agreementKey,agree,actor,device,sign);
    rejects(encode,request.toString()+" {}",signingKey,sign,actor,device);
    rejects(encode,new org.json.JSONObject(request.toString()).put("unknown","field").toString(),signingKey,sign,actor,device);
    result.putString("handoverCodec","STRICT_JSON_ROUNDTRIP_TAMPER_TRUST_RECIPIENT_PASS");
    Arrays.fill(opened,(byte)0);Arrays.fill(plain,(byte)0);
    result.putString("handover","KEYSTORE_SEAL_OPEN_PASS_NOT_BUSINESS_AUTHORITY");
  }
  private static void rejects(Method method,Object... args)throws Exception {
    boolean rejected=false;
    try {method.invoke(null,args);}catch(InvocationTargetException expected){
      require(expected.getCause() instanceof IllegalArgumentException,"unexpected_codec_exception");rejected=true;
    }
    require(rejected,"invalid_codec_input_accepted");
  }
  private void sqlCipherProbe(KeyStore ks, Bundle result) throws Exception {
    stage="cipher_key";
    String alias=PREFIX+"storage";
    if(!ks.containsAlias(alias)) {
      KeyGenerator g=KeyGenerator.getInstance("AES","AndroidKeyStore");
      g.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
        .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();
    }
    SharedPreferences p=getTargetContext().getSharedPreferences(PREFIX+"probe",Context.MODE_PRIVATE);
    byte[] raw;
    if(p.contains("wrapped")) {
      Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,ks.getKey(alias,null),new GCMParameterSpec(128,Base64.getDecoder().decode(p.getString("iv",""))));
      raw=c.doFinal(Base64.getDecoder().decode(p.getString("wrapped","")));
    } else {
      raw=new byte[32];new SecureRandom().nextBytes(raw);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,ks.getKey(alias,null));
      require(p.edit().putString("wrapped",Base64.getEncoder().encodeToString(c.doFinal(raw))).putString("iv",Base64.getEncoder().encodeToString(c.getIV())).commit(),"probe_persistence");
    }
    File dir=new File(getTargetContext().getFilesDir(),"qa-native-probe-20261124");require(dir.isDirectory()||dir.mkdir(),"probe_directory");
    File file=new File(dir,"cipher-probe.db");Object db=null;
    try {
      stage="cipher_open"; db=open(file);exec(db,"PRAGMA key = \"x'"+hex(raw)+"'\"");
      String version=query(db,"PRAGMA cipher_version");require(version!=null&&!version.isEmpty(),"cipher_unavailable");result.putString("cipherVersion",version);
      exec(db,"CREATE TABLE IF NOT EXISTS probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
      exec(db,"INSERT OR IGNORE INTO probe VALUES(1,'pending_probe_only')");
      require("pending_probe_only".equals(query(db,"SELECT value FROM probe WHERE id=1")),"cipher_content");close(db);db=null;
      stage="cipher_header";byte[] header=new byte[16];try(FileInputStream in=new FileInputStream(file)){require(in.read(header)==16,"cipher_header_length");}
      require(!new String(header,java.nio.charset.StandardCharsets.US_ASCII).startsWith("SQLite format 3"),"plaintext_header");
      stage="cipher_wrong_key";Object wrong=open(file);boolean denied=false;
      try {exec(wrong,"PRAGMA key = 'wrong-probe-key'");query(wrong,"SELECT value FROM probe");}catch(Exception expected){denied=true;}finally{close(wrong);}
      require(denied,"wrong_key_accepted");
      stage="cipher_reopen";db=open(file);exec(db,"PRAGMA key = \"x'"+hex(raw)+"'\"");
      require("pending_probe_only".equals(query(db,"SELECT value FROM probe WHERE id=1")),"cipher_reopen_content");
      result.putString("cipher", "ENCRYPTED_WRONG_KEY_REJECTED_REOPEN_PASS");
    } finally {Arrays.fill(raw,(byte)0);if(db!=null)close(db);}
  }
  private Object open(File file)throws Exception {Class<?> c=Class.forName("expo.modules.sqlite.NativeDatabaseBinding",true,loader);Constructor<?> ctr=c.getDeclaredConstructor();ctr.setAccessible(true);Object db=ctr.newInstance();require((Integer)call(db,"sqlite3_open",new Class[]{String.class},file.getAbsolutePath())==0,"sqlite_open");return db;}
  private void close(Object db)throws Exception{call(db,"sqlite3_close",new Class[0]);call(db,"close",new Class[0]);}
  private void exec(Object db,String sql)throws Exception{require((Integer)call(db,"sqlite3_exec",new Class[]{String.class},sql)==0,"sqlite_exec");}
  private String query(Object db,String sql)throws Exception {
    Class<?> c=Class.forName("expo.modules.sqlite.NativeStatementBinding",true,loader);Constructor<?> ctr=c.getDeclaredConstructor();ctr.setAccessible(true);Object s=ctr.newInstance();
    try {require((Integer)call(db,"sqlite3_prepare_v2",new Class[]{String.class,c},sql,s)==0,"sqlite_prepare");
      require((Integer)call(s,"sqlite3_step",new Class[0])==100,"sqlite_row");return String.valueOf(((List<?>)call(s,"getColumnValues",new Class[0])).get(0));
    }finally{call(s,"sqlite3_finalize",new Class[0]);call(s,"close",new Class[0]);}
  }
  private static Object call(Object target,String method,Class<?>[] args,Object... values)throws Exception{Method m=target.getClass().getDeclaredMethod(method,args);m.setAccessible(true);return m.invoke(target,values);}
  private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(Locale.ROOT,"%02x",v&255));return s.toString();}
  private static void require(boolean ok,String code){if(!ok)throw new IllegalStateException(code);}
}
