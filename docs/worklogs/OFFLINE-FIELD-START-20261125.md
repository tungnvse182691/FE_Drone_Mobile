# Crew FIELD receive/start checkpoint — 2026-11-25

- Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW; no independent review claimed.
- Base: main@cff3114; Backend deployed contract b891e88, read-only source.
- Scope: explicit saved-snapshot route, native signed FIELD_ACCEPT → FIELD_START preparation, durable dispatch and authenticated receipt reconciliation. No submission/handover completion claim.

## Executed evidence

- Android 14 Pixel_6_Pro / emulator-5554, existing QA debuggable release APK, local API 10.0.2.2:18181. Production native acceptance remains false; emulator SOFTWARE custody is not TEE/StrongBox proof.
- Dedicated project 72f84201-c001-4000-8000-000000000001; task 5772ff9f-b6dd-48c5-b7dc-5dbf679aca59, assignment 82019282-2c9f-4b05-8485-cf569f313e45.
- Opened reconciled snapshot on Android; disabled Wi-Fi and cellular with adb svc; tapped receive/start. App saved native-signed bytes without HTTP. It explicitly reported saved, not sent.
- Force-stopped/reopened RoadGuard while offline. Local inspection displayed saved journal b0740b6b-e09f-4f1f-b9b0-e80c0b755058. Startup requires session verification before dispatch; local inspection remains read-only. Restored both networks, retried session restoration without logging out. Sync displayed 3 saved / 1 pending / 2 reconciled.
- Explicit Android Send signed package action invoked API-130; successful application reconciliation requires matching POST receipt, API-115 batch GET and API-123 authenticated origin GET for BOTH operations. UI became 3 saved / 0 pending / 3 reconciled. A second process restart preserved these counts and removed send action for the reconciled package.
- Independent Crew HTTP GET /api/v1/projects/{project}/field-inspection-tasks/{task}: 200, status InProgress, version AAAAAAAFKh8=.
- Independent GET /api/v1/projects/{project}/offline/origins/2549ed7b-eb55-4b53-ac93-6af2e164f610: 200, FIELD_START, COMMITTED, durableAcknowledgment=true, matching task/assignment. Time remains UNCERTAIN / CLAIMED_OFFLINE; no trusted offline time invented.
- Raw readback: .cache/offline-session-20261124/field-android-readback.json. Android screenshot: field-android-confirmed.png in same directory. Independent batch GET outside the app was NOT_RUN; no batch ID inferred from an origin ID.

## Verification

