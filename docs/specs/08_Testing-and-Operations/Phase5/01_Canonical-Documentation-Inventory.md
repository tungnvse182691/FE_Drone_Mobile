# Canonical documentation inventory

**Source baseline:** `d1e529a5d1b6a95fa18d9448f7d75468463390df` · `huy-review` · 15/10/2026. Documentation/static audit only; independent JEV **PENDING**.

Baseline inventory: **81 canonical Markdown files**, plus **6 Phase 0 audit reports** = **87 input documents**. Two pre-existing canonical Python tools are code inputs, not Markdown. This Phase 5 adds nine reports and one validator; existing documents stay in place. All baseline canonical Markdown participates in link/API-ID scanning; the six Phase 0 reports supply historical inventory/findings; source and semantic cross-check extent is stated in the review report, not inferred from file counts.

The inventory hashes below are the first 12 hex characters of SHA-256 of each **baseline Git blob**, before Phase 5 corrections. Pinned historical phase reports remain historical execution evidence. Product/source precedence comes from governance; older Project Docs, product and Backend Official remain referenced through the source registry and Phase 0 inventory, without bulk rewriting or implied adoption.

| Canonical group | Baseline Markdown count |
|---|---:|
| `00_Governance` | 5 |
| `01_Product-and-Roles` | 1 |
| `02_Business-Workflows` | 12 |
| `03_Backend-and-Data` | 8 |
| `04_API-Contracts` | 11 |
| `05_Web` | 11 |
| `06_Mobile-Expo` | 23 |
| `07_AI-FastAPI` | 9 |
| `README.md` | 1 |

## File ledger

