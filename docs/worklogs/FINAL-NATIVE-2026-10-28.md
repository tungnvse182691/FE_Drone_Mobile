# Final native gate — 2026-10-28

- Reviewer: Codex native subagent; mode `IMPLEMENT_AND_SELF_REVIEW` (not independent audit).
- FE baseline: `1ed634640c23661e269c0c4c4c68253edd5da005`, branch `main`; pre-edit tracked tree clean, existing `.cache/` and `mydatabase.db` preserved. Parent performs remote parity/BE pin and aggregate gates. No stage, commit, push or BE mutation in this stream.
- Scope: local crypto module, exact authorized Worklets dependency/lock, native source security regression, this worklog. No app config changes.

## Findings and changes

1. **G1 derived-secret export:** removed `agreementProof` from Kotlin production module and TypeScript bridge. Production bridge exports only capability, installation identifier, key creation, public keys, sign and verify. There is no ECDH calculation or derived-secret diagnostic in the production Kotlin module. JVM ECDH tests remain isolated tests, not production exports. Encrypted handover remains unavailable; future KDF/encryption must retain key material inside native.
2. **G2 missing dependency:** added exact `react-native-worklets: 0.10.1`. Installed Expo `57.0.23` `bundledNativeModules.json` specifies `0.10.1`; Reanimated `4.5.1` package peer and `compatibility.json` require `0.10.x` and allow RN `0.86`; installed Worklets compatibility and peer metadata allow RN `0.83–0.86`. RN remains `0.86.3`. No existing package upgraded. Lock delta adds Worklets and its three previously absent Babel transform dependencies; all four added packages declare MIT. `npm install --save-exact react-native-worklets@0.10.1 --ignore-scripts --no-audit --no-fund` exit 0, four packages added.
3. Acceptance flag remains `NATIVE_ACCEPTANCE_VERIFIED = false`. Hardware policy (API >=31, per-alias TEE/StrongBox) unchanged.

Sources checked 2026-10-28: [Reanimated official compatibility guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) directs exact patch checks to installed `compatibility.json`; [official troubleshooting](https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting/) identifies missing Worklets in Reanimated 4; npm registry `npm view react-native-worklets@0.10.1 version license peerDependencies --json` confirmed version/license/peer constraints. Local package metadata is the version-specific evidence.

## Regression evidence

- `node --test tests/final-native-security.test.cjs`: first run failed against the old native ECDH export, expected failure reproduced; after removal passes.
- `node --test tests/final-native-security.test.cjs tests/c10bc-native.test.cjs`: **3 PASS / 0 FAIL**, exit 0, about 4 seconds. Includes strict DER/P1363/P256/domain-separated JCA/ECDH tests and bidirectional JVM JCA ↔ .NET oracle signature verification. Labels: `LOGIC_TESTED`, `PROTOCOL_INTEROP_TESTED` for JVM/.NET only.
- `npm run typecheck`: exit 0 in this shared working tree. Parent owns final aggregate typecheck/regression after all streams.
- `git diff --check -- modules/roadguard-offline-crypto package.json package-lock.json tests/final-native-security.test.cjs`: exit 0 (Git LF/CRLF warnings only).
- Security regression asserts exact native export allowlist, no production `generateSecret`/KeyAgreement/agreementProof and closed acceptance gate. This source-level guard does not prove runtime custody on hardware.

## Android build environment and exact commands

Scratch pre-existing generated Android project: `.cache/c10bc-native-build/android`; its `node_modules` points to root installed dependencies, Expo autolinking points to root `modules`. Scratch package now includes the same Worklets version. No root Android project or config generated/changed. Android package `com.hoanghai.roadguard`, new architecture enabled, Hermes enabled.

- Windows PowerShell; `JAVA_HOME=C:/Program Files/Java/jdk-24` (24.0.1), `ANDROID_HOME=ANDROID_SDK_ROOT=D:/Android/Sdk`.
- Gradle `9.3.1`, Kotlin `2.1.20`, KSP `2.1.20-2.0.1`, NDK `27.1.12297006`, buildTools `36.0.0`, compile/target SDK36, min SDK24. These are template/toolchain settings, not a relaxation of runtime API31 admission.

```powershell
./.cache/c10bc-native-build/android/gradlew.bat -p .cache/c10bc-native-build/android :roadguard-offline-crypto:compileDebugKotlin --console=plain
```

**SUCCESS**, exit 0, `BUILD SUCCESSFUL in 1m 38s`, 59 tasks (31 executed, 28 up-to-date), actual `:roadguard-offline-crypto:compileDebugKotlin` executed. Log `.cache/c10bc-native-build/final-native-kotlin.log`, SHA256 `B23D9923F75C02DE4897B9EAFBE40C6D65542A487AFA6B9DC53589FABE80A887`. Compiled module class exists in `modules/roadguard-offline-crypto/android/build/tmp/kotlin-classes/debug/roadguard/offline/`. Only module warning is deprecated pre31 `isInsideSecureHardware` fallback; production admission still rejects below31.

Full app attempt:

```powershell
./.cache/c10bc-native-build/android/gradlew.bat -p .cache/c10bc-native-build/android :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain
```

