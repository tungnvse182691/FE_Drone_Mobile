# Operator encrypted media reader/writer checkpoint

Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW. Baseline `7b14170`, main.
Remote main fetched unchanged at `71aeb0a`. Scope: droneLocalFiles and its tests.

## Change

New Operator source preservation seals through the installed native media vault,
persists an account/environment/role-bound reference before publishing readiness,
and reads upload ranges through authenticated chunks of at most 1 MiB. A present
provider failure cannot fall back to the retained plaintext. Missing providers keep
the preexisting legacy behavior; this is not an encrypted-storage claim for iOS or
Expo Go. Legacy rehash can seal without changing file/journal identity. No UI,
wire body, task authority, cursor, upload receipt or signing acceptance gate changed.

## Executed verification

- TypeScript `npx tsc --noEmit`: exit 0, including a fresh post-Android rerun.
- `node --test tests/package6-drone-files.test.cjs`: 19/19, exit 0, rerun after E2E.
  Earlier combined media-access/Operator targeted run: 26/26.
- Full regression: 2123/2123, zero failures; unchanged source subsequently reviewed.
- Release Android build/install-r: PASS, original app data retained.
- APK SHA256 `68843A413EE251CA7B7F00D2B5BA3E17A6CF55D878514856134BEF9FFD91A17D`.
- `git diff --check`: PASS.

Actual normal Android app, emulator-5554 Android14: accepted dedicated fixture
`39281596-df73-4c98-8aaf-7c2c5f30b0be`, disabled networking, selected synthetic
7915-byte MP4, saved date/time and draft, force-stopped/reopened only the app offline.
Video, selection and time 11:27 restored; listing authenticated a vault range.
Restored networking/session and submitted through the app, using vault bytes.

First attempt reached VERIFY_PENDING beyond the app's bounded observation period.
Read-only SQL inspection and authenticated GET upload confirmed VERIFIED; no checksum,
size or MIME failure. The app's existing continue action reread the same upload and
submitted successfully, without uploading its part again. UI displayed "Đã gửi dữ liệu".
This was asynchronous verification, not evidence of a vault corruption or app crash.

HTTP GET task/datasets returned 200: task SUBMITTED, exactly one dataset
`e4d79fdb-4170-4b02-b78e-547e627da3ae`, versionNo1, integrityStatus PASSED.
App-only restart online preserved login; repeated HTTP readback retained the same
single dataset. No SQL write or second upload session was used for recovery.

Evidence under `.cache/offline-session-20261124/`: operator-vault-targeted*.log,
operator-vault-regression.log, operator-vault-typecheck-final.log,
operator-vault-build-final.log, operator-vault-offline-saved.png,
operator-vault-restart-restored.png, operator-vault-submitted.png,
operator-vault-readback.json. Fixture creation journal is retained; do not rerun it.

ANDROID_E2E_VERIFIED for offline selection/save, app restart, manual resume, vault
read/upload and server readback on this fixture. HTTP_VERIFIED for reads and fixture
submission. Native keys on this emulator remain SOFTWARE; hardware acceptance stays
closed. This is a synthetic transfer, not proof of real 4K coverage or interruption
halfway through a large part.

## Remaining scope

Original plaintext source files remain intact for safe recovery. No automatic
complete legacy migration, plaintext cleanup or full at-rest encryption claim.
Reporter/Crew writers and previews still need integration. Crew signing production
gate, 42A independently authenticated peer keys and physical hardware proof remain
separate. English in Screenshot_1795578316 was FE storage QA text, already translated
in an earlier checkpoint; it was not backend output. Emulator left open and online.
