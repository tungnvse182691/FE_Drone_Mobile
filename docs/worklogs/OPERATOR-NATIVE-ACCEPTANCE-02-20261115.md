# ROADGUARD-OPERATOR-NATIVE-ACCEPTANCE-02

Date: 2026-11-15. Mode: IMPLEMENT_AND_SELF_REVIEW. Operator only. No independent review attribution. No push.

## Scope and pinned environment

Owner request: `.codex/attachments/800d6dce-1b40-4c7e-9d7b-3616767853bb/Pasted text.txt` on the owner's machine. Continue prior checkpoints; prepare private QA through official APIs, execute Android recovery/error acceptance, fix only proven FE defects. Offline map and global Sync implementation are explicitly excluded.

- FE baseline: `889a896a0aa42bd55b8f0e5130476a2f3f7085a6`.
- Code/checkpoint HEAD before this report: `a42e7b9ee858ce27327c4f21d8de3a2a3e365121`, branch `main`.
- Fetched `origin/main` before report commit: `fb0e379…`; 14 ahead / 0 behind before report commit. The report commit adds one local commit; its SHA is available from `git log -1` and the delivery message. A document cannot contain its own final commit hash.
- BE checkout read-only: `5d20a09a72643b1f7ab87bebeee7d309e593f689`; deployed test baseline `3d61a39`. Source checkout SHA and deployed baseline are separate observations.
- Existing sandbox API port 18181, storage 19101; API/SQL/Mailpit healthy, MinIO running. No Docker/config/source/SQL mutation.
- Android: Pixel 6 Pro, emulator-5554, Expo Go. Metro 8081 and ADB reverse restored for API/bundle access. An earlier alternate Metro opening failed module resolution; reopening 8081 recovered without clearing app data. iPhone/8083 setup was not changed.
- Operator A was left signed in with networking restored and the last private QA dataset success screen open.

## Commits and minimal FE change

| Checkpoint | Commit | Files / result |
|---|---|---|
| Readable upload limits | `a42e7b9` | `app/(drone)/upload.tsx`: replace GiB/MiB copy with approximately 8,6 GB / 10,5 MB; actual byte validation unchanged. Android copy inspected. |
| Acceptance report | This document's commit | This file only. Test artifacts, SQLite and journals remain local and untracked. |

No additional runtime fix was justified by the executed recovery scenarios. Existing recovery/diagnostics implementation was exercised rather than rewritten. This is an acceptance checkpoint with explicit remaining evidence gaps, not a declaration that every Operator feature is finished.

## Private QA preparation — HTTP_VERIFIED

Only three private task fixtures were created through official PM APIs. IDs below are shortened sandbox identifiers; complete allowlisted readbacks are retained locally in `.cache`.

| Fixture | Task | Assignment / use |
|---|---|---|
| Multipart | `6c2fef9e…` | Operator A; scoped work-package and eligible drone reads 200; accepted and submitted on Android. |
| Cancel | `f0af3ced…` | Operator A; acceptance 200; native cancellation and a separate small HTTP cancellation-state probe within this same fixture. |
| Authority | `85a70589…` | Operator A → B → A through official PM reassignment; stale 412 and denied 403; fresh acceptance for the new assignment, then pre-part recovery. |

PM discovery used the existing source task's authorized scope, without modifying that source. Survey plan creation initially returned 422 `survey_validation_failed`, and duplicate planning attempts returned 409 `duplicate_request`. These rejections were journaled, not repeatedly replayed. Valid PERIODIC plan creation returned 201; independent task creation returned 201. Existing valid plan/scope discovery supported the remaining private tasks. No seed script main, SQL or hand-edited server row was used.

Actual API sequence:

| Actor / operation | Actual response |
|---|---|
| PM POST `/api/v1/projects/{projectId}/survey-plans` | 422 invalid initial plan; 409 duplicate plan attempts; valid PERIODIC plan 201 |
| PM POST `/api/v1/projects/{projectId}/survey-tasks` | 201 for each of the three private tasks |
| Operator GET `/api/v1/survey-tasks/{taskId}` | 200 while assigned; 403 `access_forbidden` after reassignment to B |
| Operator GET task `/work-package`, `/eligible-drones` | 200; scope and active eligible device verified |
| PM POST task `/reassign` | 200 for same-actor version refresh, A → B and B → A |
| Operator POST task `/accept` | 200 for fresh accepted assignment; native stale command 412 |
| Operator POST `/api/v1/uploads` (small state probe) | 201 |
| Operator POST upload `/part-urls`; storage PUT (small probe) | 200; 200 |
| Operator POST upload `/complete` (small probe) | 202 |
| Operator POST upload `/cancel` | Native eligible upload 200; eligible VERIFYING and VERIFIED probes both 409 `upload_not_cancellable`; submitted-task VERIFIED upload 403 `access_forbidden` |
| Operator GET `/api/v1/uploads/{id}`, `/api/v1/files/{id}` | 200, upload/file VERIFIED for final successful uploads |
| Operator GET `/api/v1/datasets/{id}` (API-026) | 200 for both submitted private datasets; correct task/device/scope/source links |

