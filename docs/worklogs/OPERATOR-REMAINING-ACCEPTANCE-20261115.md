# Operator remaining acceptance — 2026-11-15

Codex / IMPLEMENT_AND_SELF_REVIEW. Task: ROADGUARD-OPERATOR-REMAINING-ACCEPTANCE-01. Operator only. No BE, SQL, Docker, MinIO, fixture, dependency, native configuration or media edits. No push.

## Git and checkpoints

- Before/after HEAD: `af761d37cc8cadcc7a617b5694e35c4b0e972bf0`, branch `main`.
- Fetched origin; origin/main `fb0e379f577f96826cef79d9097ceeca3c33395f`; ahead 8 / behind 0.
- New commits: **none**. Expo Doctor failed one dependency compatibility check. Owner forbids commits with failed quality gates; source changes remain reviewable, unstaged. Package upgrades require separate authorization under project rules.
- No reset, clean, stash, rebase, storage clearing or push. Existing untracked files preserved.

| Existing checkpoint (not repeated) | Full local SHA |
|---|---|
| Multipart recovery | 39eb32d1273728aa31ff617ad09e14c980b5b6f7 |
| API-237 confirmation/readback | 7910da8f19b3d2e0f44263222e1858de7782b83c |
| Sync recovery inventory | 099043f179c534fcd61f9ac9965d5351ff69c789 |
| Offline retained file selection | 1a8aa1be5f5a903fd6f2a7e42b984780c3b2a1a2 |
| Compact cached task/draft UI | 604acd20903d7c63bcae60e32d2d16aee910b1df |
| Supplement readback | 873bc0ad2e730894f5d60e5561fb493d6230c12b |
| Interrupted transfer presentation | b0fa693ab3bd20a61f287d1e744483cd8af947f6 |
| Stable verification progress | af761d37cc8cadcc7a617b5694e35c4b0e972bf0 |

New checkpoint pending commit: `src/api/droneDatasetWorkflow.ts`, `app/(drone)/upload.tsx`, `tests/master-drone-contract.test.cjs` — UNKNOWN cancel reconciliation. Additional independent acceptance tests in `tests/package6-drone-journal.test.cjs`. This report is untracked until gates permit committing. Existing checkpoint file lists are available via `git show --stat <SHA>` and their individual worklogs.

## Actual defect and minimal fix

The button labelled “Đối soát hủy” previously called API-237 POST again before reading API-234. Four new cases failed against that behavior (UPLOADING / FAILED / VERIFYING / VERIFIED).

UNKNOWN now performs GET only. It preserves the original command timestamp, key, parts and source files. VERIFYING/VERIFIED rejects cancellation and moves recovery to verification; it never claims the file was cancelled. FAILED alone remains UNKNOWN because current `UploadSessionResponseDto` does not expose cancellation reason. The dialog now explicitly describes a read, without a destructive action label. Initial explicit cancellation keeps its confirmation and receipt/readback requirements.

Contract checked in BE UploadPersistenceService.CancelAsync and UploadSessionResponseDto: API-237 is replayable for cancelled uploads, but GET does not distinguish cancellation from another failure. This task forbids automatic UNKNOWN replay. Resolving UNKNOWN+FAILED fully therefore remains NOT_DONE; do not silently create a replacement upload. A separately designed explicit retry or richer authorized readback would be needed. No BE contract was invented.

Historical storage 403 root cause: **UNKNOWN**. The original storage error body is absent. HTTP 403 alone does not prove URL expiry, permission failure or signature mismatch. The safe recovery retains confirmed parts and consults the same server session before renewing part URLs. No signed URL or token was added to logs.

## Executed quality gates — phase 7

| Command | Result | Evidence |
|---|---|---|
| `npx tsc --noEmit` | PASS, exit 0 | `.cache/operator-remaining-typecheck.log` |
| `node --test tests/master-drone-contract.test.cjs tests/package6-drone-journal.test.cjs tests/package6-drone-recovery-ui.test.cjs tests/package6-drone-dataset-replay.test.cjs tests/operator-map.test.cjs tests/operator-local-detail.test.cjs` | PASS, 105/105 | `.cache/operator-remaining-targeted.log` |
| `node --test tests/*.test.cjs` | PASS, 1709/1709, zero failed/skipped | `.cache/operator-remaining-full.log` |
| `git diff --check` | PASS | Executed after source edits |
| `npx --no-install expo-doctor` | FAIL, 19/20 checks | `.cache/operator-remaining-doctor.log` |

