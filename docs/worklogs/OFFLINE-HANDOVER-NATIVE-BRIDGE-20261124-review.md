# Handover native JSON bridge — 2026-11-24

Mode: IMPLEMENT_AND_SELF_REVIEW. Scope: Android package codec/bridge and isolated native probes. Parent: dfa7667. No independent review claimed.

## Changes and authority

- Added bounded strict JSON conversion for the existing HandoverPackage protocol. Reject duplicate/unknown fields, trailing JSON, unexpected types, invalid versions and oversized inputs. Depth <=8; recipients <=32; origins <=1000; decoded payload <=16 MiB; input <=24 Mi UTF-16 code units.
- Added sealPackage/openPackage native exports. Both retain usable(binding), validated actor/device binding and native private keys. Trusted sender key is a separate required input; it must come from authenticated registration, never the envelope.
- Corrected the handover blocker text: primitives exist; runtime rights/trusted key provenance/native acceptance remain unverified. No workflow dispatch or UI behavior changed.
- QA invokes codec with isolated Keystore keys via reflection. This does NOT bypass production usable(binding); the emulator cannot exercise successful hardware-gated JS exports.

## Executed evidence

- Build: Gradle assembleDebug + assembleDebugAndroidTest using both tests/native-probe init scripts and x86_64; BUILD SUCCESSFUL, 46s. `.cache/offline-json-bridge-build.log`.
- APK SHA256: 405002C96ADF71F3D329AB030568DD97DE746ED4A415E0D4591A5BC531C1F21D.
- Installed app/test APK with adb install -r; emulator never restarted, Expo Go account/data untouched.
- Two actual instrumentation runs: `.cache/offline-json-bridge-native-1.log` and `-2.log`, both status=PASS / INSTRUMENTATION_CODE=-1. Codec roundtrip, ciphertext/header tamper, wrong trusted signer, wrong recipient device, duplicate/unknown fields and trailing JSON rejected. Existing SQLCipher/file/signature probes also pass after fresh process start.
- Both EC keys report security level0 SOFTWARE: NOT production hardware acceptance.
- `node --test tests/final-native-security.test.cjs`: 1/1 PASS (structural gate, not runtime bridge proof).
- `npx tsc --noEmit`: exit0, `.cache/offline-json-bridge-typecheck.log`.
- `node --test tests/*.test.cjs`: 2088/2088 PASS, zero skipped, `.cache/offline-json-bridge-full.log`.
- `git diff --check`: PASS. Fetched origin/main; 0 remote-only /3 local-only before checkpoint commit; branch main.

## Limits / remaining gates

NATIVE_VERIFIED applies to isolated codec and Keystore primitives only. Hardware-gated bridge successful invocation, recipient registration provenance, grant/export/import/revocation HTTP workflow, storage migration and combined role offline E2E remain NOT_RUN. NATIVE_ACCEPTANCE_VERIFIED remains false. No BE source, Docker, SQL, Web, runtime task UI or existing pending queue changed. No push.