- node --test tests/*.test.cjs: 2173/2173 PASS, 0 skipped, exit 0, 117018 ms. Reused field-full.log.
- npm run typecheck: exit 0, reused field-tsc.log.
- git diff --check: exit 0 (line-ending warnings only).
- Producer/mounted-screen tests cover explicit action, no automatic mutation on mount, double tap, native gate, snapshot/source ownership, accept/start dependency and local persistence.
- Journal tests cover duplicate intents across sessions and atomic exclusion of pending online FIELD commands. Recovery tests cover partial origin observations, exact replay, absent-origin 404/not_found versus permission/network errors.
- Historical UI checkpoint test now names and compares fixed original commits 635e367/8199cbe; current online screen tests retain mounted behavior coverage.
- Android exact replay after response loss: NOT_RUN in this checkpoint; logic tested only. FIELD_SUBMISSION, revoked assignment, 42A, hardware gate and three-role combined acceptance remain separate work.

## Preserved behavior and limitations

Online permission/error paths remain separate; offline is explicit and cannot serve as a 403 fallback. Snapshot repair contexts are blocked. Commands keep actor/environment/session/task/version/body/key immutable. No API, Backend, Web, Docker, SQL, production security gate or global UI redesign changed. No old journal/data removed or adopted.

## Artifact retention (no deletion authorized or performed)

- Keep current QA output android/app/build/outputs/apk/release/app-release.apk and existing build cache for reuse; no new APK copy was created.
- Keep verified rollback .cache/offline-session-20261124/storage-resume-normal.apk.
- Keep current fixture journals, field-full.log, field-tsc.log, field-android-readback.json and field-android-confirmed.png for this evidence; all remain untracked.
- Older APK candidates for owner review only: app-before-storage-probe.apk, app-media-vault-normal.apk, crew-vault.apk, operator-vault-68843a41.apk, reporter-vault.apk, storage-resume-probe.apk, all inside .cache/offline-session-20261124/. Superseded for current installation; do not delete without owner approval.
- Native generated .cxx/build, other logs, SQLite/journals/media and unrelated untracked files preserved and excluded from commit. No cleanup task undertaken.


## Snapshot refresh checkpoint — base 5209b28, 2026-11-25

- Codex IMPLEMENT_AND_SELF_REVIEW. Append-only snapshot lineage; refresh never replaces historical snapshot or signed package bytes. Pending/foreign-session snapshot, pending signed batch and unresolved online FIELD journal block new preparation. Producers use latest reconciled snapshot; exact journal replay stays immutable.
- Reused unchanged source tests: targeted 48/48; full regression 2182/2182, 0 failures/skips (field-full.log, 165324 ms); npm run typecheck exit 0 (field-tsc.log). Outputs inspected again; no redundant build/full run. git diff --check exit 0.
- Android existing QA debuggable APK, Pixel_6_Pro Android14, emulator-5554, API10.0.2.2:18181. Explicit refresh created journal 11007ab7-0325-4dc2-9452-1fbf4227e330 at 15:51:01. After offline process restart local inspection retained new journal, old snapshot, signed start and enrollment. Startup still requires session verification for role routes: reconnected/retried, then disabled Wi-Fi/data and reopened saved task from Sync; task read latest 15:51:01 snapshot without network. Cold-start operational access without session verification is NOT claimed. Networks restored; emulator left running.
- Independent authenticated Crew GET of both snapshots: old d47be884-5057-405c-80b3-7b86f2540196 version AAAAAAAFJKc= / NewAssigned; new 97af8873-e233-4cf7-b74b-60ee7c188f98 version AAAAAAAFKh8= / InProgress, both HTTP200, same fixture task/assignment/registration. IDs discovered by read-only fixture-scoped SELECT because no snapshot list API; no SQL writes and no runtime SQL discovery introduced. App reconciliation validates POST against own authenticated GET receipt; independent GET evidence is separate from local persistence evidence.
- New content hash 22684a519d16fae04cda587d317a162fb522c84507bfcd7121da729700456a99. Sync after restart 4 saved / 0 pending / 4 reconciled. Reader validates ownership/device/source/lineage before rendering. API host migration preserved actor partition/journals observed here; no journal relocation/deletion/adoption performed.
- Keep .cache/offline-session-20261124/snapshot-refresh-readback.json, snapshot-refresh-restart.png, snapshot-refresh-offline-open.png as QA evidence. Existing APK output/rollback and caches listed above remain; no APK copy created, no artifact deletion. No BE/Web/security gate changes, no push. SOFTWARE emulator evidence does not prove hardware custody.
- FIELD_SUBMISSION with uploads, REPAIR, UI polish and remaining workstreams are not covered by this checkpoint.

## FIELD submission mutual exclusion — base 32b89f3, 2026-11-25

- Codex IMPLEMENT_AND_SELF_REVIEW. Online T05B command creation and signed FIELD_SUBMISSION preparation now check each other in the same exclusive SQLite transaction. Check immutable operations rather than optional UI metadata; retain all historical commands and reject cross-session duplicate preparation. Existing command recovery overlays remain unchanged. Historical online submission roots/revisions are not converted to signed roots.
- Test-first failure: new SQLite test initially failed because writeOnlineFieldSubmissionDraft was absent. After implementation: node --test tests/c10bc-journal.test.cjs tests/t05b.test.cjs tests/crew-field-send-once.test.cjs 75/75 PASS; npx tsc --noEmit exit 0; full regression node --test tests/*.test.cjs 2183/2183 PASS, 146123 ms; git diff --check exit 0. Reused field-targeted.log, field-tsc.log and field-full.log in .cache/offline-session-20261124; no extra report/log family.
- LOGIC_TESTED: actual Node SQLite transaction and both creation orders, including changed session. Android/HTTP for this new exclusion gate NOT_RUN; installed APK unchanged, no build performed. This is a prerequisite checkpoint, not FIELD_SUBMISSION end-to-end acceptance. No UI, BE, upload contract, native security gate or API host changed. No push, data removal or artifact copies.
- Keep existing current QA APK, verified rollback, snapshot/journal/media evidence and updated logs. No newly obsolete build artifact was produced; existing owner-approval-only cleanup candidates remain unchanged.
