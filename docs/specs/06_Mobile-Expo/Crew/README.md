# Repair Crew Mobile handoff

Repair Crew is a Mobile React Native + Expo actor using bearer transport. Crew receives only assigned FIELD inspection and repair work. PM owns planning, assignment, review and policy; Supervisor owns NORMAL approval/final confirmation and the applicable informational boundary; Backend remains authoritative.

## Screens and order

Read [the screen/API matrix](01_Crew-Screen-API-Matrix.md), [FIELD measurement](02_FIELD-Measurement-Workflow.md), [NORMAL and Fast Track execution](03_NORMAL-and-FastTrack-Execution.md), [offline signed sync](04_Offline-Signed-Sync-and-Handover.md), and [local security/reconciliation](05_Local-Security-and-Reconciliation.md). The matrix covers eleven screens: session, FIELD inbox/detail, acceptance, start/measurement, evidence, FIELD review/supplement, repair-attempt correction, repair execution, offline sync and receiving handover.

## Distinct workflows

- **FIELD:** accept/start, capture Crew physical measurements and evidence, submit via API-095, read/reconcile via API-096 and PM review via API-092. A FIELD supplement is not API-159.
- **Repair:** execute the assigned NORMAL/Fast Track item with API-146/157/160/161 and request review through API-150. PM review is API-158. `API-159` is only the repair-attempt supplement route and requires the repair package/item/task binding, current versions and assigned Crew.
- **Offline:** API-116/118/127/129/130 and handover APIs are available only where Backend admits the current Crew/device/scope. Operator and Reporter are not granted this signed workflow by sharing the Expo platform.

## Status and gaps

Backend routes, DTOs and role/resource guards are `CURRENT_IMPLEMENTED_BE` by source/catalog inspection. Expo screens, camera/native secure storage, SQLCipher/file encryption, signed-key custody and device E2E are `PROPOSED_EXPO` / `NOT_VERIFIED_EXPO_E2E`. Key loss, upload verification, reconciliation races, Fast Track notification (P2-06), and external/native deployment evidence remain open.

See the [Phase 2C catalog](../../04_API-Contracts/02_Full-API-Catalog.md), [consumer crosswalk](../../04_API-Contracts/09_Consumer-API-Crosswalk.md), and [mobile acceptance scenarios](../07_Mobile-Integration-Acceptance.md).
