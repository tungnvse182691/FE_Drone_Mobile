# PHASE3C_REVIEW_REPORT

## Scope and baseline

This package documents Operator and Repair Crew Mobile React Native + Expo integration on branch `huy-review`. Backend source/API baseline is the current Phase 2C catalog and the implementation pinned by the repository HEAD at review time. No Mobile repository, Expo lockfile, native build, DJI SDK, device, provider deployment or Expo E2E run was available.

## Deliverables and coverage

- Operator: README, screen/API matrix, video/SRT/GPS multipart upload, task/dataset/error handling.
- Crew: README, screen/API matrix, FIELD measurement, NORMAL/Fast Track execution, offline signed sync/handover, local security/reconciliation.
- Shared: mobile integration acceptance scenarios.

Coverage includes API-078–096 (FIELD), API-104/225–236 (geometry/work package/survey/upload), API-113–130 (offline), API-135–138 (receiving), API-139–161 (repair execution), API-162–176 (policy/coverage/eligibility) and the authentication routes referenced by Phase 2C. API ownership is cross-checked against [09 Consumer API Crosswalk](../04_API-Contracts/09_Consumer-API-Crosswalk.md); no new route or DTO is introduced.

## Authority and boundaries

`TARGET_CONFIRMED`: Supervisor/PM Web; Reporter/Operator/Crew Mobile Expo; Crew measures physical dimensions; AI candidates do not become Defects; NORMAL and Fast Track authority remains separate. `CURRENT_IMPLEMENTED_BE`: Backend controllers/services/repositories and DTO contracts. `PROPOSED_EXPO`: screens, file capture, secure queues and native adapters. `NOT_VERIFIED_EXPO_E2E`: all real device/native behavior. `SOURCE_GAP`: P1-01/P1-02/P1-03/P1-05, P2-06/P2-07 and any missing provider/native deployment evidence.

Operator is not granted offline signed sync. Crew offline operations require device registration, scoped snapshot, canonical signed batch, receipts and current rights. P-256/SPKI/P1363, manifest ordering, hashes and encrypted package formats are copied only from [Phase 2C offline wire](../04_API-Contracts/07_Offline-Sync-and-Crypto-Wire.md); no alternative crypto vector is invented.

## Evidence

Primary sources: `RoadGuardSystem.API/Controllers/SurveyV2Controller.cs`, `FieldInspectionWorkflowController.cs`, `UploadsController.cs`, `OfflineWorkflowController.cs`, `RepairPackagesController.cs`, `RepairSafetyController.cs`; corresponding `RoadGuardSystem.Services` and `RoadGuardSystem.Repositories` implementations; DTOs under `RoadGuardSystem.DTOs`; Phase 2A workflows 05/06/07/08/09; Phase 2B security/storage/offline chapters; Phase 2C contracts and crosswalk.

Backend API tests can establish source/runtime behavior in their lane, but they do not prove Expo rendering, camera permissions, OS key custody, native encrypted storage, background sync, DJI integration or real physical measurement accuracy. Those remain `NOT_VERIFIED_EXPO_E2E` and must be tested on a real build.

## Gaps and review outcome

- P1-01 real FastAPI/provider remains unverified and is outside this handoff.
- P1-02 processing callback attempt fencing, P1-03 candidate matching, P1-05 external/native/deployment verification remain open.
- P2-06 Fast Track Supervisor notification producer remains open; the Crew app must not fabricate it.
- P2-07 localized pre-Defect producer limitation remains open.
- Local encrypted SQLite/files, SecureStore/Keystore interoperability and key-loss recovery need owner/FE architecture decisions.

## Checks

| Check | Result |
|---|---|
| API ID/route/actor crosswalk review | PASS by static comparison to Phase 2C; no invented API |
| Offline canonical wire consistency | PASS by cross-link/source review; native interop NOT_VERIFIED |
| Link/source review | PASS for authored relative links; run repository link checker before commit |
| `git diff --check` | Run before commit |
| Android/Expo E2E | NOT_RUN |
| DJI/native/background sync/SQLCipher/Keystore | NOT_RUN / NOT_VERIFIED |

**Judgment: PARTIAL for integration readiness.** Documentation is complete for the assigned scope; real Expo implementation and device acceptance remain pending.

Phase 5 source-locator correction: the survey controller is `SurveyV2Controller`; the earlier `SurveyTasksController` name did not resolve. Original phase checks remain historical; see the Phase 5 audit for expanded role/method/source checks.
