# Runtime SQLCipher adapter checkpoint

- Date: 2026-11-25; reviewer: Codex; mode: IMPLEMENT_AND_SELF_REVIEW.
- Parent SHA: 37e7156; scope: shared SQLite boot barrier and test-only probes.
- No BE source, dependency, app configuration, UI layout, branch or remote mutation.

## Root cause and implementation

Expo SQLite's default exclusive transaction opens an additional unkeyed
connection. The owned runtime connection now opens a verified encrypted candidate
using a device-only SecureStore key. Its exclusive transactions open and key a
separate connection before BEGIN, preserving commit/rollback/close behavior.
Android bare SQLite directory paths are normalized to file URIs for existence
checks; this was verified against the real Android adapter.

Migration retains the source, verifies schema and complete row multisets in
SQLite, preserves header versions, reopens the candidate and checks integrity
before ACTIVE. Missing/corrupt keys, partial or mismatching candidates fail
closed. Expo Go's separate sandbox can retain plaintext; this is never native
fallback or encrypted-storage acceptance.

## Executed evidence

- `node --test tests/encrypted-database.test.cjs tests/dot-a-sqlite.test.cjs tests/dot-a-supplement.test.cjs tests/fix01-sqlite.test.cjs`: 33/33 PASS;
  `.cache/offline-session-20261124/storage-checkpoint-targeted.log`.
- `npx tsc --noEmit`: exit0, `storage-qa-tsc.log` in the same evidence directory.
- Full regression with concurrency2: 2104/2104 PASS, `resume-full-serial2.log`.
- Actual embedded JS storage entry built with `windows-build.gradle`, opt-in
  loopbackQa/storageQa, x86_64 release with optimization disabled for QA:
  `storage-adapter-build2.log`, BUILD SUCCESSFUL. QA APK SHA256
  `D056BB4D0B470E3343AD6F6A731EFC0093BF895526F8C08CD33845AB5E3F52EF`.
- Android14 emulator-5554, two fresh app processes (5934 then6106): real adapter
  migration/restart, transaction commit/rollback, blobs, duplicate NULL rows,
  interrupted ACTIVE save recovery and wrong-key rejection PASS. Screenshots
  `storage-first.png`, `storage-restart.png`. `LOCAL_STORAGE_PROTECTION_UNAVAILABLE`
  stages candidate-activate/metadata-read are expected injected negative tests.
- Normal APK restored successfully using install-r, SHA256
  `03024DD8115CE92A22AB5E8331D832B07B42E211521EE2910D86D1EB49E78C1E`.
  Actual foreground/hierarchy confirms Crew Home and the preserved Crew session.
- Read-only runtime file inspector: original plaintext SHA256 unchanged
  `c3f7ade280db3802a5717c7648076464efbc52351b5e627918564f9a51a64fed`;
  encrypted candidate has no SQLite plaintext header. `db-diagnostic.txt`.

## Limits

NATIVE_VERIFIED applies to this Android adapter and synthetic interrupted
activation only. Other crash points fail closed and require explicit recovery.
Original plaintext is retained for data safety; runtime media remains plaintext.
This checkpoint does not establish complete at-rest protection, iOS, hardware
TEE/StrongBox, signed business HTTP receipts or three-role offline E2E.
Emulator never restarted; no app data, journal or pending media deleted.
