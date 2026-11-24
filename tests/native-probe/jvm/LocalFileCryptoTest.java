package roadguard.offline;
import java.nio.file.*;
import java.util.*;
import javax.crypto.*;
public final class LocalFileCryptoTest {
 interface Attempt {void run() throws Exception;}
 static void rejected(Attempt op)throws Exception {try{op.run();}catch(Exception expected){return;}throw new AssertionError("operation accepted");}
 static void check(boolean ok){if(!ok)throw new AssertionError("file invariant failed");}
 public static void main(String[] args)throws Exception {
  Path dir=Files.createTempDirectory("roadguard-file-qa-");
  KeyGenerator generator=KeyGenerator.getInstance("AES");generator.init(256);var key=generator.generateKey();
  Path source=dir.resolve("source"),sealed=dir.resolve("sealed"),opened=dir.resolve("opened");
  byte[] input=new byte[2*1024*1024+47];new java.security.SecureRandom().nextBytes(input);Files.write(source,input);
  String binding="account:environment:asset:version";
  String hash=LocalFileCrypto.seal(source,sealed,key,binding);
  check(hash.matches("[a-f0-9]{64}"));check(Arrays.equals(input,Files.readAllBytes(source)));
  check(!Arrays.equals(input,Files.readAllBytes(sealed)));
  check(hash.equals(LocalFileCrypto.open(sealed,opened,key,binding)));check(Arrays.equals(input,Files.readAllBytes(opened)));
  byte[] prior=Files.readAllBytes(opened);rejected(()->LocalFileCrypto.open(sealed,opened,key,binding));check(Arrays.equals(prior,Files.readAllBytes(opened)));
  Path bad=dir.resolve("bad");rejected(()->LocalFileCrypto.open(sealed,bad,key,"other-account"));check(!Files.exists(bad));
  rejected(()->LocalFileCrypto.open(sealed,bad,generator.generateKey(),binding));check(!Files.exists(bad));
  byte[] bytes=Files.readAllBytes(sealed);bytes[bytes.length-1]^=1;Files.write(dir.resolve("tampered"),bytes);
  rejected(()->LocalFileCrypto.open(dir.resolve("tampered"),bad,key,binding));check(!Files.exists(bad));
  Files.write(dir.resolve("short"),Arrays.copyOf(bytes,bytes.length-7));rejected(()->LocalFileCrypto.open(dir.resolve("short"),bad,key,binding));check(!Files.exists(bad));
  // Full chunks have identical lengths: index-bound AAD rejects reordering and duplication.
  byte[] valid=Files.readAllBytes(sealed),reordered=valid.clone();int start=28,chunk=65536+28;
  System.arraycopy(valid,start+chunk,reordered,start,chunk);System.arraycopy(valid,start,reordered,start+chunk,chunk);
  Files.write(dir.resolve("reordered"),reordered);rejected(()->LocalFileCrypto.open(dir.resolve("reordered"),bad,key,binding));check(!Files.exists(bad));
  byte[] duplicate=valid.clone();System.arraycopy(valid,start,duplicate,start+chunk,chunk);
  Files.write(dir.resolve("duplicate"),duplicate);rejected(()->LocalFileCrypto.open(dir.resolve("duplicate"),bad,key,binding));check(!Files.exists(bad));
  rejected(()->LocalFileCrypto.seal(source,source,key,binding));check(Arrays.equals(input,Files.readAllBytes(source)));
  Files.write(dir.resolve("empty"),new byte[0]);LocalFileCrypto.seal(dir.resolve("empty"),dir.resolve("empty-sealed"),key,binding);
  LocalFileCrypto.open(dir.resolve("empty-sealed"),dir.resolve("empty-opened"),key,binding);check(Files.size(dir.resolve("empty-opened"))==0);
  // An abandoned temp from a killed process is never a published asset or an input to recovery.
  Files.write(dir.resolve(".rg-crypto-interrupted.tmp"),new byte[]{1,2,3});
  LocalFileCrypto.open(sealed,dir.resolve("restart-opened"),key,binding);check(Arrays.equals(input,Files.readAllBytes(dir.resolve("restart-opened"))));
  System.out.println("PASS: content/context authentication, wrong key, tamper, truncation, collision, empty, restart");
 }
}
