# Phase 3B review report — Reporter Mobile Expo handoff

**Baseline:** `d5c935bfe00b82ffb9474f222cdc79d329387f39` on `huy-review`.

## Scope and coverage

Created seven canonical Reporter Mobile documents plus this report under `06_Mobile-Expo/Reporter/`. The package covers the required journey: registration/OTP → Android login/refresh → private multipart photo upload → `VERIFIED` polling → Report/IncidentCase intake → own list/detail → supplement → authorized publication updates.

The matrix has 10 screens and references the source-backed Reporter/auth API IDs: **API-002, API-003, API-004, API-005, API-007, API-008, API-010, API-011, API-012, API-018, API-019, API-021, API-208, API-209, API-210, API-211, API-212, API-213, API-214, API-215, API-216, API-217, API-218 and API-219**. API-018/019/021 are linked only as Supervisor/PM downstream boundaries; Reporter does not call them.

## Evidence and gaps

`CURRENT_VERIFIED`: catalog routes/DTO/auth declarations, `AuthController`, `ReporterRegistrationsController`, `ReporterEvidenceController`, `ReportsController`, `AuthService`, `ReporterEvidenceService`, Reporter lifecycle repository and Phase 2A/2B workflows at the Phase 2C source baseline.

`TARGET_CONFIRMED`: Reporter is Mobile React Native + Expo; Reporter report does not require Drone Survey; Supervisor triages unassigned Case; PM decides Candidate/Defect; Reporter sees only own and published projections.

`PROPOSED_EXPO_UI`: navigation, SecureStore adapter, protected queue, camera/location UX and retry orchestration. No Mobile repository or Expo SDK/version was supplied.

Open items carried forward:

- P1-04 Reporter private/publication download post-storage-await authorization revalidation risk remains open; no Backend fix is made here.
- P1-05 external/native/deployment verification remains open.
- Upload verification worker, real MinIO/object storage, SMTP, FCM/push and Android device behavior are not verified.
- SQLite/SQLCipher, encrypted files, key custody and uninstall/reinstall recovery are mobile architecture decisions, not proven by Backend encryption.
- Reporter signed offline enrollment/batches are out of online MVP and not source-confirmed for Reporter.
- No dedicated Reporter “request supplement” or push workflow was invented.

## Checks

- Reporter API ID/route cross-check: **PASS** — 25 IDs and exact matrix routes matched the Phase 2C catalog.
- Reporter actor/bearer consistency: **PASS**; anonymous bootstrap is limited to registration/OTP/login/refresh/recovery, business routes require bearer Reporter ownership.
- Link checker: **PASS**, 58 Markdown files / 6,379 local links / 0 errors.
- `git diff --check`: **PASS**.
- Android/Expo, HTTP/SQL integration, native SecureStore/SQLite, SMTP, storage provider, FCM and deployment tests: **NOT_RUN**.

**Self-review pass 1:** checked every matrix route against the Phase 2C catalog and preserved API-002/003 Android routes, verified gating and ownership boundaries.

**Self-review pass 2:** checked Phase 3A/2A/2B cross-links and removed Crew signed-offline/device-enrollment claims from Reporter scope; no source/API/OpenAPI/tests changed.

**STOP after Phase 3B.** Independent JEV review is required before Phase 3C/4/5.
