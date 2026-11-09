# CREW-P1 full emulator QA

Date: 2026-11-09

## Scope and revisions

- FE branch: `codex/operator-scoped-fixes-150228b`
- FE HEAD before final fix: `cb1288e6372647f370147de4d29b9ef592ac7ef1`
- BE: read-only; no BE, Docker, database, or sandbox data changes.
- PRE-PUSH test fix: `tests/t06c.test.cjs` now uses semantic viewfinder state in the harness instead of positional `useState` slots. Business assertions for AFTER, repair claim, attestation, and nullable GPS remain intact.

## Automated evidence

- `npx tsc --noEmit`: PASS
- `node --test tests/t06c.test.cjs`: PASS (64/64)
- `node --test --test-concurrency=2 tests/*.test.cjs`: PASS (1308/1308)
- `npx expo-doctor`: PASS (20/20 checks)
- `npx expo export --platform android`: PASS
- `npx expo export --platform ios`: PASS
- `git diff --check`: PASS
- `git show --check HEAD`: PASS

## Android Emulator evidence

Device `Pixel_6_Pro` / Android 14 / Expo Go was already online and authenticated as Crew. Read-only navigation and inspection covered:

- task detail (InProgress / measure-only fixture): PASS; status, task action, refresh/reconciliation and bottom navigation rendered without crash;
- FIELD review: PASS; Vietnamese labels, measurement inputs, compact refresh action and draft-save action rendered; no mutation button was pressed;
- Home, task list, sync and profile: PASS in the preceding audit pass;
- no crash reported by Metro/device inspection during the audit.

`ANDROID_E2E_VERIFIED`: read-only navigation and rendering only. No capture, upload, submit, ACK, replay, or other state-changing action was executed (`MUTATION_NOT_EXECUTED`). Camera capture/upload completion and Backend VERIFIED readback remain `NOT_VERIFIED` in this run because the test fixture did not provide an approved mutation path.

Receiving navigation was not reachable from the observed home fixture and is recorded as `NOT_VERIFIED`; no workaround or data mutation was attempted.

## Evidence limits

- iPhone visual and native upload E2E: `NOT_VERIFIED`.
- HTTP upload/MinIO and Backend receipt/readback: `NOT_VERIFIED`.
- APK release/native provider verification: `NOT_VERIFIED`.
- No credentials, tokens, private URLs, or personal media were recorded.

## ROADGUARD-CREW-FINAL-FIX follow-up (2026-11-09)

| Screen/state | Issue and fix | Executed evidence | Limit |
|---|---|---|---|
| FIELD old session | Local draft error previously produced a temporary editable draft and hid recovery. Server GET now runs independently; historical draft gets a separate recovery card with explicit new, original replay, or readback action. Corrupt/multiple unresolved data stays blocked. | SQLite backed old-session tests and mounted FIELD tests in `tests/crew-flow-recovery.test.cjs` | Device old-session state not observed in this run. |
| FIELD refresh | Moved refresh to a 40 px header action; empty server state appears only after successful GET. Refresh retains form state and failed GET hides the editor until server verification succeeds. | TypeScript and FIELD targeted tests | Visual device review not available. |
| FIELD evidence | Current draft chip uses Backend PENDING, UPLOADING, VERIFYING, VERIFIED, FAILED; unknown values have a safe fallback. | `tests/crew-field-ux-01.test.cjs` 8/8 | No HTTP upload mutation. |
| Camera | Removed decorative grid and reticle from Crew camera caller. | TypeScript and iOS/Android export | Native capture not executed. |

Automated gates: `npx tsc --noEmit` PASS; targeted FIELD recovery 33/33 and FIELD UX 8/8 PASS; full regression 1315/1315 PASS; `npx expo-doctor` 20/20 PASS; iOS and Android `npx expo export` PASS; `git diff --check` PASS. Metro reported an attached iPhone Expo Go session with no bundle errors or uncaught exceptions. The mobile device tool listed no available local devices, so iPhone visual, camera, storage PUT, complete, Backend VERIFIED, and submit E2E are `NOT_VERIFIED`. No runtime mutation or replay was performed.
