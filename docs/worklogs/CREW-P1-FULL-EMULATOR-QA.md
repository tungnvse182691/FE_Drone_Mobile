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
