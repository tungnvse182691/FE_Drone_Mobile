# Operator local task detail and draft — 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW. Baseline FE b660231; BE remote develop 85879fe9082774cf5098a9ba281f56b9c651f8ea.

## Scope

- Open a downloaded Operator task from the isolated cold-start local surface.
- Display the exact session's API-225 cached work summary (segment count, deadline, access coordinates).
- Read/edit/save recordedAt and existing SRT timeOffset with the existing account/environment/task draft storage. Preserve selected file keys.
- SecureStore identity is required; session/account/environment changes invalidate the capability. No authenticated route, token, HTTP dispatcher or mutation authority is restored locally.
- Back navigation warns before discarding unsaved changes; repeated save taps are locked. Late session changes do not announce success.

Authority: current Operator 03_Task-Dataset-and-Error-Handling.md requires protected upload/command recovery after network loss; it does not grant Operator Crew signed batches. This checkpoint adds local editing only.

## Executed evidence

- LOGIC_TESTED: `node --test tests/*.test.cjs`, 1674/1674, 66680.681 ms, `.cache/operator-local-final-regression.log`.
- `npx tsc --noEmit`: exit 0. `git diff --check`: no whitespace errors. Changed source scan found no Ionicons, secret logging, passwords, Bearer strings or monetary UI.
- ANDROID_E2E_VERIFIED: Pixel_6_Pro, Android 14, Expo Go, Metro 8090. Disabled WiFi/data and temporarily stopped only sandbox API container to prevent adb localhost from providing a false online result. Cold start showed session recovery; opened local task 9cb55c3f-184c-4483-a6da-a97464645367 and read its downloaded API-225 summary. Edited recordedAt to QA value `2026-11-15 08:30`; back warned before discarding; cancelled warning and saved. Force-stopped/reopened app with API still stopped; opened the same task and observed the saved value. No API mutation, replay or database modification was used for this scenario.
- Restored API container and device WiFi/data after the offline scenario.

## Limits

This is not acceptance of complete offline Operator operation: cold local file picking/map rendering and the interrupted multipart/resume scenario are separate evidence gates. The local view explicitly requires restored session/current assignment before sending. Existing authenticated upload logic and BE code are unchanged.
