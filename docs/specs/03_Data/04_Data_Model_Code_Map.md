# V2 data model to code map

**Audit date:** 2026-09-28. **Purpose:** current-source evidence versus documented target. This is not a migration plan or deployment report.

## Verified current map

| V2 concept | Current entity/DbSet | EF configuration | Migration evidence | Status |
|---|---|---|---|---|
| User/session/token | `ApplicationUser`, `UserSession`, `RefreshToken`, `ProjectMember` | matching `Configurations/*Configuration.cs` | identity/session/project migrations through 20260920 | `CURRENT_VERIFIED` |
| Audit/idempotency/outbox/receipt | `AuditLog`, `IdempotencyRecord`, `OutboxMessage`, `ConsumerEffectReceipt` | matching configurations | 20260918065914 and subsequent | `CURRENT_VERIFIED` |
| Files | `StoredFile` | `StoredFileConfiguration` | 20260919085118 | `CURRENT_VERIFIED` |
| Defect/catalog | `Defect`, `DefectVerificationLog`, `DefectType`, `CauseCategory`, `SeverityRuleVersion` | matching configurations | 20260920101324/104522 | `CURRENT_VERIFIED` |
| Project/route/warranty | `Project`, `ProjectMember`, `RoadSection`, `RoadSectionVersion`, `Warranty`, `HandoverDocument` | matching configurations | 20260920154542 | `CURRENT_VERIFIED` |
| Survey/QC | `SurveyPlan`, `SurveyRequest`, `Survey`, `SurveyAssignment`, `Flight`, `SurveyFile`, `SurveyDataVersion`, `QualityCheck`, `SupplementarySurveyRequest` | matching configurations | 20260920172407 through 20260921125553 | `CURRENT_VERIFIED` |
| Inspection/measurement | `FieldInspectionTask`, `FieldInspectionAssignment`, `FieldInspectionSession`, `GroundTruthMeasurement` | matching configurations | inspection/measurement migrations present in migration inventory | `CURRENT_VERIFIED` |
| AI processing | `ProcessingBlock`, `ProcessingJob`, `ProcessingAttempt`, `AIModelVersion`, `AIDetection` | matching configurations | processing migrations present in migration inventory | `CURRENT_VERIFIED` (partial target) |

## Target gaps requiring an approved implementation task

| Target concept | Current evidence | Required next action | Status |
|---|---|---|---|
| CompanyPolicyFrameworkVersion / MaterialMethodProfileVersion / ProjectPolicyConfiguration | No matching DbSet/config found in current inventory | Define contract, map ownership/version/UQ/nullability, then persistence task | `PROPOSED_DELTA` |
| TaskPolicySnapshot / local evaluation | Task exists; no target snapshot/evaluator entity found | Contract and offline fixture first; do not infer from task mode | `PROPOSED_DELTA` |
| Report/Case/ReportDefectLink/public projection | No matching DbSet found in current inventory | Confirm reuse/extension of existing report/defect services before schema | `PROPOSED_DELTA` |
| RepairItem/RepairAttempt/RepairEvidence | No matching DbSet found in current inventory | Map state/attempt/evidence and SQL constraints | `PROPOSED_DELTA` |
| BeforeEvidenceIncident/CuringRecord/TrafficReleaseRecord | No matching DbSet found | Separate records and authority/receipt contract | `PROPOSED_DELTA` |
| ProcessingInputManifest/artifact/event receipt/candidate snapshot | Current processing job/attempt/detection only | Add immutable manifest/attempt fencing/receipt design before runtime | `PROPOSED_DELTA` |
| SyncOperation/phase evaluation/handover/rescue receipt | Current idempotency/consumer receipt is not full sync contract | Define per-operation result, local/server mapping, D05/D06/42A security | `PROPOSED_DELTA` |
| LegalHold/DeletionRequest | StoredFile retention exists, full hold workflow not verified | Retention basis and hold/reference execution contract | `PROPOSED_DELTA` |

## Evidence limits

The current map proves source entities/configuration/migration files were read. It does not prove every migration is applied to a live SQL Server, every relationship has the intended production index, or target concepts are absent from unsearched external systems. No migration or database command was run.
