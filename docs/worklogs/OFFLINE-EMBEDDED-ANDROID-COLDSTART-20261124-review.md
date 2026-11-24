# Embedded Android QA / cold-start checkpoint

Reviewer: Codex. Mode: IMPLEMENT_AND_SELF_REVIEW. Date: 2026-11-24.
Source parent: `f86afa64c10034fd5e4eb7aabcdd16964227a230` on main.
Scope: test-only Windows build and optional loopback network overlay; no app UI,
auth, queue, storage migration, BE, Web, Docker or SQL source changed here.

## Build

Windows release CMake initially failed on Ninja path length in Reanimated;
short staging is now scoped to Reanimated/Worklets in the optional init script.
R8 subsequently exhausted configured 512 MiB Metaspace. QA command disables
minify/resource shrinking by quoted command-line arguments, without modifying
generated Gradle properties. This debug-signed build is not release acceptance.

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-24'
$env:ANDROID_HOME='D:/Android/Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_TOOL_OPTIONS='--enable-native-access=ALL-UNNAMED'
./android/gradlew.bat -p android -I D:/Do_AN_Drone/FE_AppMobile/tests/native-probe/windows-build.gradle '-Droadguard.native.cxxRoot=D:/rg-cxx-20261124' '-Droadguard.native.loopbackQa=true' :app:assembleRelease -PreactNativeArchitectures=x86_64 '-Pandroid.enableMinifyInReleaseBuilds=false' '-Pandroid.enableShrinkResourcesInReleaseBuilds=false' --no-parallel --max-workers=2 --console=plain
```

Result: BUILD SUCCESSFUL in 1m40s; 952 tasks, 53 executed. Log:
`.cache/offline-embedded-loopback-build.log`.
APK: `android/app/build/outputs/apk/release/app-release.apk`.
SHA256: `A3059D9BF7F5F9440CB4079D9763F081E95574A931800FDB65C9FDDDEC4D524B`.

The earlier embedded APK without the overlay started React but failed session
restore online. Its release manifest had no cleartext exception; the bundle uses
HTTP loopback to Docker. The optional test overlay allows cleartext only to
127.0.0.1/localhost without subdomains, denies all other cleartext destinations,
and is absent unless `roadguard.native.loopbackQa=true`. Android network security
reference: https://developer.android.com/privacy-and-security/security-config.
Default release configuration stays unchanged. Online session restore succeeded
after installing the overlay build. No credentials were re-entered.

## Executed Android scenario (limited scope)

Device: emulator-5554, Android14/API34, x86_64, 1440x3120.
Package: com.hoanghai.roadguard; installed with `adb install -r`, Success.
Matching debug signing certificate was checked before the first release install.
Expo Go app/data was not cleared, uninstalled or migrated. Emulator was not restarted.

1. Native process15365 opened Crew Home online, same synthetic Crew account.
   Loaded counts46 incomplete /4 complete. JavaScript is embedded in APK.
2. Recorded wifi_on=1, mobile_data=1 and reverses8081/18181/19101.
3. Disabled wifi/mobile data; removed API18181 and MinIO19101 reverses.
   Kept Metro8081 reverse; the installed release does not fetch JS from Metro.
4. Force-stopped/relaunched **native app process only**, new PID15642.
5. After22 seconds and a subsequent hierarchy read, native UI displayed
   "Chưa kết nối được phiên đăng nhập" with explicit retry. No Crew local view.
6. Restored exact radio states and API/MinIO reverses in finally; verified all.
7. Tapped "Thử lại". Crew Home returned with same account and46/4 counts.
   No login or data clear was needed.

Current-process log checks for15365/15642: ReactNativeJS Running main;
no matching FATAL EXCEPTION/AndroidRuntime uncaught error found. SQLAction emitted
an ExpoModulesV2 enum/R8 warning; optimization is disabled in this QA APK. This
does not establish optimized-release safety. Historical Expo Go errors from
another PID were excluded from the native-app result.

Result: embedded native startup/reconnect/session preservation verified in this
single Crew scenario. **Crew offline cold-start usability FAIL / incomplete FE**:
the app blocks at refresh restoration; this is not evidence of data loss.
No pending submission, upload, duplicate effect, per-item receipt, Operator or
Reporter scenario was exercised. Those remain NOT_RUN, not Android E2E PASS.

## Verification and limits

- `npx tsc --noEmit`: exit0, `.cache/offline-embedded-typecheck.log`.
- `node --test --test-concurrency=2 tests/*.test.cjs`: 2088/2088 PASS,
  fail0/skip0, `.cache/offline-embedded-full.log`, before build-only overlay edits.
- Actual Android build/install/online/offline/reconnect executed above.
- `git diff --check`: exit0.
- `git fetch origin main`: origin/main...HEAD =0 remote-only /4 local-only
  before this checkpoint; main unchanged.

The six requested workstreams are not complete. Runtime DB/media encryption,
legacy recovery, business callers, fixture HTTP mutations and hardware custody
remain separate open gates. See OFFLINE-SIX-WORKSTREAMS-STATUS-20261124.md.