The native dataset POST was not independently captured as a raw network status: the app took its successful receipt branch and persisted DATASET_CONFIRMED; the independent official GET 200 proves durable readback. Do not substitute an inferred 201 for an observed HTTP status.

Preparation journal: `.cache/op-native02-journal.json`; discovery: `.cache/op-native02-discovery.json`. The journal correction for `verified-upload-cancel-conflict` records its already observed 403 as REJECTED; no request replay occurred.

## Android acceptance matrix

PASS applies only to the stated scenario and evidence axis. HTTP and logic checks are not Android proof.

| Scenario | Result | Executed evidence / limitation |
|---|---|---|
| A. Large video completes | PASS — ANDROID_E2E_VERIFIED + HTTP_VERIFIED | 51,449,564-byte video, seven parts, native completion, official upload/file GET 200 VERIFIED. |
| B. Network cut during multipart | PASS — ANDROID_E2E_VERIFIED | Wi-Fi/data cut after one 8,388,608-byte part; storage transport failed while API remained reachable. Journal COMPLETE_UNKNOWN / `part_transport_unknown`; BE UPLOADING and file PENDING. This was not an HTTP 403. |
| C. Restart/resume retains upload and completed part | PASS — ANDROID_E2E_VERIFIED | Force-stop/reopen, explicit resume: same uploadId, fileId and command key; first part number/size/ETag identical; seven final parts. No full video retransmission was needed. |
| D. Server verification | PASS — HTTP_VERIFIED | Video and SRT both read back VERIFIED with matching sizes and hashes. |
| E. Submit/read dataset | PASS — ANDROID_E2E_VERIFIED + HTTP_VERIFIED | Native success and API-026 200 for datasets `cab81a00…` and `ccf980ad…`, correct task/device/scope/pairs/submitter. |
| F. Restart with retained draft | PASS — ANDROID_E2E_VERIFIED | File, recording time, selection and draft restored after force-stop. No reinstall/clear-data operation. |
| G. Cancel upload | PASS — ANDROID_E2E_VERIFIED + HTTP_VERIFIED | Native confirmation → API-237 200 → cancelRequest CONFIRMED, `upload_cancelled`, official GET 200 FAILED. Source and local first-part history retained. |
| H. A → B → A account isolation | PASS for ordinary switch — ANDROID_E2E_VERIFIED | B's Sync had no A upload; A returned to its own retained file/draft/parts. Upload intent payloads unchanged across the observed logout/B interval. Timing of an active callback versus logout remains unproven, see below. |
| I. Cold offline cached task/draft | PASS within cached scope — ANDROID_E2E_VERIFIED | Wi-Fi/data off, API reverse removed, force-stop/reopen → cached task → private draft edit/save → second restart → same video/time. Bundle remained available through Metro; this does not prove a standalone offline binary. |
| Cut before first completed part | PASS — ANDROID_E2E_VERIFIED + HTTP_VERIFIED | Authority fixture had zero parts; explicit resume kept upload/file/key, reached seven parts and VERIFIED; then dataset `ccf980ad…` read back 200. |
| Cut after complete, before VERIFIED | PASS for preservation/recovery — ANDROID_E2E_VERIFIED | VERIFY_PENDING snapshot, network cut/restart, online recovery retained upload identity and read server status. |
| VERIFY_PENDING video/SRT presentation | PASS for observed pending intervals — ANDROID_E2E_VERIFIED | Native 100% with waiting-for-server text observed for video and SRT. No claim of continuously recorded frame-by-frame behavior throughout every restart. |
| 403 lost task authority | PASS — ANDROID_E2E_VERIFIED + HTTP_VERIFIED | PM reassigned private authority task to B; A's GET 403, Vietnamese permission message, preserved command. |
| 412 stale task version | PASS — ANDROID_E2E_VERIFIED | Same-A reassignment changed ETag; Android original accept returned 412 and displayed conflict/recovery message. Original frozen command retained, not edited/replayed. |
| 409 cancel while VERIFYING | PASS — HTTP_VERIFIED only | Small upload complete 202, cancel 409 `upload_not_cancellable`, readback VERIFYING then VERIFIED. Native 409 error rendering NOT_RUN; UI hides cancellation in VERIFY_PENDING. |
| 409 cancel while VERIFIED, task still writable | PASS — HTTP_VERIFIED only | Same small private upload, GET 200 VERIFIED → cancel 409 `upload_not_cancellable` → GET 200 VERIFIED. Durable step `cancel-state-while-verified` in QA journal; no new upload/dataset. |
| Cancel VERIFIED after task submission | PASS for observed guard — HTTP_VERIFIED | 403 `access_forbidden`, upload remained VERIFIED. Source checks assignment/write authority before state eligibility; do not report this as a 409 test. |
| Cancel/resume simultaneous lock contention | NOT_RUN on Android | Running modal exposed pause, not simultaneous cancel. Source shares scope/task lock; targeted logic covers exclusion. No forced overlapping native callbacks were injected. |
| Cancel UNKNOWN / dropped response recovery | NOT_RUN on Android | No safe lost-response-only reproduction executed; did not mutate SQLite or replay an UNKNOWN POST to manufacture it. |
| 401 invalid/expired session | BLOCKED | No safe official session invalidation mechanism established for this fixture; token tampering/clock edits were not used. Ordinary logout/login is not a 401 test. |
| Account switch exactly during a live callback | NOT_RUN with proven timing | A pre-part attempt was started, but transport may have failed before logout. Native isolation passed; callback race timing cannot be inferred from that. |