Doctor actual/expected: expo 58.0.24/~58.0.25; expo-location 58.0.21/~58.0.22; expo-sqlite 58.0.16/~58.0.17. package.json and lockfile unchanged. No suppression or upgrade performed.

Self-review: changed source adds no icons, financial presentation, route changes, roles, defect codes, wire shapes, logging, secret literals, storage deletion or schema migration. Whole app/src Ionicons search had no matches. Diff reviewed for immutable replay and scope guards. No independent reviewer claimed.

## Android and HTTP environment

Pixel_6_Pro / emulator-5554 / Android 14 / Expo Go / Metro 8094. Operator A remained authenticated. BE baseline develop `3d61a39232a05a1835c6f1ac8c52c70c54201a7e`; local BE merge HEAD `5d20a09a72643b1f7ab87bebeee7d309e593f689`. No redeployment in this task.

Fresh authorized reads reconfirmed:

| API | Actual status and validation |
|---|---|
| API-234 GET uploads/{id}, video + SRT | 200, VERIFIED |
| API-029 GET files/{id}, video + SRT | 200, VERIFIED, size/checksum match |
| API-026 GET datasets/{id} | 200, task/actor/source file IDs match |
| GET datasets/{id}/coverage | 200, UNKNOWN; not coverage acceptance |

Masked identities: task `9cb55c3f…`; video upload `00176e75…`, file `dceb9830…`; SRT upload `11778e91…`, file `223d725c…`; dataset `39f41534…`. Video 51,449,564 bytes; SRT 78 bytes. Detailed sandbox readbacks remain in `.cache/operator-cut-server-evidence.json`, without auth headers or signed URLs.

Native readback action on the retained submission displayed “Đã gửi dữ liệu” and explains coverage separately. Existing evidence `.cache/operator-cut-dataset-confirmed.png`. No new dataset mutation was made in this continuation.

## Acceptance matrix — phases 1–6

PASS in this table always specifies native or harness scope. Previous executed evidence is explicitly retained rather than counted as a new run.

| Phase / scenario | Native status | Evidence / limit |
|---|---|---|
| 1: large video transfer and completion | PASS (prior run, fresh BE reads) | Dataset completion screen and API-234/029/026 |
| 1: prolonged video VERIFY_PENDING holds 100% | NOT_RUN / NOT_VERIFIED | Server had already verified; screen harness verifies repeated pending presentation |
| 1: SRT pending and restart while pending | NOT_RUN / NOT_VERIFIED | New isolated workflow tests for video + TELEMETRY recreate workflow and read same session without writes; not Android proof |
| 2: network cut after first part, reopen/resume | PASS (prior run, fresh journal comparison) | Same upload/file, first part number/size/ETag retained, seven final parts; `.cache/operator-remaining-parts-proof.json` |
| 2: before first part / during complete / while verification pending | BLOCKED for new native fault injection | No accepted private QA task found in the audited ten-task manifest. Other accepted tasks were not authorized private fixtures. No shared fixture mutated |
| 2: file VERIFIED and dataset readback | PASS | Fresh HTTP reads above; not inferred from local ACK |
| 3: native 401 | BLOCKED | No safe disposable active-upload session scenario; no live token/session corruption |
| 3: native API/storage 403 | BLOCKED for controlled rerun | Historical storage 403 exists; exact cause unknown. Other private task reads returned 403; this does not prove upload error handling |
| 3: native 409 / 412 | BLOCKED | No authorized active writable QA scenario to force conflicting commands safely |
| 3: isolated 401/403/409/412 handling | PASS, LOGIC_TESTED only | New part failures preserve IDs/key/confirmed parts; existing dataset immutable replay tests pass |
| 4: ordinary account A → B → A | PASS (prior run) | Account isolation worklog evidence retained; not rerun mid-upload |
| 4: native mid-upload account switch | BLOCKED | Same writable private fixture limitation; session bounce workflow tests are logic evidence only |
| 4: explicit API-237 cancel, confirm and readback | PASS (prior run) | Existing cancellation worklog; source retained |
| 4: native cancel/resume race / UNKNOWN reconciliation fix | NOT_RUN | No suitable pending private upload; harness tests overlapping cancel lock + four UNKNOWN states pass. Existing upload/cancel uses shared activeUploads lock |
| 5: Sync refresh/inventory/navigation | PASS for fresh read-only inspection | Displays local refresh, retained verified orphan and task navigation; one orphan is not assumed duplicate or deleted |
| 5: Sync automatic dispatch | NOT_DONE, not enabled | Explicit recovery navigates to task upload, which validates current session, assignment, source and journal. UNKNOWN is not automatically replayed |
| 6: cached task/draft/media selection/save/reopen | PASS (prior native run), fresh persistence proof | Existing offline draft evidence plus unchanged SQLite/media below |
| 6: offline map geometry | PASS for warm loaded WebView reload | Disabled WiFi/data, reloaded MapLibre; selected cached segment line remains |
| 6: complete offline basemap / cold engine load | FAIL / NOT_DONE | Basemap missing after offline reload; screenshot `.cache/operator-remaining-offline-map.png`. Cold launch NOT_RUN successfully; Expo Go/Metro limitation is separate |
| 6: reconnect | PASS for restored connectivity | WiFi/data restored; no upload dispatched, no cached assignment promoted to mutation authority |

