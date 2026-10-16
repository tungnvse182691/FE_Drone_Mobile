# Operator Mobile handoff

Drone Operator is a Mobile React Native + Expo actor using bearer transport. PM creates and assigns survey work on Web; Operator reads the current assignment, accepts or declines it, uploads survey video and telemetry, and submits the dataset. Supervisor/PM approval, processing decisions, candidate decisions and repair authority stay in Backend/Web boundaries.

## Screens and order

Read [the screen/API matrix](01_Operator-Screen-API-Matrix.md), then [survey video/SRT upload](02_Survey-Video-SRT-and-Upload.md), and finally [task, dataset and error handling](03_Task-Dataset-and-Error-Handling.md). The matrix covers eight screens: session, work list, task detail, decline/supplement, work package, capture/upload, dataset submission and recovery/history.

## API boundary

The documented Operator APIs are API-225/226/227/229/230 for task lifecycle, API-233/234/235/236 for upload lifecycle, API-104 for the permitted geometry package, and API-232/231 for PM-owned supplement/reassignment context. Every route must be checked against current assignment, device, project, route/version and file-purpose guards. IDs and routes link to the [Phase 2C catalog](../../04_API-Contracts/02_Full-API-Catalog.md) and [consumer crosswalk](../../04_API-Contracts/09_Consumer-API-Crosswalk.md); no endpoint is inferred from a UI label.

Operator does not receive Crew device enrollment, signed canonical batch sync, snapshot handover, repair execution or PM/Supervisor approval rights. Upload complete is not `VERIFIED`; SRT/GPS absence is not coverage success.

## Status and gaps

Backend route/DTO/role behavior is `CURRENT_IMPLEMENTED_BE` by source inspection. Screen design and Expo/native capture are `PROPOSED_EXPO` / `NOT_VERIFIED_EXPO_E2E`. DJI SDK integration, background upload guarantees, real device storage protection, deployment and external E2E remain open. Operator offline signed sync is not asserted.
