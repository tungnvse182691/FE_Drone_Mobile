# Operator upload progress — 2026-11-15

Codex, IMPLEMENT_AND_SELF_REVIEW. Scope: Operator upload progress UI reported in Screenshot_1794724879.png. FE base 873bc0a; transport status checkpoint b0fa693. BE remote develop 3d61a39, deployed exact source in sandbox API; no BE edits. Branch main, origin/main fb0e379, fetched before commit. Local commits only, no push.

## Actual cause and change

The upload screen reset byte progress to zero and changed its subtitle to uploading on every verification poll. Rendering inferred the stage from Vietnamese text prefixes. Consequently, the progress bar disappeared/reappeared and the subtitle alternated while BE verified the file.

- Keep an explicit UPLOAD / VERIFY presentation phase independent of text.
- Initialize byte progress once per file, outside the verification polling loop.
- Keep completed upload at 100% while waiting for server verification; name video or SRT explicitly. This percentage describes transferred bytes, not verification completion.
- After VERIFIED, clear the upload presentation before dataset preconditions and submission. Cancel/readback start with their own waiting state; scope changes clear presentation.
- Keep existing 20-attempt bounded verification polling, transport, immutable journals, dataset readback and session guards. No new upload, key, DTO, package or mutation is introduced by this UI fix.
- Material reference: https://m2.material.io/components/progress-indicators — determinate progress for measurable transfer, indeterminate waiting when verification progress is unavailable.

## Executed checks

- Red-first behavioral regression failed against the original screen: verification had no retained progress bar. `.cache/operator-progress-red.log`.
- `node --test tests/package6-drone-recovery-ui.test.cjs tests/package6-drone-journal.test.cjs`: **64 passed**, zero failed. `.cache/operator-progress-final-targeted.log`.
- `node --test --test-concurrency=2 tests/*.test.cjs`: **1,698 passed**, zero failed/skipped. `.cache/operator-progress-final-full.log`.
- `npx tsc --noEmit`: exit 0. `.cache/operator-progress-final-typecheck.log`.
- `git diff --check`: clean. Changed source reviewed: MaterialIcons only; no new financial fields, credential/debug logging, token, signed URL, journal deletion or SQLite migration.
- Expo Doctor: NOT_RUN in this continuation; no dependency/native configuration changes.

## Android and HTTP readback

Pixel_6_Pro Android 14, Expo Go, Metro 8094, private Operator A fixture 9cb55c3f…. Continued the retained draft through the real screen after the fix; screen reached “Đã gửi dữ liệu”. Inspected `.cache/operator-cut-dataset-confirmed.png` visually. No overflow on the completion card, readback action or navigation.

| API read | Actual response |
|---|---|
| API-234 GET /api/v1/uploads/{uploadId} | 200, VERIFIED for video 00176e75… and SRT 11778e91… |
| API-029 GET /api/v1/files/{fileId} | 200, VERIFIED, matching size and SHA-256 for dceb9830… / 223d725c… |
| API-026 GET /api/v1/datasets/{datasetId} | 200, dataset 39f41534…, task 9cb55c3f…, submitting actor and both source file IDs match |
| Dataset coverage read | 200, UNKNOWN; dataset receipt does not mean coverage accepted |

Readback evidence: `.cache/operator-cut-server-evidence.json`; durable journal snapshot `.cache/operator-cut-after.json`. Kept exactly the existing active video and SRT upload sessions. The video first part ETag/size/number equals the receipt captured at the network cut, and its seven parts remain. Original media, draft, journal, canceled history and SQLite remain intact. No duplicate dataset intent was generated.

The server had already verified both files by the final resume, so **long VERIFY_PENDING presentation on this final native run is NOT_RUN**. Repeated pending presentation/100% retention is LOGIC_TESTED by the red/green screen regression, not claimed as Android proof. Native completion and actual server readback are separately verified.

## Operator acceptance status, not a full completion claim

| Scenario | Status and evidence |
|---|---|
| A. Large video completes | PASS: 51,449,564-byte video, native completion and API-234/API-029 |
| B. Network / URL failure mid multipart | PASS for controlled network cut after first 8 MiB part; original historical storage 403 observed, exact cause UNKNOWN |
| C. Resume retains parts and upload identity | PASS: same upload/file, first receipt unchanged, seven final parts |
| D. Server confirms VERIFIED | PASS: real upload and metadata reads for video + SRT |
| E. Dataset submitted and read back | PASS for this fixture: native success + API-026 200 matching task/actor/sources |
| F. Close/open with draft | PASS for reconnect/reopen with retained media and recording fields; cold Expo launch without Metro/network is NOT_RUN successfully |
| G. API-237 cancellation | PASS for earlier explicit confirm/cancel/readback and source retention; native UNKNOWN/409 cancellation race NOT_RUN |
| H. Account/session isolation | PASS for ordinary A → B → A UI switch and retained history; mid-transfer concurrent switch NOT_RUN |
| I. Offline task and saved draft | PASS for prior cached task open/edit/save/reopen with API reverse absent; full offline map NOT_DONE |

### Remaining FE acceptance

- P1 / NOT_DONE: full global Sync upload dispatch. Refresh remains explicitly local-only. Explicit recovery opens the task upload screen for guarded resume; UNKNOWN commands are not automatically replayed.
- P1 / NOT_DONE: offline map engine/basemap availability. Cached valid geometry does not prove remote WebView engine or tiles work offline. Cache grants no current assignment/submission authority.
- P1 / NOT_RUN: native injected 401/403/409/412, cancel/resume race, and mid-transfer account change. Logic gates do not replace these scenarios.
- P2 / UNKNOWN: historical storage 403 cause; original XML/error body absent. Do not conclude URL expiry or storage permission from status alone.
- API-226 BE blocker is resolved on deployed 3d61a39 for tested authorized fixture. A fresh API-232 create returned 201 after deployment; parent GET 200 returned its child, child GET 200 matched actor/project, native parent → child → accept succeeded. Evidence `.cache/operator-supplement-3d61a39-fresh-journal.json` and companion script. Null still hides direct navigation without implying no supplementary rounds.

Next checkpoint: remaining Operator offline/Sync and native failure scenarios, preserving all existing commands and evidence. Do not count this UI checkpoint as full Operator acceptance. No push.
