# Offline native foundation — checkpoint, not six-workstream completion

- Reviewer: Codex; mode IMPLEMENT_AND_SELF_REVIEW.
- Base SHA: `71aeb0ab45fbc71bf75121e6c221acac108b4ad5`; branch main.
- BE reference (read-only): `fb2761619cce11e05e439f322efbf41e00f8a7bf`.
- Owner approved dev-client, SQLCipher/native additions, side-by-side Android install and local checkpoint commits. No push.

## Changes

Added expo-dev-client (resolved58.0.21), enabled SQLCipher in build configuration, internal Java sealed-package primitives and isolated native/protocol test harness. No runtime bridge export, authority gate, UI, API caller or existing storage migration changed. Existing database/files are not claimed encrypted by this checkpoint.

## Executed evidence

| Check | Result / evidence |
|---|---|
| Android build | PASS; `.cache/offline-native-sdk58-build-short.log`, 549 tasks; Windows Ninja path workaround, two workers |
| Side-by-side install | PASS; `com.hoanghai.roadguard`, Expo Go preserved; no emulator restart, app-data clearing or uninstall |
| Native primitives / SQLCipher | Five fresh-process runs PASS; `.cache/offline-native-fixed-1.log` through `-5.log`; SQLCipher4.17.0 |
| Direct-sync native signature → independent .NET | PASS; `.cache/offline-native-signature-dotnet.log`, valid:true |
| Java ↔ pinned BE sealed package | PROTOCOL_INTEROP_TESTED; `.cache/offline-package-be-interop.log`; exact canonical header/package bytes, Unicode payload, tamper/untrusted-signer rejection |
| TypeScript | PASS exit0; `npm run typecheck`, `.cache/offline-foundation-typecheck-final.log` |
| Full regression | LOGIC_TESTED; `node --test --test-concurrency=2 tests/*.test.cjs`, 2084/2084, fail0; `.cache/offline-foundation-full-final.log` |

APK SHA256: `3B7422E011B1C4566BBD0126A78DFED26128682AFBA9477B3A88D1CEC8F40F18`. Debug certificate SHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

## Self-review / correction

An initial repeat probe failed at cipher_open: `ExceptionInInitializerError` caused by `NativeLoader has not been initialized`. Instrumentation's worker raced Application.onCreate. Fixed the test harness with an Application-ready latch; no SQLCipher/app workaround. Five subsequent new-process runs passed, with existing keys and persisted encrypted content.

Internal crypto helpers enforce P256 key parsing, exact canonical protocol fields, unique/sorted recipients, signature verification before decryption, independent trusted signer, actor/device/key recipient binding, payload hash and bounded input. Raw shared/content keys stay internal and are wiped. These helpers are not exposed to JS or connected to workflow yet. Test-only synthetic key import is isolated from production Android Keystore.

## Limits / remaining gates

- Actual emulator key security level: SOFTWARE(0), not TEE/StrongBox. `NATIVE_ACCEPTANCE_VERIFIED=false` remains unchanged. Primitive NATIVE_VERIFIED evidence does not prove production custody/enrollment.
- Encrypted DB/file migration, Crew signed workflow, handover grants/import/export, legacy reconciliation and three-role Android E2E remain unfinished. No HTTP workflow acceptance from this checkpoint.
- iOS native implementation / hardware evidence NOT_RUN.
- Source changes introduce no icons, routes, financial presentation or role permission changes. No BE/Web/Docker/SQL changes.
- Generated Android/build outputs and pre-existing untracked data are excluded from the commit.
