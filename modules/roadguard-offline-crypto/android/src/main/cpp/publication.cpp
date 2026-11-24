#include <jni.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <cerrno>
#include <cstring>

// No replace, no copy fallback. Unsupported kernel/filesystem fails closed.
// Parent is an app-private directory resolved by the Java caller.
extern "C" JNIEXPORT void JNICALL
Java_roadguard_offline_LocalFileCrypto_publishAndroid(JNIEnv* env, jclass,
    jstring parent, jstring source, jstring destination) {
  const char* p = env->GetStringUTFChars(parent, nullptr);
  if (!p) return;
  int fd = open(p, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
  env->ReleaseStringUTFChars(parent, p);
  if (fd < 0) { env->ThrowNew(env->FindClass("java/io/IOException"), "local_file_directory_unavailable"); return; }
  const char* s = env->GetStringUTFChars(source, nullptr);
  if (!s) { close(fd); return; }
  const char* d = env->GetStringUTFChars(destination, nullptr);
  if (!d) { env->ReleaseStringUTFChars(source,s); close(fd); return; }
  bool names = s[0] && d[0] && !strchr(s,'/') && !strchr(d,'/') &&
    strcmp(s,".") && strcmp(s,"..") && strcmp(d,".") && strcmp(d,"..");
  int result = names ? syscall(__NR_renameat2, fd, s, fd, d, 1 /* RENAME_NOREPLACE */) : -1;
  // A sync error leaves an unreferenced orphan, never an acknowledged media asset.
  if (result == 0) { do { result = fsync(fd); } while (result < 0 && errno == EINTR); }
  env->ReleaseStringUTFChars(source,s); env->ReleaseStringUTFChars(destination,d); close(fd);
  if (result != 0) env->ThrowNew(env->FindClass("java/io/IOException"), "local_file_publication_unconfirmed");
}
