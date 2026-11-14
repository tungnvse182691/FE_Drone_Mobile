# Crew FIELD submission readback — 2026-11-15

- Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW.
- FE base: ba8dc7319f61a51316bec9b87adb9f4f791abc7c; BE contract/runtime: 85879fe9082774cf5098a9ba281f56b9c651f8ea.
- Scope: field-review.tsx and mounted feedback regression test. No BE source or database changes.
- Contract: API-080 task status/latestSubmissionId; API-095 submission; API-096 immutable readback. Compared pinned FieldInspectionWorkflowDtos.cs and FIELD-MEASUREMENT-AND-INVITATION-PREVIEW.md.

## Fix

After confirmed submission the screen retained the old InProgress task and empty submission panel. Reload the task and latest receipt through the existing identity/sequence-guarded load path after confirmation. Do not infer server status or clear pending commands. Mounted regression failed before the fix and passes after it (4/4).

## ANDROID_E2E_VERIFIED / HTTP_VERIFIED

Environment: emulator-5554, Android 14, Expo Go, Metro 8090, sandbox API localhost:18181, Crew A. Project 72f84201-c001-4000-8000-000000000001. Isolated QA tasks only.

1. Task 837f8fd7-755a-4694-b49e-bcfe191801f8: accept/start, enter depth 3.5 cm, length 1.2 m, width 0.8 m; save/reopen; segment checklist and chainage 50 m; capture BEFORE and MEASUREMENT; upload and submit. API-080 GET 200 Submitted; API-096 GET 200 submission aa0809f8-531a-4379-ad67-9b59b64e4142, READY, all three exact measurement values/units and two evidence items. The initial missing-position message was due to blank chainage; completing chainage satisfied the checklist without changing its rules.
2. Task 16f6fa58-2363-4b68-ac51-2ac8349aeeac: accept/start, UNKNOWN depth with reason, instrument/method, no location proof; camera MEASUREMENT capture; one submit. Observed upload/checking then immediate Submitted/read-only receipt without manual refresh or HMR. API-080 GET 200; API-096 GET 200 submission dda350f4-02b6-4c82-bd88-54aeed838781, INCOMPLETE, LOCATION_UNKNOWN and MEASUREMENT_VALUE_UNKNOWN. Screen shows the saved reason and one evidence image, with measurement editor removed.

Local evidence: .cache/crew-dimensions-readback-20261115.json, .cache/crew-post-submit-readback-20261115.json. Emulator black captures are expected. Emulator GPS is synthetic and was not used as location authority.

## Gates and limits

- npx tsc --noEmit: exit 0.
- node --test tests/crew-field-feedback-state.test.cjs: 4 passed.
- node --test tests/*.test.cjs: 1640 passed, 0 failed/skipped; .cache/crew-post-submit-full-20261115.log.
- git diff --check: clean. Icon/financial-term scan: no runtime app violation; historical mock comments mention prohibited sensor only as a prohibition.
- No wire, navigation, permissions, measurement validation, retry payload or journal semantics changed.
- This verifies the two FIELD scenarios above, not the entire three-role matrix. Cold restart/account isolation and remaining repair/operator flows require separate Android evidence. No new BE API gap established by this checkpoint.
