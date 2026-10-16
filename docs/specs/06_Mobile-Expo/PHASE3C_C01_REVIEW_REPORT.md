# Phase 3C-C01 review report

Baseline: `398124bcbe04696c55292864634d08cb14b75229`; scope is Operator/Crew documentation only. No Backend, OpenAPI, DTO, database, test or Phase 4 file was changed.

## Review result

- Operator screens: **8**.
- Crew screens: **11** after separating FIELD review/supplement, repair-attempt correction, repair execution, offline sync and receiving handover.
- Unique API references checked in Operator/Crew package: **54**; all IDs resolve in the Phase 2C catalog. Repeated references were also inspected for actor and workflow context.
- `API-159` correction: it is `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/attempts/supplements`, a Crew repair-attempt supplement. It is no longer described as a generic FIELD supplement.

## Evidence and mapping changes

The mapping review used the Phase 2C catalog/crosswalk plus source controllers named by those entries: `FieldInspectionWorkflowController`, `RepairExecutionController`, `SurveyV2Controller`, `UploadsController` and `OfflineWorkflowController`. The catalog confirms API-092/095/096 for PM review and Crew FIELD submission/read, API-157/158/159 for repair attempt/review/supplement, API-225–236 for Operator task/upload, and API-113–130 for the scoped offline contract. Role is taken from the catalog/source admission; it is not inferred from endpoint names.

Changes in this correction:

1. Added `Operator/README.md` with eight-screen order, API boundary, status labels and Operator offline limitation.
2. Added `Crew/README.md` with eleven-screen order, explicit FIELD vs repair supplement distinction, and Crew-only offline boundary.
3. Split Crew C-07 into FIELD review/supplement and repair-attempt correction; renumbered subsequent rows for clarity.
4. Kept all Expo/native behavior `PROPOSED_EXPO` or `NOT_VERIFIED_EXPO_E2E`; no device test is represented as PASS.

## Open gaps

Native camera/secure storage/SQLCipher or file encryption, durable offline queue and key-loss recovery, real upload verification worker, external storage/deployment, Android/Expo E2E, and reconciliation race coverage remain `NOT_VERIFIED_EXPO_E2E` or `SOURCE_GAP`. P2-06 Fast Track Supervisor notification remains open. API availability does not grant PM/Supervisor approval, repair assignment, or arbitrary replay rights.

## Verification

- API ID/catalog validation: **PASS** (54 unique IDs; 0 missing).
- Documentation link checker: **PASS** after edits; local link failures: 0.
- `git diff --check`: **PASS**.
- Source-reference and scope review: **PASS** for documentation scope.
- Backend/API/SQL tests: **NOT_RUN**.
- Android/Expo/native/E2E tests: **NOT_RUN**.

Phase 5 source-locator correction: the survey controller is `SurveyV2Controller`; the earlier `SurveyTasksController` name did not resolve. Original phase checks remain historical; see the Phase 5 audit for expanded role/method/source checks.
