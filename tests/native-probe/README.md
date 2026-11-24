# Isolated Android / protocol foundation probes

These probes do not enroll devices, grant workflow authority, read account storage or replay pending commands. Production native acceptance remains disabled. Run only on an explicitly authorized test device.

## Android

Generate the approved dev-client project without `--clean`, then build the app and test APK. On Windows, pass **absolute** init script paths:

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-24'
$env:ANDROID_HOME='D:/Android/Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_TOOL_OPTIONS='--enable-native-access=ALL-UNNAMED'
./android/gradlew.bat -p android -I D:/Do_AN_Drone/FE_AppMobile/tests/native-probe/windows-build.gradle -I D:/Do_AN_Drone/FE_AppMobile/tests/native-probe/probe.gradle '-Droadguard.native.cxxRoot=D:/rg-cxx-20261124' :app:assembleDebug :app:assembleDebugAndroidTest -PreactNativeArchitectures=x86_64 --no-parallel --max-workers=2 --console=plain
D:/Android/Sdk/platform-tools/adb.exe -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
D:/Android/Sdk/platform-tools/adb.exe -s emulator-5554 install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
D:/Android/Sdk/platform-tools/adb.exe -s emulator-5554 shell am instrument -w com.hoanghai.roadguard.test/roadguard.probe.NativeProbe
```

Instrumentation starts a new app process. It preserves app data. It waits for the real Application initialization before accessing SQLCipher; otherwise RN's NativeLoader can race on the instrumentation thread. Test aliases use `roadguard.qa.20261124.*`, preferences use `roadguard.qa.20261124.probe`, and files use `qa-native-probe-20261124/`. Do not reuse these identities in runtime callers.

The probe checks non-exportable Android Keystore signing/agreement keys, direct-sync P1363 signing, native sealed-package roundtrip, SQLCipher encrypted header, wrong-key rejection and reopen persistence. It reports the actual security level. SOFTWARE is a negative hardware-policy result even when all primitive checks pass. No production key is exported; printed keys/signatures are public QA vectors.

It also checks the local file primitive on a 2 MiB+47-byte QA file, wrong-context rejection and kernel no-replace destination collision. Android publication uses JNI `renameat2(RENAME_NOREPLACE)` and directory fsync, failing closed if unavailable. No runtime media migration is invoked. The local format is independent of the BE handover wire format. See the local file checkpoint worklog for current APK hash and two fresh-process runs; the foundation hash below describes the earlier build only.

## Independent protocol checks

The Android probe also exercises the strict `HandoverPackageJson` codec with isolated keys: roundtrip, wrong trusted sender/device, tampered header/ciphertext, duplicate/unknown fields and trailing JSON. Production JS exports retain the hardware policy and are not considered accepted on a SOFTWARE emulator. See `docs/worklogs/OFFLINE-HANDOVER-NATIVE-BRIDGE-20261124-review.md`.

```powershell
node --test tests/offline-handover-primitives.test.cjs tests/offline-handover-package.test.cjs
node tests/native-probe/package-interop.cjs D:/Do_AN_Drone/RoadGuardSystem-develop
```

The second command pins BE `fb2761619cce11e05e439f322efbf41e00f8a7bf` and compiles its unmodified crypto oracle files read-only. Synthetic JVM/.NET fixture private keys exist only in the isolated harness. Java→BE and BE→Java packages must open with identical canonical bytes; tamper/untrusted signer must fail. This does not test grants, HTTP rights, native hardware custody or business acceptance.

## Executed 2026-11-24

- Android14/API34 x86_64 emulator; app `com.hoanghai.roadguard` installed beside Expo Go.
- SQLCipher `4.17.0 community`; five consecutive fresh-process probes PASS.
- Both EC keys: security level0 SOFTWARE. Production TEE/StrongBox gate remains unsatisfied.
- App APK SHA256: `3B7422E011B1C4566BBD0126A78DFED26128682AFBA9477B3A88D1CEC8F40F18`.
- Full Node regression 2084/2084; typecheck exit0. Exact logs referenced in checkpoint worklog.
