# Local encrypted file foundation — 2026-11-24

Mode: IMPLEMENT_AND_SELF_REVIEW. Parent HEAD `d943806`; BE inspected read-only at `fb2761619cce11e05e439f322efbf41e00f8a7bf`. This is a primitive checkpoint, not completed storage migration or six-workstream acceptance.

## Implementation

- AES-GCM authenticated chunks (64 KiB), fresh provider-generated IV per chunk; authenticated version/length/file nonce/context/chunk index. Native AES key remains native.
- Bounded streaming, SHA-256 of plaintext, per-chunk buffer cleanup. All chunks authenticate before decrypted output publication.
- Sources and existing destinations are preserved. No production caller, asset reference, account storage or pending entry is changed.
- Initial host hard-link publication passed JVM tests but failed Android with `AccessDeniedException`; `.cache/offline-local-file-native-1.log`. Fixed Android using a small JNI `renameat2(RENAME_NOREPLACE)` plus directory fsync. No overwrite/copy fallback. Publication failure can leave an unreferenced orphan; it must never be adopted as verified media.
- JNI uses a directory fd and single-component filenames. Callers still must authorize app-private paths and account/environment/asset binding before invoking the helper; this checkpoint exposes no JS method.
- SQLCipher, signing and handover primitive probes continue to use isolated QA files/aliases. The runtime hardware policy and `NATIVE_ACCEPTANCE_VERIFIED=false` remain unchanged.

## Executed evidence

Commands executed from the FE root:

- `node --test tests/offline-local-file-crypto.test.cjs`: 1/1 PASS. JVM scenarios include 2 MiB+47 bytes, wrong key/context, tamper, truncation, reordered/duplicated chunks, existing destination, empty file and ignored abandoned temp.
- `node --test tests/*.test.cjs`: 2088/2088 PASS, zero skipped; `.cache/offline-local-file-full.log`, exit 0.
- `npm run typecheck`: exit 0; `.cache/offline-local-file-typecheck.log`.
- Gradle app/test APK build: exit 0; `.cache/offline-local-file-native-publication-final-build.log`. Same documented Windows build command, with quoted `'-Droadguard.native.cxxRoot=D:/rg-cxx-20261124'`.
- Both APKs installed with `adb -s emulator-5554 install -r`; existing application data preserved.
- Two consecutive `adb -s emulator-5554 shell am instrument -w com.hoanghai.roadguard.test/roadguard.probe.NativeProbe` executions: `status=PASS`, instrumentation code -1; `.cache/offline-local-file-native-fixed-1.log` and `...-2.log`.
- Android checks include 2 MiB+47 bytes, original preservation, wrong-context/no-output, and direct kernel destination-collision preservation. SQLCipher wrong-key/reopen, ECDH, P1363 and sealed-package probes also PASS. Both EC key security levels remain 0 SOFTWARE.
- App APK SHA256 `BC453847FEF2ED67EBCA81F34BCB4E70BF43C7018367D265C39EC880F7B87FCA`.
- `git diff --check`: exit 0. Manual scoped review: no credentials, private key export, UI/API changes, DB migration, cleanup or production dispatch added.

## Limits / remaining work

`NATIVE_VERIFIED` applies only to the isolated Android primitives on API34/x86_64. Host publication uses a hard link for JVM tests; it is not Android publication evidence. No iOS or physical hardware evidence. No power-loss test. The helper is not wired to actual image/video/cache lifecycles and does not claim full at-rest encryption.

Real DB migration remains unimplemented: every exclusive SQLite transaction opens another connection which must receive its own key before access. Existing plaintext DB/files are retained. Crew enrollment/signed dispatch, grant-based handover and all-role offline/restart/reconnect acceptance remain incomplete. Emulator SOFTWARE custody cannot satisfy the required TEE/StrongBox gate; this is not a BE defect.

Git fetch before commit: origin/main 0 ahead, local 2 ahead. No push. Existing untracked logs, DB, native build outputs and `.cache/` preserved.
