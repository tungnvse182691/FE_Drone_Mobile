# Offline media vault foundation — 2026-11-25

Mode: IMPLEMENT_AND_SELF_REVIEW. Base: e8d3e58, main. Scope: native local media primitives and isolated probes only. No runtime media migration, no source deletion, no push.

## Changes and review

- Account/environment/role-bound Android Keystore AES-GCM media storage; explicit key preparation, persisted key lifecycle, no implicit replacement after key loss.
- Controlled app-owned input directories, UUID assets, no arbitrary output path; reject symlinks, database paths and content URIs. Android's OS-owned `/data/user/0` / `/data/data` root alias is accepted; descendants remain checked.
- Authenticated bounded random reads (maximum 1 MiB), including cross-chunk verification. A range read does not prove full-file checksum or server receipt.
- Existing plaintext originals retained. No pending data, SQL, journal, fixture or database was removed or rewritten.
- Existing bridge security allowlist updated for the three explicitly reviewed methods. Production native acceptance flag remains false.

## Executed evidence

Artifacts: `.cache/offline-session-20261124/` (local, not staged).

- TypeScript: `npx tsc --noEmit`, exit 0 (`media-vault-tsc-final.log`).
- Targeted: `node --test tests/final-native-security.test.cjs tests/offline-local-file-crypto.test.cjs tests/encrypted-database.test.cjs`: 10/10 pass (`media-vault-targeted.log`). JVM crypto test first failed for missing range API, then passed after implementation.
- Full: `node --test --test-concurrency=2 tests/*.test.cjs`: 2111/2111 pass, 0 failed (`media-vault-regression-final.log`). Initial run exposed the obsolete bridge allowlist; fixed and reran the full suite.
- Native release + instrumentation build: `media-vault-alias-build.log`, success. First native attempt exposed an Android app-root alias rejection; corrected before the passing runs.
- `adb shell am instrument -w com.hoanghai.roadguard.test/roadguard.probe.NativeProbe`: first-run seal/range/preservation and a separate fresh-process restart pass, for all three roles (`media-vault-native-alias.log`, `media-vault-native-restart.log`). Includes cross-role/actor rejection, invalid source/range, source preservation and existing asset collision rejection.
- Actual JS-to-native bridge: opt-in storage QA entry, first run and force-stop/reopen both pass for all three roles (`media-vault-js-result.log`, `media-vault-js-first.png`, `media-vault-js-restart.png`). Existing SQLCipher migration/transactions/rollback/recovery/wrong-key probes also pass.
- Normal APK restored using install -r; no emulator restart, uninstall or data clear. Normal APK SHA256 C44E0A8A2179413FE22697F9BE1F162BD836BBF3182895579024BD3DDB79AB95.

## Limits / remaining work

NATIVE_VERIFIED and LOGIC_TESTED within the above primitive scope. Emulator keys report SOFTWARE: this is not TEE/StrongBox proof and does not unlock signed sync or 42A production gates. No iOS implementation claimed. Runtime camera/gallery/cache/upload readers still need guarded integration before media-at-rest migration can be accepted. Existing plaintext originals are deliberately retained, so complete device-at-rest encryption is not claimed. Business offline end-to-end verification remains separate.