The ten-task private manifest contains submitted/supplement-required/reassigned/new tasks and denied reads; none accepted/in-progress. This is BE_FIXTURE_BLOCKED for additional destructive/error native tests, **not proof of a missing API**. Latest task forbids fixture edits or creating replacement data.

## Offline / Sync conclusions

Operator documentation says resume protected upload/command queues when online, and explicitly does not assign Operator signed sync. API-130 is not an Operator dispatcher. The screen honestly distinguishes local inventory refresh from server readback and actual foreground upload. No need to invent signed sync. A global scheduler has not been designed/accepted here; explicit guarded recovery is the current path.

Cached geometry differs from cached basemap/style/engine. The WebView uses remote JS/CSS and raster resources. Warm offline reload can draw the selected line with no usable basemap. No new engine/provider or bulk download was introduced. A possible future design is bounded, licensed offline resources with verified checksums and MapLibre `addProtocol` serving local resources, plus bundled runtime/styles. This requires an approved resource/package design and cold-start native tests; it is not implemented by caching API geometry.

Primary research: https://maplibre.org/maplibre-gl-js/docs/API/functions/addProtocol/ and https://github.com/maplibre/maplibre-gl-js/discussions/6910 . These describe custom loading/caching; they do not prove current app offline support.

## Preservation

Fresh root read-only snapshots: `.cache/operator-remaining-before.db` and `operator-remaining-final.db`. 153 local_draft rows before and after; zero missing rows and zero payload changes. All 12 local source files readable and match recorded byte counts; all 11 with stored SHA-256 match. One retained LOCAL_UNHASHED source has no persisted checksum and is not called checksum-verified. Evidence `.cache/operator-remaining-preservation.json`.

The initial helper read URI paths without URL decoding and measured shell error output; corrected to URL-decode the file URI and re-ran. The successful check above is the actual final evidence, not the first helper output. No production change or deletion resulted.

## Outstanding / phase 8 conclusion

- P1 FE: complete cold offline map resources remain NOT_DONE; engine and basemap not guaranteed.
- P1 FE acceptance: prolonged pending, error injection, mid-upload account switch and native race remain BLOCKED/NOT_RUN; Node tests do not replace native acceptance.
- P1 cancellation recovery: UNKNOWN+FAILED cannot be concluded cancelled from current GET; safe reconciliation preserves it. Explicit separately authorized retry UX remains NOT_DONE.
- P2 FE environment gate: Expo Doctor dependency mismatch prevents local commits under owner instruction. No package changes authorized/performed.
- P2 evidence: historical storage 403 root cause unknown without original response.
- BE API-226 supplement link issue: resolved by 3d61a39 and prior authorized create/read/native test. No repeat BE fix request for this issue.
- Optional BE readback improvement: expose an authorized cancellation reason to distinguish UNKNOWN+FAILED without replay. Existing API-237 can replay cancelled requests; this is not described as missing cancellation API.
- Next permitted checkpoint: resolve dependency gate with owner-approved package scope; then commit UNKNOWN cancellation fix and acceptance-only tests separately. A separately authorized private accepted QA upload is required for remaining native fault scenarios.