Initial attempt failed exit1 in 2m39s, 319 tasks, Worklets/screens CMake configuration. `--stacktrace` isolated `GeneratePrefabPackagesKt.reportErrors` rejecting JDK24 JNA stderr `WARNING: A restricted method in java.lang.System has been called`. Prefab stderr explicitly recommended `--enable-native-access=ALL-UNNAMED`; [Oracle JDK24 restricted methods documentation](https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/lang/doc-files/RestrictedMethods.html) confirms the JVM flag. No dependency upgrade/tool replacement was used.

Environment-only retry:

```powershell
$env:JAVA_TOOL_OPTIONS='--enable-native-access=ALL-UNNAMED'
./.cache/c10bc-native-build/android/gradlew.bat -p .cache/c10bc-native-build/android ':react-native-worklets:configureCMakeDebug[arm64-v8a]' --console=plain
./.cache/c10bc-native-build/android/gradlew.bat -p .cache/c10bc-native-build/android :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain
```

Worklets configuration retry **SUCCESS**, exit0 in14s,33 tasks. Logs: `final-native-assemble.log`, `final-native-cmake-diagnostic.log`, `final-native-cmake-env.log`, `final-native-assemble-env.log` under `.cache/c10bc-native-build/`.

Full app arm64 retry **SUCCESS**, exit0, `BUILD SUCCESSFUL in 7m 6s`, 384 tasks (71 executed,313 up-to-date), completed approximately19:47 UTC+7. Actual app Kotlin/Java, Worklets/Reanimated/ExpoCore/screens/gesture-handler/app C++ and packageDebug executed. Label `NATIVE_BUILD_VERIFIED` for this scratch debug arm64 build only. Debug build does not bundle/execute the Metro JS application, and does not verify runtime native module availability.

- APK: `.cache/c10bc-native-build/android/app/build/outputs/apk/debug/app-debug.apk`,92,978,672 bytes, SHA256 `A1DFF4EB85DABCC393603E6CA434B12EFB5C3AB1176EFCB58EB925C48E3C0A14`.
- Successful full build log SHA256 `C50B6EA5361BA7D7A284335888785461DA5076353EA0908DB85479183F4891EA`.
- CMake emitted long-object-path warnings but compilation completed. Gradle deprecation warnings remain. No root config modification was needed.

## Device/runtime limits

Initial `D:/Android/Sdk/platform-tools/adb.exe devices -l` exit0 returned only `List of devices attached` and an empty device list. This subagent started no emulator. At19:47:42 UTC+7 after build completion, repeat adb showed `emulator-5554 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64`; parent was notified of external device state change. This arm64 APK was not installed on that x86_64 emulator by this subagent. Native Keystore hardware admission, Android ECDH, signing on actual Keystore keys, process death/restart, installation persistence, partial key creation/failed preferences commits and app reinstall are `NOT_RUN` in this stream; three-role Android E2E is `NOT_RUN` here (parent owns any subsequent E2E evidence). JVM tests and Gradle compilation do not establish these runtime properties. Signed-sync production admission remains blocked pending actual device/provider/interop/restart evidence and independent acceptance. No actual signed-sync HTTP mutation or fixture used by this stream.

## Authorized runtime follow-up — device disconnected

Parent explicitly authorized read-only device inspection and installation only if package absent; no emulator start, clear data or overwrite existing app. Inspection observed x86_64, API34 (`getprop ro.product.cpu.abi` / `getprop ro.build.version.sdk`); `pm path com.hoanghai.roadguard` returned no path. `pm list features` included `android.hardware.hardware_keystore=300` and `android.hardware.keystore.app_attest_key`; this advertised feature does **not** establish per-alias KeyInfo hardware admission.

Built x86_64 with same command/environment as above, replacing `-PreactNativeArchitectures=x86_64`: **SUCCESS**, exit0,4m26s,384 tasks (35 executed,349 up-to-date). Log `.cache/c10bc-native-build/final-native-x86.log`, SHA256 `B9DBF06F3340C8405D72CCFA630FACEFEF310C02BE359D11669A30E939825D07`. APK92,932,221 bytes SHA256 `56E261F762527E2F4689E14CE0BDE974A84C44E3D18933B589AC92769CA0E5CA`; preserved under `.cache/c10bc-native-build/artifacts-x86_64/app-debug.apk`; arm64 build preserved under `artifacts-arm64/app-debug.apk`.

Prepared scratch-only `native-diagnostic.js` (also `index.js`) to load native module, check export absence, installation ID persistence and hardware admission on synthetic isolated binding (`https://native-diagnostic.invalid`), without login/BE. Started dedicated Metro8083; host8081 and existing device reverse8081→8081 were preserved. Scratch package `main` was temporarily `index.js` for harness preparation, then restored to original `expo-router/entry` after device loss; root application source/entry untouched. Metro log `final-native-metro.log`. No JS bundle actually requested or run; harness is not app E2E or runtime evidence.

At19:53:25 UTC+7 `adb -s emulator-5554 shell pm path ...` returned `device 'emulator-5554' not found`; repeated `adb devices -l` at19:53:58 and after build completion returned empty lists. Parent informed immediately. This subagent did not stop emulator or other services. **No APK installed, no app launched, no native runtime method executed, no process/restart test**. Runtime remains `NOT_RUN` due device disconnection. Prepared APK/harness retained for a future connected-device run; no policy relaxation or acceptance flag change.

Cleanup authorized by parent: stopped only task-owned Metro8083 via Ctrl+C to its exec session23500; session exited. Follow-up TCP listener inspection showed no8083 listener. Logs/APKs/harness retained. No8081 process, adb server or emulator action performed during cleanup; no task-owned helper left running.
