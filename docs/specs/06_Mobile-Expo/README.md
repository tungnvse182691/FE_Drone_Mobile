# Mobile Expo — Operator and Crew integration

Phase 3C canonical handoff for React Native + Expo clients. Supervisor and PM remain Web; Reporter, Drone Operator and Repair Crew are Mobile Expo actors. This package maps current Backend contracts to mobile responsibilities. It does not claim an Expo repository, native build, device E2E, DJI SDK, background sync, SQLCipher or Keystore implementation.

## Reading order

1. [Operator screen/API matrix](Operator/01_Operator-Screen-API-Matrix.md)
2. [Operator survey upload](Operator/02_Survey-Video-SRT-and-Upload.md)
3. [Operator task errors](Operator/03_Task-Dataset-and-Error-Handling.md)
4. [Crew screen/API matrix](Crew/01_Crew-Screen-API-Matrix.md)
5. [FIELD measurement](Crew/02_FIELD-Measurement-Workflow.md)
6. [NORMAL/Fast Track execution](Crew/03_NORMAL-and-FastTrack-Execution.md)
7. [Offline signed sync](Crew/04_Offline-Signed-Sync-and-Handover.md)
8. [Local security/reconciliation](Crew/05_Local-Security-and-Reconciliation.md)
9. [Acceptance scenarios](07_Mobile-Integration-Acceptance.md)

## Status vocabulary

`CURRENT_IMPLEMENTED_BE` means source/controller/service/DTO evidence exists. `TARGET_CONFIRMED` means owner product behavior. `PROPOSED_EXPO` describes client work required to consume the contract. `NOT_VERIFIED_EXPO_E2E` means no real Expo/device test was supplied. `SOURCE_GAP` is a Backend or integration limitation already recorded in Phase 0–2C.

The exact route and DTO contract remains [Phase 2C Full API Catalog](../04_API-Contracts/02_Full-API-Catalog.md) and [consumer crosswalk](../04_API-Contracts/09_Consumer-API-Crosswalk.md). Mobile must not infer authority from a visible button or from an eligibility preview.
