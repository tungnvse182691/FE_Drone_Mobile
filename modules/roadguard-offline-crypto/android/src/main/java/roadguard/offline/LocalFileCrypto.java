package roadguard.offline;

import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/** App-private file primitive. Callers must authorize paths, bind asset ownership,
 * keep the key native, and commit the SQLite reference only after success.
 * This format is local storage, never a BE handover/evidence wire format. */
public final class LocalFileCrypto {
  private static final boolean ANDROID="Dalvik".equals(System.getProperty("java.vm.name"));
  static { if(ANDROID)System.loadLibrary("roadguard_storage"); }
  private static native void publishAndroid(String parent,String source,String destination)throws IOException;
  private static final byte[] MAGIC={'R','G','L','O','C','A','L',1};
  private static final int HEADER=28, TAG=16, BUFFER=64*1024;
  private static final long MAX=1L<<40; // Bounded chunk count; no whole-file cipher buffering.

  public static String seal(Path source,Path destination,SecretKey key,String context)throws Exception {
    return transform(source,destination,key,context,true);
  }
  public static String open(Path source,Path destination,SecretKey key,String context)throws Exception {
    return transform(source,destination,key,context,false);
  }
  /** Authenticate only the requested chunks, with no plaintext file or whole-video allocation.
   * This is not a full-file checksum/VERIFIED receipt. Maximum bridge read is 1 MiB. */
  public static byte[] readRange(Path source,SecretKey key,String context,long offset,int length)throws Exception {
    if(key==null||!"AES".equals(key.getAlgorithm())||context==null||context.isEmpty()||context.length()>4096||
        offset<0||length<=0||length>1024*1024)throw new GeneralSecurityException("local_file_range_invalid");
    byte[] result=new byte[length],header=new byte[HEADER],buffer=new byte[BUFFER+TAG];
    boolean success=false;
    try(RandomAccessFile file=new RandomAccessFile(source.toRealPath().toFile(),"r")) {
      file.readFully(header);
      ByteBuffer h=ByteBuffer.wrap(header);byte[] magic=new byte[MAGIC.length];h.get(magic);h.position(MAGIC.length+12);
      long size=h.getLong(),expected=HEADER+size+(12+TAG)*Math.max(1,(size+BUFFER-1)/BUFFER);
      if(!MessageDigest.isEqual(magic,MAGIC)||size<0||size>MAX||file.length()!=expected||offset>size||length>size-offset)
        throw new GeneralSecurityException("local_file_range_invalid");
      long last=(offset+length-1)/BUFFER;int written=0;
      for(long index=offset/BUFFER;index<=last;index++) {
        int plainLength=(int)Math.min(BUFFER,size-index*BUFFER);
        file.seek(HEADER+index*(BUFFER+12L+TAG));
        byte[] nonce=new byte[12];file.readFully(nonce);file.readFully(buffer,0,plainLength+TAG);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,nonce));
        cipher.updateAAD(header);cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
        cipher.updateAAD(ByteBuffer.allocate(8).putLong(index).array());
        byte[] plain=cipher.doFinal(buffer,0,plainLength+TAG);
        try {
          if(plain.length!=plainLength)throw new GeneralSecurityException("local_file_range_invalid");
          int start=(int)Math.max(0,offset-index*BUFFER),count=Math.min(plainLength-start,length-written);
          System.arraycopy(plain,start,result,written,count);written+=count;
        } finally {Arrays.fill(plain,(byte)0);Arrays.fill(buffer,(byte)0);}
      }
      if(written!=length||file.length()!=expected)throw new IOException("local_file_changed");
      success=true;return result;
    } finally {Arrays.fill(buffer,(byte)0);if(!success)Arrays.fill(result,(byte)0);}
  }
  private static String transform(Path source,Path destination,SecretKey key,String context,boolean encrypt)throws Exception {
    if(key==null||!"AES".equals(key.getAlgorithm())||context==null||context.isEmpty()||context.length()>4096)
      throw new GeneralSecurityException("local_file_binding_invalid");
    Path input=source.toRealPath();
    Path parent=destination.toAbsolutePath().getParent().toRealPath();
    Path output=parent.resolve(destination.getFileName());
    if(Files.exists(output,LinkOption.NOFOLLOW_LINKS)||!Files.isRegularFile(input))throw new IOException("local_file_destination_invalid");
    long size=Files.size(input),plainSize;
    byte[] header=new byte[HEADER],nonce=new byte[12],buffer=new byte[BUFFER+TAG];
    Path temp=null;
    try(InputStream in=Files.newInputStream(input)) {
      if(encrypt){
        if(size>MAX)throw new IOException("local_file_size_invalid");
        plainSize=size;new SecureRandom().nextBytes(nonce);
        ByteBuffer.wrap(header).put(MAGIC).put(nonce).putLong(size);
      }else{
        if(size<HEADER+TAG)throw new IOException("local_file_truncated");
        new DataInputStream(in).readFully(header);
        ByteBuffer h=ByteBuffer.wrap(header);byte[] magic=new byte[MAGIC.length];h.get(magic);h.get(nonce);plainSize=h.getLong();
        if(!MessageDigest.isEqual(magic,MAGIC)||plainSize<0||plainSize>MAX||size!=HEADER+plainSize+(12+TAG)*Math.max(1,(plainSize+BUFFER-1)/BUFFER))
          throw new GeneralSecurityException("local_file_header_invalid");
      }
      MessageDigest digest=MessageDigest.getInstance("SHA-256");
      temp=Files.createTempFile(parent,".rg-crypto-",".tmp");
      try(FileOutputStream out=new FileOutputStream(temp.toFile())) {
        if(encrypt)out.write(header);
        long chunks=Math.max(1,(plainSize+BUFFER-1)/BUFFER),remaining=plainSize;
        DataInputStream reader=new DataInputStream(in);
        for(long index=0;index<chunks;index++){
          int count=(int)Math.min(BUFFER,remaining),inputLength=encrypt?count:count+TAG;
          byte[] chunkNonce=new byte[12];
          if(!encrypt)reader.readFully(chunkNonce);
          reader.readFully(buffer,0,inputLength);
          Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
          // Let Android Keystore generate encryption IVs; never relax randomized-encryption policy.
          if(encrypt){cipher.init(Cipher.ENCRYPT_MODE,key);chunkNonce=cipher.getIV();if(chunkNonce.length!=12)throw new GeneralSecurityException("local_file_nonce_invalid");out.write(chunkNonce);}
          else cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,chunkNonce));
          cipher.updateAAD(header);cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
          cipher.updateAAD(ByteBuffer.allocate(8).putLong(index).array());
          byte[] transformed=cipher.doFinal(buffer,0,inputLength);
          try{
            if(transformed.length!=(encrypt?count+TAG:count))throw new IOException("local_file_changed");
            out.write(transformed);if(encrypt)digest.update(buffer,0,count);else digest.update(transformed);
          }finally{Arrays.fill(transformed,(byte)0);Arrays.fill(buffer,(byte)0);}
          remaining-=count;
        }
        if(in.read()!=-1)throw new IOException("local_file_changed");
        out.getFD().sync();
      }
      // Android denies app hard links. Use kernel no-replace rename and fsync the
      // containing directory; no copy/overwrite fallback on unsupported devices.
      if(ANDROID)publishAndroid(parent.toString(),temp.getFileName().toString(),output.getFileName().toString());
      else Files.createLink(output,temp); // Isolated host protocol tests only.
      StringBuilder hash=new StringBuilder();for(byte b:digest.digest())hash.append(String.format(Locale.ROOT,"%02x",b&255));
      return hash.toString();
    }finally{
      Arrays.fill(buffer,(byte)0);
      // Only our unreferenced temporary inode is removed; originals are never deleted.
      if(temp!=null)Files.deleteIfExists(temp);
    }
  }
  private LocalFileCrypto(){}
}