| Input document | Baseline SHA-256 prefix | Disposition |
|---|---|---|
| [00_Governance\01_Authority-and-Source-of-Truth.md](../../00_Governance/01_Authority-and-Source-of-Truth.md) | `5c264ee4f585` | Canonical reference; source/static validation scope only |
| [00_Governance\02_Product-Decisions-and-Scope.md](../../00_Governance/02_Product-Decisions-and-Scope.md) | `fbcafe96b3f4` | Canonical reference; source/static validation scope only |
| [00_Governance\03_Implementation-and-Verification-Status.md](../../00_Governance/03_Implementation-and-Verification-Status.md) | `bab56026f16d` | Canonical reference; source/static validation scope only |
| [00_Governance\04_Document-Control-and-Change-History.md](../../00_Governance/04_Document-Control-and-Change-History.md) | `0a521756eda1` | Canonical reference; source/static validation scope only |
| [00_Governance\05_Source-Registry-and-Migration-Crosswalk.md](../../00_Governance/05_Source-Registry-and-Migration-Crosswalk.md) | `c10ccd12a6a9` | Canonical reference; source/static validation scope only |
| [01_Product-and-Roles\02_Actor-Client-Permission-Matrix.md](../../01_Product-and-Roles/02_Actor-Client-Permission-Matrix.md) | `1c0d503aa2fa` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\01_Authentication-Users-and-Memberships.md](../../02_Business-Workflows/01_Authentication-Users-and-Memberships.md) | `c34976ad45a8` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\02_Project-Road-Geometry-and-Pavement.md](../../02_Business-Workflows/02_Project-Road-Geometry-and-Pavement.md) | `24f57184267c` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\03_Reporter-Evidence-and-IncidentCase.md](../../02_Business-Workflows/03_Reporter-Evidence-and-IncidentCase.md) | `d36161893293` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\04_Candidate-Decisions-and-Defect.md](../../02_Business-Workflows/04_Candidate-Decisions-and-Defect.md) | `2dc4468e136d` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\05_Drone-Survey-Dataset-and-Processing.md](../../02_Business-Workflows/05_Drone-Survey-Dataset-and-Processing.md) | `3530553dff53` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\06_FIELD-Inspection-and-Measurements.md](../../02_Business-Workflows/06_FIELD-Inspection-and-Measurements.md) | `6cd1c47bfe3c` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\07_NORMAL-Repair-and-Acceptance.md](../../02_Business-Workflows/07_NORMAL-Repair-and-Acceptance.md) | `441072ae38e3` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\08_FastTrack-Policy-and-Confirmation.md](../../02_Business-Workflows/08_FastTrack-Policy-and-Confirmation.md) | `1d43f145e292` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\09_Offline-Snapshots-Sync-and-Handover.md](../../02_Business-Workflows/09_Offline-Snapshots-Sync-and-Handover.md) | `770f17b41fe2` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\10_Notifications-Publication-Reporting-and-Retention.md](../../02_Business-Workflows/10_Notifications-Publication-Reporting-and-Retention.md) | `d2bdb1c5a419` | Canonical reference; source/static validation scope only |
| [02_Business-Workflows\PHASE2A_REVIEW_REPORT.md](../../02_Business-Workflows/PHASE2A_REVIEW_REPORT.md) | `c2ed7d4d6c65` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [02_Business-Workflows\README.md](../../02_Business-Workflows/README.md) | `333cb0a2b378` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\01_ASPNET-Architecture.md](../../03_Backend-and-Data/01_ASPNET-Architecture.md) | `21576c10c221` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\02_Domain-and-Data-Model.md](../../03_Backend-and-Data/02_Domain-and-Data-Model.md) | `b8c96a71bbd4` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\03_Authentication-Authorization-and-Security.md](../../03_Backend-and-Data/03_Authentication-Authorization-and-Security.md) | `19e885f7c0ea` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\04_File-Storage-and-Upload.md](../../03_Backend-and-Data/04_File-Storage-and-Upload.md) | `1d96fcf4134c` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\05_Background-Jobs-and-Integration-Boundaries.md](../../03_Backend-and-Data/05_Background-Jobs-and-Integration-Boundaries.md) | `8202ba0c5865` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\06_Offline-Backend-Architecture.md](../../03_Backend-and-Data/06_Offline-Backend-Architecture.md) | `d53f02b93ed7` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\07_Backend-Configuration-and-Deployment-Boundaries.md](../../03_Backend-and-Data/07_Backend-Configuration-and-Deployment-Boundaries.md) | `6adc548f000a` | Canonical reference; source/static validation scope only |
| [03_Backend-and-Data\PHASE2B_REVIEW_REPORT.md](../../03_Backend-and-Data/PHASE2B_REVIEW_REPORT.md) | `b04344d50207` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [04_API-Contracts\01_API-Conventions.md](../../04_API-Contracts/01_API-Conventions.md) | `6e92547b312d` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\02_Full-API-Catalog.md](../../04_API-Contracts/02_Full-API-Catalog.md) | `fa7c0f4a58c2` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\03_DTO-and-Schema-Reference.md](../../04_API-Contracts/03_DTO-and-Schema-Reference.md) | `c98827eb2dd5` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\04_Authentication-and-Authorization-Contracts.md](../../04_API-Contracts/04_Authentication-and-Authorization-Contracts.md) | `ff2828b7782d` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\05_Idempotency-Concurrency-and-Errors.md](../../04_API-Contracts/05_Idempotency-Concurrency-and-Errors.md) | `8a95a9b3cfda` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\06_File-Upload-and-Evidence-Contracts.md](../../04_API-Contracts/06_File-Upload-and-Evidence-Contracts.md) | `a8a1eb4a5a19` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\07_Offline-Sync-and-Crypto-Wire.md](../../04_API-Contracts/07_Offline-Sync-and-Crypto-Wire.md) | `9682e25776b4` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\08_Processing-and-AI-Contracts.md](../../04_API-Contracts/08_Processing-and-AI-Contracts.md) | `9987af2a47fd` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\09_Consumer-API-Crosswalk.md](../../04_API-Contracts/09_Consumer-API-Crosswalk.md) | `36c06af2a00e` | Canonical reference; source/static validation scope only |
| [04_API-Contracts\PHASE2C_REVIEW_REPORT.md](../../04_API-Contracts/PHASE2C_REVIEW_REPORT.md) | `db0e16de3631` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [04_API-Contracts\README.md](../../04_API-Contracts/README.md) | `d1a966412406` | Canonical reference; source/static validation scope only |
| [05_Web\01_Web-Architecture-and-Auth.md](../../05_Web/01_Web-Architecture-and-Auth.md) | `9f95f6cff6e9` | Canonical reference; source/static validation scope only |
| [05_Web\02_Supervisor-Screen-API-Matrix.md](../../05_Web/02_Supervisor-Screen-API-Matrix.md) | `cbb7bdac0170` | Canonical reference; source/static validation scope only |
| [05_Web\03_PM-Screen-API-Matrix.md](../../05_Web/03_PM-Screen-API-Matrix.md) | `71d93fca6355` | Canonical reference; source/static validation scope only |
| [05_Web\04_Web-Business-Flows.md](../../05_Web/04_Web-Business-Flows.md) | `29a5b766c7d6` | Canonical reference; source/static validation scope only |
| [05_Web\05_GIS-MapLibre-Integration.md](../../05_Web/05_GIS-MapLibre-Integration.md) | `bf83879d4494` | Canonical reference; source/static validation scope only |
| [05_Web\06_Web-Errors-and-State-Handling.md](../../05_Web/06_Web-Errors-and-State-Handling.md) | `6d1d683c520b` | Canonical reference; source/static validation scope only |
| [05_Web\07_Web-Integration-Acceptance-Checklist.md](../../05_Web/07_Web-Integration-Acceptance-Checklist.md) | `b8e2e6ea197b` | Canonical reference; source/static validation scope only |
| [05_Web\PHASE3A_C01_REVIEW_REPORT.md](../../05_Web/PHASE3A_C01_REVIEW_REPORT.md) | `a9b7fc9c0bff` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [05_Web\PHASE3A_C02_REVIEW_REPORT.md](../../05_Web/PHASE3A_C02_REVIEW_REPORT.md) | `6bac04b36008` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [05_Web\PHASE3A_REVIEW_REPORT.md](../../05_Web/PHASE3A_REVIEW_REPORT.md) | `6ccdcb7900ce` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [05_Web\README.md](../../05_Web/README.md) | `2175bcbacf57` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\07_Mobile-Integration-Acceptance.md](../../06_Mobile-Expo/07_Mobile-Integration-Acceptance.md) | `012b49506d47` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Crew\01_Crew-Screen-API-Matrix.md](../../06_Mobile-Expo/Crew/01_Crew-Screen-API-Matrix.md) | `30f6d711883f` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Crew\02_FIELD-Measurement-Workflow.md](../../06_Mobile-Expo/Crew/02_FIELD-Measurement-Workflow.md) | `9041abc7735c` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Crew\03_NORMAL-and-FastTrack-Execution.md](../../06_Mobile-Expo/Crew/03_NORMAL-and-FastTrack-Execution.md) | `6addcbf7f38a` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Crew\04_Offline-Signed-Sync-and-Handover.md](../../06_Mobile-Expo/Crew/04_Offline-Signed-Sync-and-Handover.md) | `2bb97cec3806` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Crew\05_Local-Security-and-Reconciliation.md](../../06_Mobile-Expo/Crew/05_Local-Security-and-Reconciliation.md) | `8ccd74ca2470` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Crew\README.md](../../06_Mobile-Expo/Crew/README.md) | `66766f45b06c` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Operator\01_Operator-Screen-API-Matrix.md](../../06_Mobile-Expo/Operator/01_Operator-Screen-API-Matrix.md) | `7ea7c0d96165` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Operator\02_Survey-Video-SRT-and-Upload.md](../../06_Mobile-Expo/Operator/02_Survey-Video-SRT-and-Upload.md) | `ca93be861785` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Operator\03_Task-Dataset-and-Error-Handling.md](../../06_Mobile-Expo/Operator/03_Task-Dataset-and-Error-Handling.md) | `cda274be48f8` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Operator\README.md](../../06_Mobile-Expo/Operator/README.md) | `875a81050d95` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\PHASE3C_C01_REVIEW_REPORT.md](../../06_Mobile-Expo/PHASE3C_C01_REVIEW_REPORT.md) | `213be1feebac` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [06_Mobile-Expo\PHASE3C_REVIEW_REPORT.md](../../06_Mobile-Expo/PHASE3C_REVIEW_REPORT.md) | `1210d1673294` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [06_Mobile-Expo\README.md](../../06_Mobile-Expo/README.md) | `4cf875ec7a21` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\01_Reporter-Screen-API-Matrix.md](../../06_Mobile-Expo/Reporter/01_Reporter-Screen-API-Matrix.md) | `472b9e09decf` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\02_Authentication-OTP-and-Session.md](../../06_Mobile-Expo/Reporter/02_Authentication-OTP-and-Session.md) | `ac38ee15ef85` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\03_Private-Photo-Upload.md](../../06_Mobile-Expo/Reporter/03_Private-Photo-Upload.md) | `b452f876347b` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\04_Report-and-IncidentCase-Lifecycle.md](../../06_Mobile-Expo/Reporter/04_Report-and-IncidentCase-Lifecycle.md) | `8ca240d492ec` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\05_Expo-Architecture-and-Local-Data-Security.md](../../06_Mobile-Expo/Reporter/05_Expo-Architecture-and-Local-Data-Security.md) | `251684302557` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\06_Error-Retry-and-Reconciliation.md](../../06_Mobile-Expo/Reporter/06_Error-Retry-and-Reconciliation.md) | `56cee7b8ce82` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\07_Reporter-Acceptance-Scenarios.md](../../06_Mobile-Expo/Reporter/07_Reporter-Acceptance-Scenarios.md) | `ed2612302006` | Canonical reference; source/static validation scope only |
| [06_Mobile-Expo\Reporter\PHASE3B_REVIEW_REPORT.md](../../06_Mobile-Expo/Reporter/PHASE3B_REVIEW_REPORT.md) | `a148d109df61` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [06_Mobile-Expo\Reporter\README.md](../../06_Mobile-Expo/Reporter/README.md) | `2abea8b19213` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\01_AI-System-Boundaries.md](../../07_AI-FastAPI/01_AI-System-Boundaries.md) | `48f490a38484` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\02_Video-SRT-and-Frame-Pipeline.md](../../07_AI-FastAPI/02_Video-SRT-and-Frame-Pipeline.md) | `cd2d23883eb1` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\03_BE-to-AI-Integration-Contract.md](../../07_AI-FastAPI/03_BE-to-AI-Integration-Contract.md) | `0b2de2bc83d8` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\04_AI-to-BE-Callback-and-Results.md](../../07_AI-FastAPI/04_AI-to-BE-Callback-and-Results.md) | `2ed7a6d177d2` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\05_Model-Version-and-Detection-Schemas.md](../../07_AI-FastAPI/05_Model-Version-and-Detection-Schemas.md) | `dc204ac12d14` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\06_Security-Idempotency-and-Retry.md](../../07_AI-FastAPI/06_Security-Idempotency-and-Retry.md) | `8a785ae57318` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\07_AI-Acceptance-and-Evaluation.md](../../07_AI-FastAPI/07_AI-Acceptance-and-Evaluation.md) | `6fb0460f1f7c` | Canonical reference; source/static validation scope only |
| [07_AI-FastAPI\PHASE4_REVIEW_REPORT.md](../../07_AI-FastAPI/PHASE4_REVIEW_REPORT.md) | `e4c17ba33425` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [07_AI-FastAPI\README.md](../../07_AI-FastAPI/README.md) | `81d9e12e15f2` | Canonical reference; source/static validation scope only |
| [README.md](../../README.md) | `8b8d3e71ae6f` | Canonical reference; source/static validation scope only |
| [Phase0/00_EXECUTIVE_SUMMARY.md](../../../audit/HHWS-DOCS-REBUILD-01/00_EXECUTIVE_SUMMARY.md) | `f7f0601e8c19` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [Phase0/01_SOURCE_AND_DOCS_INVENTORY.md](../../../audit/HHWS-DOCS-REBUILD-01/01_SOURCE_AND_DOCS_INVENTORY.md) | `1966f53b45d9` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [Phase0/02_FULL_API_INVENTORY.md](../../../audit/HHWS-DOCS-REBUILD-01/02_FULL_API_INVENTORY.md) | `0adc7ed8982e` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [Phase0/03_BUSINESS_AND_PLATFORM_CONFLICTS.md](../../../audit/HHWS-DOCS-REBUILD-01/03_BUSINESS_AND_PLATFORM_CONFLICTS.md) | `61792f81f505` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [Phase0/04_DOCS_MIGRATION_MATRIX.md](../../../audit/HHWS-DOCS-REBUILD-01/04_DOCS_MIGRATION_MATRIX.md) | `d65f890dde8e` | HISTORICAL phase checkpoint; current errata in Phase 5 |
| [Phase0/05_OPEN_DECISIONS_AND_GAPS.md](../../../audit/HHWS-DOCS-REBUILD-01/05_OPEN_DECISIONS_AND_GAPS.md) | `0c25f4a58f43` | HISTORICAL phase checkpoint; current errata in Phase 5 |

Untracked earlier audit/handoff documents are preserved and excluded from delivery. Source registry links identify old authority and migration material; this task does not delete Backend Official, Project Docs, planning or active locks.