Final state: four modified source/test files plus this untracked report; no staging, no new commit and **no push**. Operator acceptance is partial, not full PASS. No role switch or broader feature work.

## Continuation: storage 403 investigation and diagnostic preservation

This section supersedes the earlier final-state counts only. Owner authorized continuing FE investigation and preparing private QA through existing PM APIs. No new fixture or upload was created in this continuation; no backend source/configuration/data changed.

### Confirmed facts and limits

- FE baseline `af761d37cc8cadcc7a617b5694e35c4b0e972bf0`, branch main. Existing WIP retained.
- Read BE `UploadService.GetPartUrlsAsync` and `MinioUploadObjectStorage.PresignPartsAsync` on deployed develop source `3d61a39`: service bounds URL expiry by session expiry, storage SDK signs PUT for each part. Source config validation uses 15-minute URLs, 24-hour sessions and 8 MiB parts; this is source evidence, not proof of the old failing URL's actual age.
- Confirmed FE diagnostic defect: `putDroneStorageBytes` previously discarded storage response body, retaining only HTTP status. Historical XML error code cannot be reconstructed from that journal.
- Read-only `docker logs --timestamps --since 72h` inspection at 2026-11-15 08:10:29 UTC succeeded for storage and API containers. Available output had 38 and 13 lines respectively; no allowlisted storage error-code occurrence and no matching historical upload ID. Counts only persisted in `.cache/operator-storage-log-audit.json`; raw logs not copied, printed or saved. This limited search does not prove older/external audit logs never existed.
- Fresh authenticated API readback of the original 49.1 MiB video succeeded: upload GET 200 VERIFIED, file metadata GET 200 VERIFIED, dataset GET 200 matches actor/task/source file, coverage GET 200 UNKNOWN. IDs masked here: upload `37e01557…`, file `0980c9c5…`, dataset `e50b0b34…`, task `4a230453…`. Local sandbox mapping and exact checks remain in `.cache/operator-video-server-evidence.json`. VERIFIED is not a coverage PASS.
- Prior controlled interruption/resume proof remains separate: retained first-part size/ETag and same upload/file, seven final parts. It does not establish the root cause of the historical 403 after four parts.

**Root cause of the historical HTTP 403: UNDETERMINED.** Current evidence establishes a FE diagnostics loss, not a proven expiry, signing or storage-policy defect. Successfully retrying does not prove expiration.

### FE changes

- `src/api/droneStorageTransfer.ts`: inspect error stream transiently, bounded to 8192 bytes and 32 reads; allowlist S3 Code only. Unknown/malformed/oversized/unreadable response produces UNKNOWN while preserving original HTTP status. Cancel/release diagnostic reader on exit. No XML Message/Resource, token, signed URL, credentials or raw body retained/logged.
- `src/api/droneTaskJournal.ts`: optional `error.storageCode` is backward compatible JSON metadata; no SQLite DDL or existing data edits.
- `src/api/droneDatasetWorkflow.ts`: persist only allowlisted storage code with transport error; do not change frozen command/body/key, upload/file IDs, confirmed parts, completion semantics, or automatic retry behavior.
- Tests cover accepted/unknown/malformed/duplicate/oversized/read-failed diagnostics, privacy, original HTTP status, and unchanged upload identity/part receipts. Deliberately unsafe custom transport diagnostic values are reduced to UNKNOWN.
- No new UI copy, component, provider, dependency or native configuration introduced.

Primary reference: [AWS presigned URL troubleshooting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) documents distinct permission, signature and credential problems. Used to define diagnostic distinctions, not to infer which occurred in this sandbox.

### Precise handoff to BE / storage owner

Please investigate the historical multipart PUT HTTP 403 for sandbox video 51,449,564 bytes (upload `37e01557…`, task `4a230453…`; exact local mapping above). Session remained UPLOADING during recovery and ultimately became VERIFIED. Available FE journal lacks the original S3 XML Code; current container logs do not supply it.