### Evidence index (local, preserved)

- Multipart: `.cache/native02-cut.json`, `operator-remaining-native02-{draft,cut,resume,completion,postcomplete-cut,postcomplete-restart,srt,dataset}.db/json`.
- Native screenshots: `.cache/native02-{cut,verifying,srt-verifying,dataset,cancelled,b-isolation,offline-private,forbidden,units}.png`.
- Final authority success: `.cache/native02-authority-dataset.png`, `.cache/native02-zero-resume-proof.json` (`sameIdentity: true`, 0 → 7 parts, VERIFIED).
- Native cancel: `.cache/native02-cancel-proof.json`, `.cache/native02-cancel-network.txt`, `operator-remaining-native02-cancelled.db/json`.
- Authority errors: `.cache/native02-authority-network.txt`, `operator-remaining-native02-stale.db/json`. The 412 proof is hierarchy/network/journal; no 412 screenshot was captured.
- Offline: `operator-remaining-native02-{offline-saved,offline-restart}.db/json`; private fixture lacked a cached work-package, so the screen correctly reported its absence. No offline map PASS.
- Account switch: `operator-remaining-native02-{before-switch,b,a-restored,prepart-start,active-logout,active-b,zero-restored,zero-resume}.db/json`.
- Final official readbacks: `.cache/native02-final-readback.json`; final SQLite snapshot: `operator-remaining-native02-final.db/json`.

Network debugger lists duplicated observations of some requests. Those rows alone do not establish duplicate dispatch. Journal identity, receipts and readback are the basis for the scoped no-duplicate conclusion: one dataset intent/receipt for each of the two submitted private tasks, distinct intentional task IDs, no accidental second dataset intent for either task. This is not a server-wide dataset inventory claim.

## Upload and dataset identities

| Fixture | Upload / source | Dataset / result |
|---|---|---|
| Multipart | Video upload `eda616e8…`, file `7fe72c09…`; SRT file `fa74b158…` | `cab81a00…`, GET 200, task `6c2fef9e…`, both source pair links match |
| Authority | Video file `0a940b2d…`; zero-part snapshot and final upload/file/key equal | `ccf980ad…`, GET 200, task `85a70589…`, video pair, telemetry null |

Video SHA-256 prefix `6773fee1…`, size 51,449,564; SRT SHA-256 prefix `de48a4e9…`, size 78. Full expected checksums were compared locally. Dataset DTO has no status field: DATASET_CONFIRMED is the local receipt state, not an invented server enum.

The small SRT is synthetic without GPS. Its upload/verification/association succeeded; this does not prove GPS coverage or survey quality. Dataset receipt is not coverage acceptance. The authority video-only pair is permitted by the observed contract and was independently read back; it is not proof of complete telemetry capture.

Before recovery: successful parts retained, transport outcome uncertain, no fabricated file confirmation. After explicit resume: existing parts retained, server verification read, then immutable dataset submission/readback. Frozen payload/key/version identities were not changed to recover from errors. Original stale accept command remains preserved; the later fresh API acceptance belonged to a new PM assignment/version, not a rewritten retry.

## Historical storage 403 — UNDETERMINED

The previous read-only BE/Docker audit is recorded in `OPERATOR-REMAINING-ACCEPTANCE-20261115.md` and `.cache/operator-storage-deep-audit.json`. Current source, signing lifetime, public endpoint, current clock observations and available API/MinIO logs were inspected. Original failing S3 Code/correlation or matching historical audit event was not recovered. Current clocks/configuration cannot establish conditions at the old failure.

