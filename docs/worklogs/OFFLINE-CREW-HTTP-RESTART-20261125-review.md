# Crew dedicated HTTP and Android restart evidence

Date: 2026-11-25. Reviewer: Codex. Mode: IMPLEMENT_AND_SELF_REVIEW.
Source: FE `e1e9652`; deployed BE `b891e88` on existing sandbox port 18181.
Scope: authorized synthetic fixture only; no BE/UI source edits.

## HTTP_VERIFIED — software fixture

Evidence scripts and immutable journal: `.cache/offline-session-20261124/`:
`manifest.cjs`, `signed-http.py`, `signed-reconcile.py`, `signed-http-journal.json`.
Do not rerun fixture creation. Authentication credentials/private keys were not
written into the journal. Canonical manifest uses the actual FE protocol module.

- Task `064aa120-8d11-4765-897f-44f30cd089bf`, project
  `72f84201-c001-4000-8000-000000000001`, actor Crew QA.
- Dedicated device registration and snapshot: HTTP success and source readback.
- Signed FIELD_ACCEPT request: HTTP200; server batch
  `f4978fc4-7cdb-4ba4-a85a-c5f16cb03f7a`, source batch
  `58411eb9-aa24-41c7-9741-3723973f2967`.
- Origin `8605714b-02e1-46f7-bccc-4d62e2f030a7`: authenticated GET
  `durableAcknowledgment=true`; task/history readback matched.
- Exact same body/key replay: HTTP200, same server batch, unchanged history,
  exactly one ACCEPTED event. History DTO uses `events`, not `items`.
- This uses a disposable in-memory SOFTWARE fixture key. It does not prove
  hardware custody or the Android production enrollment/send capability.

## ANDROID_E2E_VERIFIED — draft persistence only

Android14, emulator-5554, existing app `com.hoanghai.roadguard`.
Normal source APK built successfully (`normal-current-build.log`), SHA256
`D56B16974CFA400FF7F51446A22BD80D4DA881AA71F3210785BDD16F7070B4DB`.
Installed using `adb install -r`; same Crew session retained.

1. Opened dedicated task, pressed Start in actual UI; task became InProgress.
2. Opened field measurement editor. Recorded then removed only reverse mappings
   `tcp:18181` and `tcp:19101`; app's loopback API/MinIO became unavailable.
   Radios were not disabled, so this is API-disconnection evidence.
3. Entered synthetic measurement 7.58 cm; saved through actual local draft action.
   UI showed saved locally and the same measurement (`crew-offline-saved.png`).
4. Force-stopped/reopened only app. Failed refresh offered read-only local view.
   View showed the same task, 0 photos, 1 measurement, local/not sent
   (`crew-offline-cold-inventory.png`). No role-route permission was bypassed.
5. Restored both exact reverse mappings, returned and pressed Retry. Same Crew
   session/Home returned. Reopened same field dossier: 7.58 cm remained
   (`crew-reconnected-draft.png`). No repeated Start/Accept action was issued.

Missing ADB reverse mappings also explained the earlier session restoration
transport failure. Host health alone cannot prove emulator transport.

## Limits and preservation

No emulator restart, logout, clear, uninstall, pending/media/journal deletion,
source reset or remote push. No existing shared assignment was mutated.
No photo/upload/submit or three-role exactly-once assertion follows from this
draft test. NATIVE_ACCEPTANCE_VERIFIED remains false. 42A authenticated key
discovery and hardware proof remain independent gates.

Previous source gates at e1e9652: typecheck exit0, regression 2104/2104; see
`OFFLINE-SQLCIPHER-RUNTIME-20261125-review.md`. This checkpoint edits evidence
documentation only; `git diff --check` is rerun before commit.