1. Check retained MinIO/access/proxy audit logs for that multipart attempt, particularly the failed request after four acknowledged parts. Return sanitized S3 error Code and UTC timestamp/request correlation, not signed URL or credentials.
2. Compare signing time/expiry and API/storage clock at that request; verify PUT method, signed host/path/query through the Android public endpoint/proxy, signed headers and signing credential/bucket policy. These are investigation branches, not asserted faults.
3. If original access logs are absent, enable bounded, redacted storage/proxy request diagnostics for a private QA reproduction: UTC time, method, HTTP status, S3 error Code, safe request correlation and part number, with restricted server-side mapping to multipart session. Do not log URL query signatures, authorization or secret keys. No new product API is requested merely to create test tasks.
4. Report the evidenced cause and apply the corresponding storage/signing/configuration fix if found. FE now preserves allowlisted code for future failures; new controlled failures cannot prove the historical cause.

This is a **diagnostic escalation**, not a claim that BE must add an upload API or that the video is still unsent. API-226 supplement readback remains resolved; do not reopen that issue.

### Executed gates and Android status for this continuation

- Red tests: three new storage diagnostics cases failed before implementation; journal diagnostics case failed before persistence change.
- `node --test tests/operator-storage-transfer.test.cjs tests/package6-drone-journal.test.cjs tests/master-drone-contract.test.cjs`: **62/62 PASS**, `.cache/operator-storage-diagnostics-targeted.log`.
- `npx tsc --noEmit`: exit 0, `.cache/operator-storage-diagnostics-typecheck.log`.
- `node --test tests/*.test.cjs`: **1713/1713 PASS**, `.cache/operator-storage-diagnostics-full.log`.
- `git diff --check`: exit 0; CRLF normalization notices only.
- Existing Expo Doctor run remains FAIL 19/20 due to three Expo patch mismatches. Owner approval requested for those three updates; no dependency changed. No local commit while this required gate fails.
- Android emulator online and Expo Operator home visually inspected. Mobile UI dump failed; screenshot and ADB foreground/size inspection succeeded. No logout, reinstall, data clear or media/journal deletion.
- **New storage-code extraction on a real failing Android PUT: NOT_RUN.** Node tests above do not replace this proof. Historical original-code recovery: BLOCKED by missing original response/access evidence.
- Offline map basemap remains NOT_DONE; cached geometry proof does not imply full offline map. Existing PM APIs remain the intended private-QA preparation path, not a BE missing-API claim.

Continuation final state: seven tracked source/test files modified, report untracked, other untracked data preserved. No staging, no new commit, no push. Await approved dependency-gate repair before atomic commits; continue private Android failure acceptance without treating old 403 cause as solved.


## Owner follow-up: local investigation and approved Expo patches

This section supersedes earlier dependency-gate and uncommitted-state statements. Mode IMPLEMENT_AND_SELF_REVIEW; no independent reviewer attribution. Owner explicitly approved only expo 58.0.25, expo-location 58.0.22 and expo-sqlite 58.0.17. Updated those three dependencies and matching lock entries only. No new package/provider/native configuration. Existing SQLite, media and journals retained.

### Executed local BE/Docker investigation

- Read-only config and timeline audit: `.cache/operator-storage-deep-audit.py` / JSON. API and MinIO running; public signing endpoint matches Android endpoint. Current API/storage Date differences from host were approximately -1.61/-0.74 seconds. Current clocks cannot establish clocks at the historical failure.
- Source flow: UploadService bounds part URL lifetime by session expiry; MinioUploadObjectStorage signs public-host PUT URLs using AWS SDK. FE sends that URL unchanged without API Bearer credentials. Source inspection cannot recover the original failing signature.
- No enabled MINIO_AUDIT environment settings found; this is a limited configuration observation, not a claim that every possible audit sink was inspected. Docker storage log driver is local. No matching S3 error code or historical upload ID in the available 72-hour API/storage logs; repeated read-only check at 2026-11-15T08:52:28Z.
- Five local historical SQLite snapshots already show the original upload VERIFIED with seven parts and no preserved error. The recorded URL admission expires after the final successful update; this does not identify the earlier failing URL or prove its expiry.
- Differences between API credential environment entries and MinIO root entries do NOT establish invalid effective credentials: separate app credentials/configuration providers may be valid. No credential material printed or retained in this report.
- Fresh original-file readback repeated: GET upload 200 VERIFIED; GET file metadata 200 VERIFIED, size 51,449,564 bytes and checksum match; GET dataset 200, actor/task/source file match; GET coverage 200 UNKNOWN. Coverage is not accepted as PASS.
- Historical storage403 root cause remains UNDETERMINED because the original response and matching access/audit event were not recovered. The confirmed FE diagnostics-loss defect is fixed in 7766075. No BE product API deficiency or expiry/permission root cause is asserted. A future controlled failure validates diagnostics, not the cause of the old event.

