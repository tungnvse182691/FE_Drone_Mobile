package roadguard.probe;

import android.app.Activity;
import android.app.Instrumentation;
import android.os.Bundle;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;

/** Test APK only. Fixed-path, read-only file metadata; never opens DB rows or keys. */
public final class StorageInspection extends Instrumentation {
  @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
  @Override public void onStart() {
    Bundle result = new Bundle();
    try {
      File directory = new File(getTargetContext().getFilesDir(), "SQLite");
      for (String name : new String[]{"roadguard.db", "roadguard.db-wal", "roadguard.db-shm",
          "roadguard.encrypted.v1.db", "roadguard.encrypted.v1.db-wal"}) {
        File file = new File(directory, name);
        result.putBoolean(name + ".exists", file.isFile());
        if (!file.isFile()) continue;
        result.putLong(name + ".bytes", file.length());
        MessageDigest hash = MessageDigest.getInstance("SHA-256");
        byte[] prefix = new byte[16];
        try (FileInputStream input = new FileInputStream(file)) {
          int n = input.read(prefix);
          if (n > 0) hash.update(prefix, 0, n);
          result.putBoolean(name + ".sqliteHeader", n == 16 && Arrays.equals(prefix,
              "SQLite format 3\0".getBytes(StandardCharsets.US_ASCII)));
          byte[] block = new byte[65536];
          while ((n = input.read(block)) != -1) hash.update(block, 0, n);
        }
        StringBuilder hex = new StringBuilder();
        for (byte b : hash.digest()) hex.append(String.format("%02x", b & 255));
        result.putString(name + ".sha256", hex.toString());
      }
      result.putString("status", "PASS"); finish(Activity.RESULT_OK, result);
    } catch (Throwable failure) {
      result.putString("status", "FAIL");
      result.putString("exception", failure.getClass().getName());
      finish(Activity.RESULT_CANCELED, result);
    }
  }
}
