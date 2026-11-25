# Operator offline Android checkpoint

- Reviewer: Codex; mode IMPLEMENT_AND_SELF_REVIEW.
- FE baseline: `a690a0b`, main. No application source changed in this checkpoint.
- Docker: `roadguard-crew-sandbox-api:develop-b891e88`, healthy.
- Device: emulator-5554 / Pixel 6 Pro / Android 14, installed normal native APK.

## Executed workflow

PM-b created a dedicated synthetic survey fixture by HTTP POST after a durable
PREPARED/UNKNOWN_OUTCOME journal. Operator-b read back the new assignment and
accepted it through the Android UI. Fixture task:
`67f4e63e-ef10-45fc-8114-03aa41eca318`.

On Android, selected RG-DRONE-0001, disabled Wi-Fi/data and removed the API adb
reverse. Selected the synthetic MP4 from Downloads while offline, entered the
recording date/time and saved the draft. App-only force-stop/reopen while still
offline preserved the file (7915 bytes), local key, date/time and task scope in
local recovery. No emulator restart, logout or data deletion was used.

Reenabled networking/reverse, restored the existing session, opened the normal
upload screen and submitted the restored draft. UI showed successful submission.
Used the readback action and reopened the app online. HTTP GET task and GET
`/api/v1/survey-tasks/{taskId}/datasets?limit=100` returned 200, the correct actor,
task status SUBMITTED, exactly one dataset, versionNo 1, integrityStatus PASSED,
nextCursor null. The same single result remained after app restart:
`39c2719d-67de-48ef-ac34-174464c79eef`.

## Evidence

Files under `.cache/offline-session-20261124/` (untracked local QA artifacts):

- `operator-fresh-fixture.py`, `operator-fresh-fixture-journal.json`: dedicated
  fixture preparation; do not rerun the mutation script.
- `operator-fresh-readback.py`, `operator-fresh-readback.json`: repeatable read-only
  HTTP verification of the exact task/dataset above.
- `operator-fresh-offline-saved.png`: offline saved draft.
- `operator-fresh-restart-restored.png`: recovered file/date/time after restart.
- `operator-fresh-submitted.png`: submission result.

ANDROID_E2E_VERIFIED for this offline selection → save → app restart → manual
resume → submission → server readback sequence. HTTP_VERIFIED for fixture creation
and task/dataset reads. Prior source checkpoint passed typecheck and 2118/2118
regression tests; no new source/test result is claimed by this evidence-only commit.
`git diff --check` passed before commit.

## Limits and remaining work

Small synthetic MP4 is not proof of real 4K quality or accepted survey coverage.
No forced mid-chunk network interruption, automatic background resend or duplicate
POST replay was performed. One dataset proves no duplicate in this executed
sequence only. This checkpoint does not migrate plaintext media, complete Crew
signed sync, authenticate 42A peer keys or prove hardware-backed/iOS capabilities.
Original files, drafts and journals remain intact; emulator left open and online.
