# Guarded encrypted media access — checkpoint

- Reviewer: Codex; mode: IMPLEMENT_AND_SELF_REVIEW.
- Baseline: `80450279f130e27217c1f33abd9c6b2a962972ea`, branch main.
- Scope: `src/offline/mediaVaultAccess.ts`, its isolated test, storage QA entry.
- No production media writer/preview/upload caller changed in this checkpoint.

## Implementation and self-review

Account/environment/role-bound encrypted references omit session, credentials and
native paths. Access is authorized against the initiating live session across
each asynchronous boundary. A separately authorized new session can reopen an
existing reference. Native ranges have strict bounds and canonical Base64 checks;
full photo reads are limited to 20 MiB and verify SHA-256 before returning data.
Failed reads erase their mutable plaintext buffers. No deletion or plaintext
fallback is provided.

Self-review found runtime extra fields in expected metadata could overwrite a
returned identity/reference via object spread. Added a regression, observed RED
(6 pass / 1 fail), then copied only size/checksum. Added delayed-hash/session-change
coverage with buffer erasure. Related tests GREEN 16/16.

The English details in Screenshot_1795578316.png originate in the FE isolated QA
entry, not BE. Visible expanded details now use Vietnamese; raw diagnostic output
remains available in internal logs. No product route/layout was changed.

## Executed evidence

All paths below are relative to `.cache/offline-session-20261124/`.

- `npx tsc --noEmit`: exit 0 (`media-access-typecheck.log`, no diagnostics).
- `node --test tests/offline-media-access.test.cjs tests/final-native-security.test.cjs tests/encrypted-database.test.cjs`:
  16/16 PASS (`media-access-targeted.log`).
- `node --test --test-concurrency=2 tests/*.test.cjs`: 2118/2118 PASS,
  exit 0 (`media-access-regression-final.log`).
- `git diff --check`: PASS.
- Embedded x86_64 release build: BUILD SUCCESSFUL in 1m42s
  (`media-access-build-final.log`); install-r succeeded.
- Android emulator-5554: final accessor probe passed after installation and again
  after app-only force-stop/reopen. `media-access-android-restart.log` records
  `three-role media bridge restart PASS; guarded media access PASS`.
- Each role: sealed reference persisted in isolated SecureStore keys, full bytes
  checked, cross-block range reopened, old session and session changing during a
  native read denied. Existing synthetic source retained.
- Expanded Vietnamese UI captured and inspected: `media-access-vietnamese.png`.

## Environment recovery

At entry, emulator transport was offline. Reconnect recovered transport but Android
window service was missing; bounded checks and reboot did not restore it. Used
owner's malfunction exception to close/reopen the same Pixel_6_Pro AVD with
`-no-snapshot-load`, without wipe/reset/new AVD. Recovery logs:
`emulator-recovery-out.log`, `emulator-recovery-err.log`.
Normal APK restored using install-r. Restart had removed adb reverse; restored
tcp:18181 mapping to the unchanged healthy Docker API. No app data was cleared.

## Limits

LOGIC_TESTED and NATIVE_VERIFIED only for the scoped storage adapter on this
SOFTWARE-key emulator. This is not three-role business E2E or hardware-backed
acceptance. Production media writers/readers and historical plaintext originals
are not migrated by this checkpoint. TEE/StrongBox, iOS, full Crew signed workflow
and authenticated 42A peer-key discovery remain separate gates. No HTTP mutation,
BE source, dependency, native configuration or Docker data changed here.