### Gates after approved patches

| Gate | Executed result | Evidence |
|---|---|---|
| TypeScript | PASS, exit 0 | .cache/operator-expo-patch-typecheck.log |
| Targeted Operator | PASS 62/62 | .cache/operator-approved-patch-targeted.log |
| Full regression | PASS 1713/1713 | .cache/operator-expo-patch-full.log |
| Expo Doctor | PASS 20/20 | .cache/operator-expo-patch-doctor.log |
| git diff --check | PASS | executed before each checkpoint |
| Android restart/home/SQLite inventory smoke | PASS in Expo Go | .cache/operator-approved-patches-sync.png and mobile hierarchy |
| Real Android failing PUT with new diagnostic reader | NOT_RUN | no new upload or fault injected in this follow-up |
| Native binary rebuild for patched providers | NOT_RUN | Expo Go smoke does not prove rebuilt provider versions |

After installation Metro retained a stale resolution map and displayed module-resolution errors. Restarted this task's Metro with --clear (bundler cache only), reopened Expo Go without removing app data. Android bundle compiled; Operator home retained login and loaded 47 tasks. Opened Sync: retained 15 upload-history entries, eight request-history entries and one outstanding upload record. No upload/cancel/replay was dispatched. No SQLite/media/draft deletion or migration was performed.

### Atomic local checkpoints

| Checkpoint | Commit | Files |
|---|---|---|
| Approved patches | 29bb31f | package.json, package-lock.json |
| Read-only UNKNOWN cancellation reconciliation | 9df25ff | app/(drone)/upload.tsx, src/api/droneDatasetWorkflow.ts, tests/master-drone-contract.test.cjs |
| Bounded allowlisted storage diagnostics | 7766075 | src/api/droneStorageTransfer.ts, src/api/droneTaskJournal.ts, src/api/droneDatasetWorkflow.ts, tests/operator-storage-transfer.test.cjs, tests/package6-drone-journal.test.cjs |
| Restart/HTTP identity regression tests | 8c1f08b | tests/package6-drone-journal.test.cjs |

Before: main af761d37cc8cadcc7a617b5694e35c4b0e972bf0, 8 ahead/0 behind origin/main fb0e379f577f96826cef79d9097ceeca3c33395f. Remote fetched in this follow-up. Four implementation/test commits above bring main to 12 ahead before this documentation checkpoint. No push.

### Remaining limits / next acceptance checkpoint

- P1 FE: full cold offline map resources remain NOT_DONE; geometry cache is not basemap cache.
- P1 acceptance: native cancel UNKNOWN/409/race, prolonged VERIFY_PENDING, transport 401/403/409/412 and mid-upload account/session faults remain NOT_RUN/BLOCKED as detailed above. Their Node tests are LOGIC_TESTED only. API-237 UI is connected and preserves source files; uncertain FAILED readback is not called confirmed cancellation.
- Sync refresh reads local inventory; it is not a global upload dispatcher. Opening a scoped recovery workflow remains required. UNKNOWN commands are not automatically replayed.
- Historical video VERIFIED/dataset readback is HTTP_VERIFIED; current Android smoke does not replace the earlier video-upload scenario evidence.
- BE API-226 supplementTaskId issue resolved by 3d61a39, not a remaining blocker.
- Optional storage-owner follow-up if historical audit exists elsewhere: retrieve sanitized failed-request Code/time/correlation. If no historical record exists, redacted audit instrumentation and a private QA reproduction are needed. No BE source/config/data mutation was performed here.
- Full Operator acceptance remains partial. Next checkpoint is private QA native fault/cancellation acceptance, with session/file/journal preservation and explicit per-scenario evidence. No role switch.

Final intent: preserve all pre-existing untracked artifacts, SQLite and media. Only explicit checkpoint paths staged. No reset/clean/stash/rebase and no push.