No real storage PUT 403 occurred in this controlled QA run. Network cuts produced transport failures. A Windows request to emulator-only host 10.0.2.2 timed out; this is also not a 403. The HTTP state probe subsequently routed to local storage while preserving the signed Host/path/headers; no storage policy, signature, credential or server config was changed.

Commit `7766075` already preserves allowlisted storage diagnostics when an actual failure occurs. No signed URL/token/password/raw storage XML was included in this report. Do not conclude URL expiry or storage permissions from historical status alone. No specific BE code fix is justified by the missing historical evidence. If historical diagnosis is required, storage operators need the original sanitized Code/time/request correlation, or a future naturally occurring private QA failure with the current diagnostics. This is a diagnostic evidence gap, not a demonstrated missing product endpoint.

## Persistence, privacy and Sync

Final read-only inventory `.cache/native02-final-preservation.json`:

- Baseline 153 rows → final 173 rows; missing baseline rows: 0; changed baseline payloads: 0.
- All 16 registered local source files readable, sizes match. Fifteen match the pre-registered SHA-256; one pre-existing source has no checksum, so no prior-hash equality claim is possible for that file.
- No original file, draft, SQLite, journal or untracked artifact deleted. No reset/clean/stash/rebase. Existing UNKNOWN entries were retained rather than silently resolved or replayed.
- B did not see A's upload recovery record; switching back restored A's retained source and journal. Exact active-callback timing remains an explicit evidence gap.
- Offline private draft selection/save/restart passed; current assignment/send authority was not derived from cache. Private work-package absence was rendered as missing cache.
- Sync refresh reads status/list. Explicit recovery dispatch occurs through the guarded upload screen. Global automatic upload orchestration and full offline map remain NOT_DONE outside this task; no general auto-replay was added.

## Quality gates and self-review

Executed on code HEAD `a42e7b9` (no later runtime code changes):

| Gate | Result | Evidence |
|---|---|---|
| TypeScript `tsc --noEmit` | PASS, exit 0 | `.cache/native02-ui-tsc.log` |
| Targeted Operator tests | PASS 62/62 | `.cache/native02-ui-targeted.log` |
| Full Node regression `node --test --test-concurrency=1 tests/*.test.cjs` | PASS 1713/1713, 0 fail; final HEAD rerun exit 0, 298,057 ms | `.cache/native02-full-serial.log`, `.cache/native02-final-head-full.log` |
| Expo Doctor | PASS 20/20 | `.cache/native02-doctor.log` |
| Diff whitespace | PASS | `git diff --check`, repeated before report commit |
| Android | Per-scenario matrix above | No Node test substituted for Android evidence |

Earlier parallel regression/typecheck attempts exhausted memory; serial/direct reruns passed. Do not describe those initial attempts as successful. No dependency change was made in this checkpoint. Source diff self-review: one copy-only line, no changed API, permission, icon, routing, concurrency or byte-limit logic. Report/source changed-file secret checks and explicit staging were performed before commit. Existing local artifacts were not staged.

Full `app`/`src` icon scan found no Ionicons. Financial-term scan matched one explanatory comment in `src/api/mock/field-task-seed.ts`, with no rendered financial UI finding. No unrelated source was edited from these scans.

## Remaining work and BE disposition

| Priority | Status / owner | Next evidence needed |
|---|---|---|
| P1 | BLOCKED native 401 acceptance | Discover an authorized official session invalidation/expiry scenario without token/clock manipulation. |
| P1 | NOT_RUN native callback and cancel/resume races | Controlled overlap with recorded timing and lock outcome; ordinary account isolation and HTTP 409 do not replace it. |
| P1 | NOT_RUN native cancel UNKNOWN readback | Safely lose only cancellation response, retain frozen journal, prove GET-only reconciliation. |
| P2 | Historical 403 UNDETERMINED | Original sanitized storage response/audit correlation; no currently justified BE implementation fix. |
| Outside task | Offline basemap/global Sync NOT_DONE | Separate authorized implementation scope. |

API-226 supplementTaskId: resolved by deployed `3d61a39` and previously verified create → parent readback → child open. It is not a remaining BE blocker. Current DTO contains `SupplementTaskId`; null still does not prove absence of supplement history.

BE cancellation source: `RoadGuardSystem.API/Controllers/UploadsController.cs` and `RoadGuardSystem.Repositories/Implementations/Files/UploadPersistenceService.cs`; authority guard precedes cancellation-state handling. No BE source/contract was changed or fabricated. No newly demonstrated BE contract gap requires a fix from this checkpoint.

Checkpoint closes with the above evidence gaps stated explicitly. Stop here as requested; do not switch roles or implement excluded features. Final report-only commit leaves tracked files clean; pre-existing and new local untracked artifacts remain. Expected final branch count after the single report commit is 15 ahead / 0 behind, subject to the final Git command. **NO PUSH.**
