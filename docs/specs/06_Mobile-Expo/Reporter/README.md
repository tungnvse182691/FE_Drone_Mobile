# Reporter Mobile — React Native + Expo

**Phase 3B · baseline `d5c935bfe00b82ffb9474f222cdc79d329387f39` · documentation handoff only.**

Reporter is a Mobile React Native + Expo actor. Supervisor and PM remain Web; Operator and Repair Crew remain Mobile. This package describes a proposed Expo consumer of the current Backend contracts. No Mobile repository, Expo SDK lock, native build, device test, SMTP, object storage or E2E result was supplied, so those items are `NOT_VERIFIED_EXPO_E2E`.

## Reading order

1. [Screen/API matrix](01_Reporter-Screen-API-Matrix.md)
2. [Authentication, OTP and session](02_Authentication-OTP-and-Session.md)
3. [Private photo upload](03_Private-Photo-Upload.md)
4. [Report and IncidentCase lifecycle](04_Report-and-IncidentCase-Lifecycle.md)
5. [Expo architecture and local security](05_Expo-Architecture-and-Local-Data-Security.md)
6. [Errors, retry and reconciliation](06_Error-Retry-and-Reconciliation.md)
7. [Acceptance scenarios](07_Reporter-Acceptance-Scenarios.md)
8. [Review report](PHASE3B_REVIEW_REPORT.md)

## Authority and boundaries

- `CURRENT_VERIFIED`: Backend controllers/services/DTOs and the Phase 2C catalog at the pinned source SHA.
- `TARGET_CONFIRMED`: Reporter is Mobile React Native + Expo; the product is HoangHaiWarrantySystem and technical routes retain RoadGuardSystem names.
- `PROPOSED_EXPO_UI`: screens, navigation and client adapters in this package.
- `SOURCE_GAP` / `NOT_VERIFIED_EXPO_E2E`: missing native app, provider and deployed verification.

The online Reporter MVP uses Android bearer login/refresh and does not use the Crew signed offline workflow, device enrollment or ECDSA batch submission. A Reporter creates a report from private `REPORT_PHOTO` evidence without a Drone Survey. The backend creates an unassigned IncidentCase; Supervisor triages it before PM processing. Reporter can read only own projections and explicitly published updates.

The single API catalog is authoritative for exact DTO fields, headers and status codes: [Phase 2C API entrance](../../04_API-Contracts/README.md), [full catalog](../../04_API-Contracts/02_Full-API-Catalog.md). This handoff does not add routes or grant roles.
